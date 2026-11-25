import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { CANDLE, GILT, GILT_DARK, GILT_LIT, MIND, MIND_LIT, VELVET, VELVET_DARK, VELVET_LIT, WOOD_DARK } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Out of Body — Trance-Medium Zenobia Kellaway of Séance Row, who sat in a wing-chair with her
 * eyes rolled up and walked abroad without her body. In the King's telling she walked into
 * gamblers' houses at night and came back knowing where the stake was hidden.
 *
 * Three séance chairs stand about the yard. Every so often she sits in the nearest and goes
 * under: her body stays slumped in the chair, held fast, and her double rises out of it — a pale
 * figure trailing a silver cord back to her chest — and drifts after you, slower than a walk.
 * Close in, it reaches (the hands show, a ring opens) and its cold touch hurts and drags at you.
 *
 * Her empty body takes more from every blow, so the trance is a chance as much as a threat. And
 * the cord is the real prize: a knot rides on it, nearer the double than the chair. Strike the
 * knot three times and the cord parts — the double is gone, and she wakes in the chair with a
 * scream (stunned, struck). Halfway down, two doubles go out on two cords; part both to wake her.
 */

const ID = fallenId('mind', 'cord');
const TRANCE_EVERY = 8200;
const TRANCE_MS = 7200;
const SEEK_LIMIT = 4500;
const SPEED = 150;
const REACH = 72;
const WIND_MS = 650;
const TOUCH_CD = 900;
const KNOT_AT = 0.62;
const FRAYS = 3;

interface Double {
  x: number; y: number;
  windAt: number; restUntil: number;
  frays: number; cut: boolean; cutAt: number;
  knot: StrikeTarget | null; lastFray: number;
  side: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const chairs: Pt[] = [{ x: 170, y: top + 140 }, { x: W - 170, y: top + 140 }, { x: W / 2, y: H - 70 }];
  let wantAt = 0;
  let want = false;
  let tranceAt = -1;
  let tranceEnd = 0;
  let seat: Pt | null = null;
  let nextTrance = 0;
  let started = false;
  let two = false;
  let wokeAt = -1e9;
  let doubles: Double[] = [];

  const entranced = () => tranceAt >= 0;
  const nearestChair = () => [...chairs].sort((a, b) =>
    dist(npc.x, npc.y, a.x, a.y) - dist(npc.x, npc.y, b.x, b.y) + (dist(player.x, player.y, a.x, a.y) < 150 ? 400 : 0) - (dist(player.x, player.y, b.x, b.y) < 150 ? 400 : 0))[0];
  const body = () => ({ x: npc.x, y: npc.y - 30 });
  /** A point along the cord from her chest (0) to the double (1), with the cord's sag. */
  const along = (d: Double, t: number, time: number): Pt => {
    const b = body();
    const nx = -(d.y - b.y), ny = d.x - b.x;
    const len = Math.hypot(nx, ny) || 1;
    const wave = Math.sin(t * Math.PI) * (18 + Math.sin(time / 300 + d.side) * 10) * d.side;
    return { x: b.x + (d.x - b.x) * t + (nx / len) * wave, y: b.y + (d.y - b.y) * t + (ny / len) * wave };
  };

  function goUnder(time: number): void {
    want = false;
    tranceAt = time;
    tranceEnd = time + TRANCE_MS;
    ctx.sfx('curse-cast');
    const n = two ? 2 : 1;
    doubles = [];
    for (let i = 0; i < n; i++) {
      const d: Double = { x: npc.x, y: npc.y - 20, windAt: -1, restUntil: time + 700, frays: 0, cut: false, cutAt: 0, knot: null, lastFray: 0, side: i === 0 ? 1 : -1 };
      d.knot = ctx.target({
        x: d.x, y: d.y, r: 22, passThrough: true,
        onStruck: (by) => {
          const t = ctx.scene.time.now;
          if (by !== 'player' || d.cut || !entranced() || t - d.lastFray < 220) return;
          d.lastFray = t;
          d.frays++;
          ctx.sfx('snap-back');
          if (d.frays >= FRAYS) sever(d, t);
        },
      });
      doubles.push(d);
    }
  }

