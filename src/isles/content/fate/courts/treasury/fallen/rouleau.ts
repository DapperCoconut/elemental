import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { coin, coinFlat } from '../art';
import { GOLD, GOLD_DARK, GOLD_LIT, GOLD_PALE, INK_GREEN, PAPER, SILVER } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Stood on Edge — Teller Columbine Sixpenny, in the King's telling the counting-house teller who
 * could stand a shilling on its rim on a moving cart, and stood the Wager-Tithe in rows for the
 * crown's clerks to count at a glance.
 *
 * She lays rouleaux across the yard: long rows of great coins stood on edge, close as dominoes,
 * laid near you. A standing row is a low fence: you cannot walk through it (a dash hops it). Knock
 * a row and it topples — a wave runs down it faster than you can walk, and every coin that falls
 * slaps whoever is beside it. Strike either end and the wave runs from that end; a shot that meets
 * a row knocks the coin it touches and the wave runs both ways from there. Rows she leaves standing
 * she flicks over herself, from her end. Halfway down she rings you: a closed loop of coin round
 * where you stand, that she tips from the side nearest her — and its coins fall inward.
 * Read the wave, step off the row, and topple the rows he loiters along.
 */

const ID = fallenId('treasury', 'rouleau');
const GAP = 15;
const LAY_SPEED = 620;
const WAVE_SPEED = 300;
const SLAP_R = 32;
const SLAP_DMG = 11;
const STAND_MS = 7000;
const FENCE = 18;
const MAX_ROWS = 5;

/** One coin of a row: where it stands, when it fell (or -1), which way it fell. */
interface Coin { x: number; y: number; fallAt: number; dir: number }
/** A row of coins on edge — open (with two struck ends) or a closed ring. */
interface Row {
  coins: Coin[]; ring: boolean; laidAt: number; toppled: boolean; slapped: Set<Fighter>;
  ends: StrikeTarget[]; cx: number; cy: number; reach: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const rows: Row[] = [];
  let nextLay = 0;
  let ringed = false;
  let nextRing = 0;
  let started = false;

  const laidCount = (r: Row, t: number) => Math.min(r.coins.length, Math.floor(((t - r.laidAt) / 1000) * LAY_SPEED / GAP) + 1);

  function topple(r: Row, from: number, time: number): void {
    if (r.toppled) return;
    r.toppled = true;
    for (const e of r.ends) e.remove();
    r.ends = [];
    const n = r.coins.length;
    r.coins.forEach((c, i) => {
      const steps = r.ring ? Math.min(Math.abs(i - from), n - Math.abs(i - from)) : Math.abs(i - from);
      c.fallAt = time + ((steps * GAP) / WAVE_SPEED) * 1000;
    });
    ctx.sfx('chain');
  }

