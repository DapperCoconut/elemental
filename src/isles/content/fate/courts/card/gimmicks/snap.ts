import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { card } from '../art';
import { CHIP_BLUE, SPARK } from '../palette';
import { alive, clamp, dist, segDist, stepDt, type Suit } from '../util';

/**
 * Snap — Gamesman Pip.
 *
 * Eight cards lie face down in two rows across the floor. One by one they flip face up. When two
 * face-up cards show the same rank (count the pips — and each rank has its own coloured rim), a
 * bolt cracks between them: a thin flicker first, then the strike, along the line joining them.
 * After the bolt the pair is *matched*, humming with charge, and the first fighter to step onto
 * either matched card claims the snap — the charge leaps from the card into the other fighter.
 *
 * Pip plays snap for a living. He runs for every match. Stand across his path, or claim it first.
 */

const COLS = 4;
const ROWS = 2;
const RANKS = 4;
const FACE_MS = 7000;
const BOLT_WARN = 750;
const MATCH_MS = 4200;
const TOUCH_R = 34;
const CW = 30, CH = 42;
/** A rim colour per rank, so a match reads at a glance. */
const RIM = [0, 0xf2c040, 0x40d8f0, 0xf060c8, 0x8ae050];

interface Tile {
  x: number; y: number;
  rank: number;           // 0 = face down
  suit: Suit;
  upAt: number;
  flipAt: number;         // for the flip animation, up or down
  matched: boolean;
}