  function sever(d: Double, time: number): void {
    d.cut = true;
    d.cutAt = time;
    d.knot?.remove(); d.knot = null;
    ctx.sfx('ice-shatter');
    if (doubles.every((x) => x.cut)) {
      ctx.hit(npc, 36, npc.x, npc.y);
      ctx.stun(npc, 1400);
      ctx.flash(npc.x, npc.y, MIND_LIT);
      ctx.sfx('screech');
      wake(time, true);
    } else {
      ctx.hit(npc, 18, npc.x, npc.y);
    }
  }

  function wake(time: number, rude: boolean): void {
    tranceAt = -1;
    wokeAt = time;
    for (const d of doubles) { d.knot?.remove(); d.knot = null; }
    if (!rude) ctx.sfx('whoosh');
    nextTrance = time + TRANCE_EVERY;
    seat = null;
  }

  return {
    update(time, dt) {
      if (!started) { started = true; nextTrance = time + 3500; }
      if (!two && npc.hp < npc.maxHp * 0.5) { two = true; ctx.banner('TWO CORDS', '#e2ccff'); ctx.sfx('boss-phase'); }
      if (!alive(npc)) { if (entranced()) wake(time, false); return; }
      if (!entranced() && !want && time >= nextTrance) { want = true; wantAt = time; seat = nearestChair(); }
      if (want && seat && (dist(npc.x, npc.y, seat.x, seat.y) < 34 || time - wantAt > SEEK_LIMIT)) goUnder(time);
      if (!entranced()) return;

      // Held in the chair while she walks abroad.
      if (Math.floor(time / 200) !== Math.floor((time - dt * 1000) / 200)) ctx.root(npc, 320);
      for (const d of doubles) {
        if (d.cut) continue;
        const k = along(d, KNOT_AT, time);
        d.knot?.moveTo(k.x, k.y);
        if (d.windAt >= 0) {
          if (time >= d.windAt + tk.warn(WIND_MS)) {
            d.windAt = -1;
            d.restUntil = time + TOUCH_CD;
            ctx.sfx('frost-blast');
            if (alive(player) && dist(player.x, player.y, d.x, d.y + 20) < REACH) {
              tk.hitPlayer(17, player.x, player.y);
              tk.slowPlayer(0.6, 1200);
            }
          }
          continue;
        }
        if (time < d.restUntil || !alive(player)) continue;
        const a = Math.atan2(player.y - (d.y + 20), player.x - d.x) + d.side * (doubles.length > 1 ? 0.35 : 0);
        const dd = dist(player.x, player.y, d.x, d.y + 20);
        if (dd < REACH - 14) { d.windAt = time; ctx.sfx('hush'); continue; }
        d.x = clamp(d.x + Math.cos(a) * SPEED * dt, 40, W - 40);
        d.y = clamp(d.y + Math.sin(a) * SPEED * dt, top + 10, H - 60);
      }
      if (time >= tranceEnd) wake(time, false);
    },

    npcTakenMult() { return entranced() ? 1.35 : 1; },

    npcSeek() {
      if (!alive(npc) || entranced()) return null;
      return want && seat ? { x: seat.x, y: seat.y } : null;
    },

    drawGround(g, time) {
      // The three séance chairs: wing-backed, velvet, gilt claw feet.
      for (const c of chairs) drawChair(g, c.x, c.y, entranced() && dist(npc.x, npc.y, c.x, c.y) < 40);
      // A double's reach ring when it winds up.
      for (const d of doubles) {
        if (d.cut || d.windAt < 0 || !entranced()) continue;
        const k = clamp((time - d.windAt) / tk.warn(WIND_MS), 0, 1);
        g.fillStyle(MIND, 0.06 + 0.16 * k); g.fillCircle(d.x, d.y + 20, REACH);
        g.lineStyle(2, MIND_LIT, 0.5 + 0.4 * k); g.strokeCircle(d.x, d.y + 20, REACH);
        g.lineStyle(2, MIND_LIT, 0.9); g.strokeCircle(d.x, d.y + 20, REACH * (1 - k) + 8);
      }
      if (want && seat) { g.lineStyle(2, VELVET_LIT, 0.4 + 0.3 * Math.sin(time / 150)); g.strokeEllipse(seat.x, seat.y + 4, 70, 22); }
    },

    drawAir(g, time) {
      // Her body's trance-glow.
      if (entranced()) glow(g, npc.x, npc.y - 30, 46, MIND, 0.08 + 0.03 * Math.sin(time / 200), 3);
      for (const d of doubles) {
        const since = time - d.cutAt;
        if (d.cut && since > 600) continue;
        if (!d.cut && !entranced() && time - wokeAt > 400) continue;
        // Returning to the body when the trance ends.
        let x = d.x, y = d.y;
        if (!d.cut && !entranced()) {
          const k = clamp((time - wokeAt) / 400, 0, 1);
          const b = body(); x = d.x + (b.x - d.x) * k; y = d.y + (b.y - d.y) * k;
        }
        const fade = d.cut ? 1 - since / 600 : 1;
        // The silver cord: a sagging line from her chest, glinting along its length.
        if (!d.cut) {
          let prev = body();
          for (let i = 1; i <= 16; i++) {
            const p = along({ ...d, x, y }, i / 16, time);
            g.lineStyle(3, 0xc8d0e0, 0.55); g.lineBetween(prev.x, prev.y, p.x, p.y);
            g.lineStyle(1, 0xffffff, 0.5 + 0.5 * Math.sin(time / 90 - i)); g.lineBetween(prev.x, prev.y, p.x, p.y);
            prev = p;
          }
          // The knot: three strands, one parting for each blow.
          const kp = along({ ...d, x, y }, KNOT_AT, time);
          g.fillStyle(0xe8ecf4, 1); g.fillCircle(kp.x, kp.y, 7);
          for (let s = 0; s < FRAYS; s++) {
            const a = (s / FRAYS) * Math.PI * 2 + time / 400;
            g.lineStyle(2, s < d.frays ? CANDLE : 0x9aa4b8, 1);
            g.lineBetween(kp.x + Math.cos(a) * 4, kp.y + Math.sin(a) * 4, kp.x + Math.cos(a) * (s < d.frays ? 14 : 10), kp.y + Math.sin(a) * (s < d.frays ? 14 : 10));
          }
        } else {
          // Parted ends whipping back.
          const b = body();
          g.lineStyle(2, 0xc8d0e0, fade); g.lineBetween(b.x, b.y, b.x + (d.x - b.x) * 0.3 * fade, b.y + (d.y - b.y) * 0.3 * fade);
        }
        drawDouble(g, x, y, time, d.windAt >= 0 ? clamp((time - d.windAt) / tk.warn(WIND_MS), 0, 1) : 0, fade * (d.cut ? 0.6 : 1));
      }
    },

    drawHud(g, time) {
      // A candle burning down through the trance; knot pips for each cord.
      const x = W / 2, y = top + 22;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 50, y - 18, 100, 38, 7);
      const left = entranced() ? clamp((tranceEnd - time) / TRANCE_MS, 0, 1) : 1;
      const ch = 6 + 22 * left;
      g.fillStyle(0xf0e6cc, 1); g.fillRect(x - 4, y + 14 - ch, 8, ch);
      if (entranced()) { g.fillStyle(CANDLE, 1); g.fillTriangle(x - 3, y + 13 - ch, x + 3, y + 13 - ch, x, y + 4 - ch + Math.sin(time / 80)); }
      g.fillStyle(GILT_DARK, 1); g.fillRect(x - 8, y + 14, 16, 3);
      doubles.forEach((d, i) => {
        for (let s = 0; s < FRAYS; s++) {
          g.fillStyle(d.cut || s < d.frays ? CANDLE : 0x9aa4b8, entranced() ? 1 : 0.3);
          g.fillCircle(x + 18 + s * 8, y - 6 + i * 12, 3);
        }
      });
    },