  function addRow(pts: Pt[], ring: boolean, time: number): void {
    const coins: Coin[] = [];
    for (let i = 0; i < pts.length - (ring ? 1 : 0); i++) {
      const a = pts[i], b = pts[i + 1] ?? a;
      const L = dist(a.x, a.y, b.x, b.y);
      const n = Math.max(1, Math.floor(L / GAP));
      for (let k = 0; k < n; k++) coins.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n, fallAt: -1, dir: 0 });
    }
    let cx = 0, cy = 0;
    for (const c of coins) { cx += c.x; cy += c.y; }
    cx /= coins.length; cy /= coins.length;
    const reach = Math.max(...coins.map((c) => dist(c.x, c.y, cx, cy))) + 20;
    // Which way each coin falls: across the row, alternate sides on a straight row, inward on a ring.
    coins.forEach((c, i) => {
      if (ring) { c.dir = Math.atan2(cy - c.y, cx - c.x); return; }
      const nb = coins[Math.min(coins.length - 1, i + 1)], pv = coins[Math.max(0, i - 1)];
      c.dir = Math.atan2(nb.y - pv.y, nb.x - pv.x) + (i % 2 ? Math.PI / 2 : -Math.PI / 2);
    });
    const row: Row = { coins, ring, laidAt: time, toppled: false, slapped: new Set(), ends: [], cx, cy, reach };
    if (!ring) {
      const last = coins.length - 1;
      row.ends = [0, last].map((idx) => ctx.target({ x: coins[idx].x, y: coins[idx].y - 10, r: 20, passThrough: true, onStruck: () => topple(row, idx, ctx.scene.time.now) }));
    }
    rows.push(row);
    ctx.sfx('money');
  }

  /** A row laid across the floor near you: through a point beside you, at a slant. */
  function layNear(time: number): void {
    const side = rng() * Math.PI * 2;
    const px = clamp(player.x + Math.cos(side) * 90, 70, W - 70), py = clamp(player.y + Math.sin(side) * 90, top + 60, H - 60);
    const a = side + Math.PI / 2 + (rng() - 0.5) * 0.5;
    const half = 150 + rng() * 50;
    const p0 = { x: clamp(px - Math.cos(a) * half, 50, W - 50), y: clamp(py - Math.sin(a) * half, top + 40, H - 40) };
    const p1 = { x: clamp(px + Math.cos(a) * half, 50, W - 50), y: clamp(py + Math.sin(a) * half, top + 40, H - 40) };
    // A kink in the middle, so no two rows lie alike.
    const mid = { x: (p0.x + p1.x) / 2 + Math.cos(a + Math.PI / 2) * (rng() - 0.5) * 60, y: (p0.y + p1.y) / 2 + Math.sin(a + Math.PI / 2) * (rng() - 0.5) * 60 };
    addRow([p0, mid, p1], false, time);
  }

  function layRing(time: number): void {
    const R = 92, n = 18;
    const cx = clamp(player.x, R + 40, W - R - 40), cy = clamp(player.y, top + R + 30, H - R - 30);
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; pts.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }); }
    addRow(pts, true, time);
    ctx.banner('SHE RINGS YOU IN', '#ffe27a');
  }

  const nearestIdx = (r: Row, x: number, y: number) => {
    let best = 0, bd = Infinity;
    r.coins.forEach((c, i) => { const d = dist(c.x, c.y, x, y); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  const standingNear = (x: number, y: number, pad: number, t: number) =>
    rows.some((r) => !r.toppled && r.coins.slice(0, laidCount(r, t)).some((c) => dist(c.x, c.y, x, y) < pad));

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextLay = time + 1500; ctx.banner('MIND THE ROULEAUX', '#ffe27a'); }
      if (!ringed && alive(npc) && npc.hp < npc.maxHp * 0.5) { ringed = true; nextRing = time + 600; }
      if (alive(player) && time >= nextLay && rows.filter((r) => !r.toppled).length < MAX_ROWS) {
        layNear(time);
        nextLay = time + (ringed ? 3600 : 4400);
      }
      if (ringed && time >= nextRing && alive(player)) { layRing(time); nextRing = time + 9000; }
      for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        if (!r.toppled) {
          const laid = laidCount(r, time);
          // A standing row is a fence: shoved back unless hopping it at a dash.
          for (const f of [player, npc]) {
            if (!alive(f) || ctx.dashing(f) || dist(f.x, f.y, r.cx, r.cy) > r.reach + FENCE) continue;
            for (let k = 0; k < laid; k++) {
              const c = r.coins[k];
              const d = dist(f.x, f.y, c.x, c.y);
              if (d < FENCE && d > 0.01) { ctx.nudge(f, ((f.x - c.x) / d) * 200 * dt, ((f.y - c.y) / d) * 200 * dt); break; }
            }
          }
          // A shot meeting the row knocks the coin it touches.
          for (const s of ctx.shotsNear(r.cx, r.cy, r.reach)) {
            const k = nearestIdx(r, s.x, s.y);
            if (k < laid && dist(s.x, s.y, r.coins[k].x, r.coins[k].y) < 16) { s.block(); topple(r, k, time); ctx.flash(s.x, s.y, GOLD_LIT); break; }
          }
          // Left standing, she flicks it over from the end nearest her (the ring: from her side).
          const due = r.ring ? r.laidAt + 2600 : r.laidAt + STAND_MS;
          if (!r.toppled && time >= due && laid >= r.coins.length) topple(r, r.ring ? nearestIdx(r, npc.x, npc.y) : (dist(npc.x, npc.y, r.coins[0].x, r.coins[0].y) < dist(npc.x, npc.y, r.coins[r.coins.length - 1].x, r.coins[r.coins.length - 1].y) ? 0 : r.coins.length - 1), time);
          continue;
        }
        // The wave: each coin slaps as it lands.
        let done = true;
        for (const c of r.coins) {
          if (time < c.fallAt) { done = false; continue; }
          if (time - c.fallAt > 60) continue;
          const lx = c.x + Math.cos(c.dir) * 14, ly = c.y + Math.sin(c.dir) * 14;
          for (const f of [player, npc]) {
            if (!alive(f) || r.slapped.has(f) || dist(f.x, f.y, lx, ly) > SLAP_R + (r.ring ? 16 : 0)) continue;
            r.slapped.add(f);
            ctx.hit(f, SLAP_DMG, lx, ly);
            ctx.nudge(f, Math.cos(c.dir) * 34, Math.sin(c.dir) * 34);
            ctx.sfx('hit-medium');
          }
        }
        const last = Math.max(...r.coins.map((c) => c.fallAt));
        if (done && time - last > 1400) rows.splice(i, 1);
      }
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      // You are along a standing row: go to its end and knock it at you.
      for (const r of rows) {
        if (r.toppled || r.ring || laidCount(r, now) < r.coins.length) continue;
        const along = r.coins.some((c) => dist(c.x, c.y, player.x, player.y) < SLAP_R + 14);
        if (!along) continue;
        const ends = [r.coins[0], r.coins[r.coins.length - 1]];
        const end = dist(ends[0].x, ends[0].y, npc.x, npc.y) < dist(ends[1].x, ends[1].y, npc.x, npc.y) ? ends[0] : ends[1];
        if (dist(end.x, end.y, player.x, player.y) > 120) return { x: end.x + (end.x < W / 2 ? -30 : 30), y: end.y };
      }
      // Otherwise stand off you, clear of every row and every falling coin.
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + now * 0.0003;
        const x = clamp(player.x + Math.cos(a) * 230, 60, W - 60), y = clamp(player.y + Math.sin(a) * 200, top + 50, H - 50);
        if (!standingNear(x, y, 50, now) && !rows.some((r) => r.toppled && r.coins.some((c) => c.fallAt > now && dist(c.x, c.y, x, y) < 60))) return { x, y };
      }
      return null;
    },

    drawGround(g, time) {
      for (const r of rows) {
        // A chalk line where the row is laid, so the whole row reads before it stands.
        if (!r.toppled && laidCount(r, time) < r.coins.length) {
          g.lineStyle(1.5, PAPER, 0.35);
          for (let k = 0; k + 1 < r.coins.length; k += 2) g.lineBetween(r.coins[k].x, r.coins[k].y, r.coins[k + 1].x, r.coins[k + 1].y);
        }
        for (const c of r.coins) {
          if (c.fallAt < 0 || time < c.fallAt) continue;
          const lx = c.x + Math.cos(c.dir) * 14, ly = c.y + Math.sin(c.dir) * 14;
          const since = time - c.fallAt;
          if (since < 260) { const k = since / 260; g.lineStyle(2 * (1 - k), GOLD_PALE, 1 - k); g.strokeCircle(lx, ly, 8 + k * 22); }
          const fade = clamp(1 - (since - 900) / 500, 0, 1);
          if (fade > 0) { coinFlat(g, lx, ly, 9); if (fade < 1) { g.fillStyle(0x000000, (1 - fade) * 0.2); g.fillCircle(lx, ly, 10); } }
        }
        // The wave's front, a bright flick along the floor.
        if (r.toppled) {
          for (const c of r.coins) {
            const dt = c.fallAt - time;
            if (dt > 0 && dt < 90) { g.fillStyle(GOLD_LIT, 0.5); g.fillCircle(c.x, c.y, 16); }
          }
        }
      }
    },

    drawAir(g, time) {
      for (const r of rows) {
        const laid = r.toppled ? r.coins.length : laidCount(r, time);
        for (let k = 0; k < laid; k++) {
          const c = r.coins[k];
          if (c.fallAt >= 0 && time >= c.fallAt) continue;
          // Tipping: in its last 120 ms a coin leans over toward where it will lie.
          const tip = c.fallAt >= 0 ? clamp(1 - (c.fallAt - time) / 120, 0, 1) : 0;
          standingCoin(g, c.x + Math.cos(c.dir) * tip * 10, c.y + Math.sin(c.dir) * tip * 6, c.dir, tip, k);
        }
        if (!r.toppled && !r.ring && laid >= r.coins.length) {
          for (const idx of [0, r.coins.length - 1]) {
            const c = r.coins[idx];
            g.lineStyle(1.5, INK_GREEN, 0.6 + 0.3 * Math.sin(time / 200)); g.strokeCircle(c.x, c.y - 10, 16);
          }
        }
      }
    },

    drawHud(g, time) {
      // Her rouleaux at hand: the next row's coins stood ready, filling as she counts them out.
      const k = clamp(1 - (nextLay - time) / (ringed ? 3600 : 4400), 0, 1);
      const x0 = 24, y0 = H - 30;
      for (let i = 0; i < 10; i++) {
        const ready = i / 10 < k;
        if (ready) coin(g, x0 + i * 12, y0, 6, i % 3 === 2 ? 'silver' : 'gold', 0.35, 'blank');
        else { g.lineStyle(1, SILVER, 0.35); g.strokeEllipse(x0 + i * 12, y0, 4, 12); }
      }
      const standing = rows.filter((r) => !r.toppled).length;
      for (let i = 0; i < MAX_ROWS; i++) { g.fillStyle(i < standing ? GOLD : GOLD_DARK, i < standing ? 1 : 0.35); g.fillRect(x0 + i * 14, y0 + 12, 10, 3); }
    },

    destroy() { for (const r of rows) for (const e of r.ends) e.remove(); },
  };
}

/** A great coin stood on its rim: its thin edge toward you, a shadow, and the milling catching the light. */
function standingCoin(g: G, x: number, y: number, dir: number, tip: number, k: number): void {
  shadow(g, x, y + 1, 16, 5, 0.3);
  const face = Math.abs(Math.cos(dir)) * 0.3 + 0.12 + tip * 0.5;
  coin(g, x, y - 12 + tip * 6, 11, k % 4 === 3 ? 'silver' : 'gold', face, k % 2 ? 'tail' : 'head');
  g.fillStyle(GOLD_PALE, 0.5); g.fillRect(x - 0.6, y - 22 + tip * 6, 1.2, 4);
}

export const FALLEN_ROULEAU: GimmickDef = {
  id: ID,
  rules: 'Rows of coin on edge wall the floor; knocked, they topple in a wave that slaps whoever is beside it. Strike an end or shoot a coin to start one.',
  make,
};