interface Bolt { a: Tile; b: Tile; at: number; fireAt: number; fired: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const tiles: Tile[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      tiles.push({
        x: W * (0.18 + c * 0.213), y: top + (H - top) * (r === 0 ? 0.3 : 0.74),
        rank: 0, suit: (['heart', 'spade', 'diamond', 'club'] as Suit[])[(r * 2 + c) % 4], upAt: 0, flipAt: -9999, matched: false,
      });
    }
  }
  const FLIP_EVERY = ctx.hard ? 1250 : 1550;
  const bolts: Bolt[] = [];
  const snaps: { from: { x: number; y: number }; to: Fighter; at: number }[] = [];
  let nextFlip = 0;
  let started = false;
  let matchUntil = 0;

  const faceUp = () => tiles.filter((t) => t.rank > 0 && !t.matched);
  const matched = () => tiles.filter((t) => t.matched);

  function flipDown(t: Tile, time: number): void {
    t.rank = 0; t.matched = false; t.flipAt = time;
  }

  function flipUp(time: number): void {
    const down = tiles.filter((t) => t.rank === 0);
    if (!down.length) return;
    const t = down[Math.floor(rng() * down.length)];
    const up = faceUp();
    // Pairs come often enough to play for: half the time the new card copies a rank already showing.
    const rank = up.length && rng() < 0.45 ? up[Math.floor(rng() * up.length)].rank : 1 + Math.floor(rng() * RANKS);
    t.rank = rank; t.upAt = time; t.flipAt = time;
    t.suit = (['heart', 'spade', 'diamond', 'club'] as Suit[])[Math.floor(rng() * 4)];
    ctx.sfx('dice');
    const twin = up.find((o) => o.rank === rank && !bolts.some((b) => b.a === o || b.b === o));
    if (twin) {
      bolts.push({ a: twin, b: t, at: time, fireAt: time + BOLT_WARN, fired: false });
      ctx.sfx('electric-charge');
    }
  }

  function claim(t: Tile, f: Fighter, time: number): void {
    const other = f === player ? npc : player;
    for (const m of matched()) flipDown(m, time);
    matchUntil = 0;
    ctx.float(t.x, t.y - 40, 'SNAP!', '#bfe8ff');
    ctx.sfx('thunder');
    if (alive(other)) {
      ctx.hit(other, ctx.hard ? 16 : 14, other.x, other.y);
      ctx.stun(other, 420);
      snaps.push({ from: { x: t.x, y: t.y }, to: other, at: time });
    }
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextFlip = time + 900; ctx.banner('MATCH TWO RANKS — A BOLT CRACKS — STEP ON THE PAIR TO SNAP', '#bfe8ff'); }
      if (time >= nextFlip) { nextFlip = time + FLIP_EVERY; flipUp(time); }
      // Stale cards turn back down.
      for (const t of tiles) if (t.rank > 0 && !t.matched && time - t.upAt > FACE_MS && !bolts.some((b) => b.a === t || b.b === t)) flipDown(t, time);
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        if (!b.fired && time >= b.fireAt) {
          b.fired = true;
          ctx.sfx('zap');
          for (const f of [player, npc]) {
            if (alive(f) && segDist(f.x, f.y, b.a.x, b.a.y, b.b.x, b.b.y) < 26) ctx.hit(f, ctx.hard ? 13 : 11, f.x, f.y);
          }
          // Any old pair loses its charge; this one takes it.
          for (const m of matched()) if (m !== b.a && m !== b.b) flipDown(m, time);
          b.a.matched = true; b.b.matched = true;
          matchUntil = time + MATCH_MS;
        }
        if (b.fired && time - b.fireAt > 260) bolts.splice(i, 1);
      }
      const m = matched();
      if (m.length) {
        if (time > matchUntil) { for (const t of m) flipDown(t, time); }
        else {
          for (const t of m) {
            const f = [player, npc].find((ff) => alive(ff) && dist(ff.x, ff.y, t.x, t.y) < TOUCH_R);
            if (f) { claim(t, f, time); break; }
          }
        }
      }
      for (let i = snaps.length - 1; i >= 0; i--) if (time - snaps[i].at > 380) snaps.splice(i, 1);
    },

    npcSeek() {
      // A live pair: run for the nearer matched card.
      const m = matched();
      if (m.length) {
        let best = m[0];
        for (const t of m) if (dist(npc.x, npc.y, t.x, t.y) < dist(npc.x, npc.y, best.x, best.y)) best = t;
        return { x: best.x, y: best.y };
      }
      // A bolt about to fire: get off its line.
      for (const b of bolts) {
        if (b.fired) continue;
        if (segDist(npc.x, npc.y, b.a.x, b.a.y, b.b.x, b.b.y) < 60) {
          const mx = (b.a.x + b.b.x) / 2, my = (b.a.y + b.b.y) / 2;
          const dx = b.b.x - b.a.x, dy = b.b.y - b.a.y, l = Math.hypot(dx, dy) || 1;
          const side = (npc.x - mx) * (-dy / l) + (npc.y - my) * (dx / l) >= 0 ? 1 : -1;
          return { x: clamp(npc.x - (dy / l) * 110 * side, 50, W - 50), y: clamp(npc.y + (dx / l) * 110 * side, top + 50, H - 40) };
        }
      }
      // Waiting on a pair: stand between the face-up cards, ready to run.
      const up = faceUp();
      if (up.length >= 2) {
        const cx = up.reduce((s, t) => s + t.x, 0) / up.length, cy = up.reduce((s, t) => s + t.y, 0) / up.length;
        return { x: cx, y: cy };
      }
      return null;
    },

    drawGround(g, time) {
      for (const t of tiles) {
        // The felt mat each card lies on.
        g.fillStyle(0x000000, 0.2); g.fillRoundedRect(t.x - CW / 2 - 6, t.y - CH / 2 - 4, CW + 12, CH + 12, 6);
        g.lineStyle(1, 0x5a8aa0, 0.35); g.strokeRoundedRect(t.x - CW / 2 - 6, t.y - CH / 2 - 6, CW + 12, CH + 12, 6);
        const fk = clamp((time - t.flipAt) / 220, 0, 1);
        const sw = Math.abs(Math.cos((1 - fk) * Math.PI));
        if (t.rank > 0) {
          if (t.matched) glow(g, t.x, t.y, 34, RIM[t.rank], 0.1 + Math.sin(time / 70) * 0.04, 3);
          g.fillStyle(RIM[t.rank], 1); g.fillRoundedRect(t.x - (CW / 2 + 3) * sw, t.y - CH / 2 - 3, (CW + 6) * sw, CH + 6, 4);
          card(g, t.x, t.y, CW * Math.max(0.1, sw), CH, 0, { face: fk > 0.5, suit: t.suit, rank: t.rank, back: CHIP_BLUE });
          // The time it has left face up: a thin rim bar.
          if (!t.matched) { const k = clamp(1 - (time - t.upAt) / FACE_MS, 0, 1); g.fillStyle(RIM[t.rank], 0.8); g.fillRect(t.x - CW / 2, t.y + CH / 2 + 6, CW * k, 2); }
        } else {
          card(g, t.x, t.y, CW * Math.max(0.1, sw), CH, 0, { face: fk < 0.5, suit: t.suit, rank: 1, back: CHIP_BLUE });
        }
      }
      // A charged pair: a faint live wire on the floor between them.
      const m = matched();
      if (m.length === 2) {
        g.lineStyle(2, SPARK, 0.25 + Math.sin(time / 50) * 0.15); g.lineBetween(m[0].x, m[0].y, m[1].x, m[1].y);
        const k = clamp((matchUntil - time) / MATCH_MS, 0, 1);
        for (const t of m) { g.lineStyle(3, SPARK, 0.8); g.beginPath(); g.arc(t.x, t.y, 30, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath(); }
      }
    },

    drawAir(g, time) {
      const jag = (x1: number, y1: number, x2: number, y2: number, amp: number, w: number, a: number, seed: number) => {
        const n = 9;
        let px = x1, py = y1;
        const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1;
        for (let i = 1; i <= n; i++) {
          const t = i / n;
          const off = i === n ? 0 : Math.sin(seed + i * 2.7 + time / 30) * amp;
          const x = x1 + dx * t - (dy / l) * off, y = y1 + dy * t + (dx / l) * off;
          g.lineStyle(w, SPARK, a); g.lineBetween(px, py, x, y);
          g.lineStyle(w * 0.4, 0xffffff, a); g.lineBetween(px, py, x, y);
          px = x; py = y;
        }
      };
      for (const b of bolts) {
        if (!b.fired) {
          // The warning: a flickering thread, thickening as the strike nears.
          const k = clamp((time - b.at) / BOLT_WARN, 0, 1);
          if (Math.floor(time / 60) % 2 === 0) jag(b.a.x, b.a.y, b.b.x, b.b.y, 6, 1 + k * 1.5, 0.25 + k * 0.5, b.at);
          for (const t of [b.a, b.b]) { g.lineStyle(1.5, SPARK, 0.4 + k * 0.5); g.strokeCircle(t.x, t.y, 34 - k * 12); }
        } else {
          const k = clamp((time - b.fireAt) / 260, 0, 1);
          jag(b.a.x, b.a.y, b.b.x, b.b.y, 16, 6 * (1 - k) + 1, 1 - k, b.fireAt);
          jag(b.a.x, b.a.y, b.b.x, b.b.y, 10, 3 * (1 - k) + 1, 0.7 * (1 - k), b.fireAt + 3);
        }
      }
      for (const s of snaps) {
        if (!alive(s.to)) continue;
        const k = (time - s.at) / 380;
        jag(s.from.x, s.from.y, s.to.x, s.to.y, 14, 5 * (1 - k) + 1, 1 - k, s.at);
        g.lineStyle(3, SPARK, 1 - k); g.strokeCircle(s.to.x, s.to.y, 20 + k * 30);
      }
      // Sparks off the charged pair.
      for (const t of matched()) {
        for (let i = 0; i < 3; i++) {
          const a = time / 90 + i * 2.1 + t.x;
          g.lineStyle(1.5, SPARK, 0.8);
          g.lineBetween(t.x + Math.cos(a) * 18, t.y + Math.sin(a) * 24, t.x + Math.cos(a) * 28, t.y + Math.sin(a) * 34);
        }
      }
    },
  };
}

export const SNAP: GimmickDef = {
  id: 'card-snap',
  rules: 'Cards flip face up one by one. Two of a rank crack a bolt between them, then hum: the first to step on the matched pair claims the snap — a bolt into the other.',
  make,
};