    destroy() { for (const d of doubles) d.knot?.remove(); },
  };
}

/** A wing-backed séance chair; `sat` warms its velvet. */
function drawChair(g: G, x: number, y: number, sat: boolean): void {
  shadow(g, x, y + 4, 70, 18, 0.32);
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 26, y - 8, 4, 12); g.fillRect(x + 22, y - 8, 4, 12);
  g.fillStyle(GILT, 1); g.fillCircle(x - 24, y + 4, 3); g.fillCircle(x + 24, y + 4, 3);
  g.fillStyle(VELVET_DARK, 1); g.fillRoundedRect(x - 26, y - 70, 52, 66, 12);
  g.fillStyle(sat ? VELVET_LIT : VELVET, 1); g.fillRoundedRect(x - 20, y - 64, 40, 52, 10);
  for (let i = 0; i < 3; i++) { g.fillStyle(GILT_DARK, 1); g.fillCircle(x - 10 + i * 10, y - 50, 1.8); g.fillCircle(x - 5 + i * 10, y - 38, 1.8); }
  g.fillStyle(VELVET_DARK, 1); g.fillRoundedRect(x - 32, y - 52, 12, 34, 5); g.fillRoundedRect(x + 20, y - 52, 12, 34, 5);
  g.fillStyle(VELVET, 1); g.fillRoundedRect(x - 22, y - 18, 44, 14, 4);
  g.lineStyle(1, GILT_LIT, 0.7); g.strokeRoundedRect(x - 26, y - 70, 52, 66, 12);
}

/** Her double: a pale veiled woman thinning to wisps, ember eyes, hands out when she reaches. */
function drawDouble(g: G, x: number, y: number, time: number, reach: number, a: number): void {
  const bob = Math.sin(time / 260) * 3;
  const cy = y + bob;
  glow(g, x, cy, 40, MIND_LIT, 0.07 * a, 3);
  // Trailing robe in wisps.
  for (let i = 0; i < 5; i++) {
    const sway = Math.sin(time / 180 + i * 1.3) * 5;
    g.fillStyle(0xe8e4f4, (0.5 - i * 0.08) * a);
    g.fillTriangle(x - 14 + i * 7, cy + 4, x - 8 + i * 4 + sway, cy + 4, x - 11 + i * 5.5 + sway * 1.6, cy + 30 + i % 2 * 8);
  }
  g.fillStyle(0xf2f0fa, 0.7 * a); g.fillEllipse(x, cy - 6, 30, 34);
  // Veil and head.
  g.fillStyle(0xf6f4fc, 0.8 * a); g.fillCircle(x, cy - 28, 11);
  g.fillStyle(0xd8d0ec, 0.6 * a); g.fillTriangle(x - 13, cy - 30, x + 13, cy - 30, x, cy - 6);
  g.fillStyle(0xffa040, a); g.fillCircle(x - 4, cy - 28, 1.8); g.fillCircle(x + 4, cy - 28, 1.8);
  // Arms: folded while she drifts, out and clawing while she reaches.
  const spread = 8 + reach * 18;
  g.lineStyle(4, 0xf0eefa, 0.7 * a);
  g.lineBetween(x - 10, cy - 14, x - spread, cy - 10 - reach * 6);
  g.lineBetween(x + 10, cy - 14, x + spread, cy - 10 - reach * 6);
  if (reach > 0) {
    for (const s of [-1, 1]) for (let f = -1; f <= 1; f++) {
      g.lineStyle(1.5, 0xffffff, 0.8 * a);
      g.lineBetween(x + s * spread, cy - 10 - reach * 6, x + s * (spread + 6), cy - 12 - reach * 6 + f * 4);
    }
  }
}

export const FALLEN_CORD: GimmickDef = {
  id: ID,
  rules: 'She leaves her body in a chair; the double hunts you on a silver cord and her empty body takes more. Strike the knot thrice to wake her.',
  make,
};
