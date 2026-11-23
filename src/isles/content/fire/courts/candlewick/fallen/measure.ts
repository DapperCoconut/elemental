import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRASS, FOE_TINT, PLAYER_TINT, SEAL_RED, WAX, WAX_SHADE, WICK, flame } from '../art';

/**
 * Not Too Fast — Tallykeeper Notch, who in the King's telling walks the streets with a notched
 * rule and measures every household's candle against the Inch-Tax: not too fast, not too slow.
 *
 * Here Notch measures *you*. Each fighter's burn is how far they have walked over the last three
 * seconds — every stride, every dash — and it trails behind them on the floor as a notched wax
 * line. The tally-candle on the right shows the lawful band between two brass pins. On the
 * hourglass's turn Notch measures both fighters: burn too fast and your wick is trimmed (rooted,
 * fined); too slow and you are snuffed (silenced, fined); true to the inch and you are let be with
 * a little warmth back. The next band is shown the moment the last measure is taken. The
 * exploit: Notch is measured by the same rule — make him chase you across a measure, or pin him
 * still with your own kit. Halfway, the Prince's inch: narrower bands, quicker hourglass.
 */

const WINDOW_MS = 3000;
const SAMPLE_MS = 100;
const MEASURE_MS = 5600;
const MEASURE_LATE_MS = 4600;
const WARN_MS = 1500;
const TAX = 14;
const TAX_LATE = 19;
const TRIM_ROOT_MS = 900;
const SNUFF_SILENCE_MS = 1500;
const TRUE_HEAL = 6;
const GAUGE_MAX = 240;

/** One position sample on a fighter's burn trail. */
interface Sample { t: number; x: number; y: number }
/** The lawful band of burn, in px per second. */
interface Band { lo: number; hi: number }
/** What the last measure said about a fighter, for the trail's colour flash. */
type Verdict = 'fast' | 'slow' | 'true';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, rng } = ctx;
  const trails = new Map<Fighter, Sample[]>();
  const verdicts = new Map<Fighter, { v: Verdict; at: number }>();
  let nextSampleAt = 0;
  let nextMeasureAt = MEASURE_MS + 800;
  let band: Band = { lo: 50, hi: 140 };
  let late = false;
  let announced = false;
  let tickedFor = 0;
  let measuredAt = -9999;

  const pace = (f: Fighter): number => {
    const s = trails.get(f);
    if (!s || s.length < 2) return 0;
    let d = 0;
    for (let i = 1; i < s.length; i++) d += Math.min(400, Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y));
    return d / (WINDOW_MS / 1000);
  };

  const newBand = (): Band => {
    const width = late ? 50 + rng() * 15 : 75 + rng() * 25;
    const lo = 25 + rng() * (late ? 110 : 85);
    return { lo, hi: Math.min(GAUGE_MAX - 10, lo + width) };
  };

  const measure = (time: number): void => {
    ctx.sfx('judgement');
    measuredAt = time;
    for (const f of [ctx.player, ctx.npc]) {
      if (!f.active || f.hp <= 0) continue;
      const p = pace(f);
      const tax = late ? TAX_LATE : TAX;
      if (p > band.hi) {
        ctx.hit(f, tax, f.x, f.y);
        ctx.root(f, TRIM_ROOT_MS);
        verdicts.set(f, { v: 'fast', at: time });
        ctx.flash(f.x, f.y, 0xffb040);
      } else if (p < band.lo) {
        ctx.hit(f, tax, f.x, f.y);
        ctx.silence(f, SNUFF_SILENCE_MS);
        verdicts.set(f, { v: 'slow', at: time });
        ctx.flash(f.x, f.y, 0x6a6080);
      } else {
        ctx.heal(f, TRUE_HEAL);
        verdicts.set(f, { v: 'true', at: time });
      }
    }
    band = newBand();
  };

  return {
    update(time) {
      if (!announced) { announced = true; ctx.banner('NOT TOO FAST — NOT TOO SLOW', '#ffe2a8'); }
      if (!late && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        late = true;
        ctx.banner('THE PRINCE\'S INCH', '#ffb070');
        ctx.sfx('time-warp');
      }
      if (time >= nextSampleAt) {
        nextSampleAt = time + SAMPLE_MS;
        for (const f of [ctx.player, ctx.npc]) {
          const s = trails.get(f) ?? [];
          s.push({ t: time, x: f.x, y: f.y });
          while (s.length && time - s[0].t > WINDOW_MS) s.shift();
          trails.set(f, s);
        }
      }
      const left = nextMeasureAt - time;
      // Three ticks of the hourglass before the measure.
      const tick = left < WARN_MS ? Math.ceil(left / (WARN_MS / 3)) : 0;
      if (tick > 0 && tick !== tickedFor) { tickedFor = tick; ctx.sfx('clock-tick'); }
      if (time >= nextMeasureAt) {
        measure(time);
        tickedFor = 0;
        nextMeasureAt = time + (late ? MEASURE_LATE_MS : MEASURE_MS);
      }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const left = nextMeasureAt - ctx.scene.time.now;
      if (left > 2700) return null;
      const mine = pace(n);
      const mid = (band.lo + band.hi) / 2;
      // Burning hot: stand still and let the trail cool.
      if (mine > mid + (band.hi - band.lo) * 0.2) return { x: n.x, y: n.y };
      // Burning cold: walk a steady circle round the player to fill the trail.
      if (mine < mid - (band.hi - band.lo) * 0.2) {
        const a = Math.atan2(n.y - p.y, n.x - p.x) + 0.9;
        return { x: p.x + Math.cos(a) * 220, y: p.y + Math.sin(a) * 220 };
      }
      return null;
    },

    drawGround(g, time) {
      // Each fighter's burn: a pale wax line along their last three seconds, notched every inch.
      for (const f of [ctx.player, ctx.npc]) {
        const s = trails.get(f);
        if (!s || s.length < 2) continue;
        const tint = f === ctx.player ? PLAYER_TINT : FOE_TINT;
        const ver = verdicts.get(f);
        const hot = ver && time - ver.at < 700 ? (ver.v === 'true' ? 0xfff0c0 : SEAL_RED) : null;
        let run = 0;
        for (let i = 1; i < s.length; i++) {
          const a = s[i - 1], b = s[i];
          const age = (time - b.t) / WINDOW_MS;
          const seg = Math.hypot(b.x - a.x, b.y - a.y);
          if (seg < 0.5 || seg > 400) continue;
          g.lineStyle(7, dim(WAX_SHADE, 0.2), 0.4 * (1 - age)); g.lineBetween(a.x, a.y + 16, b.x, b.y + 16);
          g.lineStyle(4, hot ?? WAX, 0.75 * (1 - age)); g.lineBetween(a.x, a.y + 14, b.x, b.y + 14);
          // Notches every 24 px of trail: the inch-marks Notch counts.
          const nx = -(b.y - a.y) / seg, ny = (b.x - a.x) / seg;
          let at = 24 - (run % 24);
          while (at < seg) {
            const k = at / seg;
            const x = a.x + (b.x - a.x) * k, y = a.y + 14 + (b.y - a.y) * k;
            g.lineStyle(1.5, tint, 0.8 * (1 - age)); g.lineBetween(x - nx * 5, y - ny * 5, x + nx * 5, y + ny * 5);
            at += 24;
          }
          run += seg;
        }
      }
      // The measure itself: a brass rule slapped down across each fighter for a beat.
      const since = time - measuredAt;
      if (since < 500) {
        for (const f of [ctx.player, ctx.npc]) {
          const a = 1 - since / 500;
          g.fillStyle(BRASS, 0.85 * a); g.fillRect(f.x - 46, f.y + 18, 92, 7);
          g.lineStyle(1, dim(BRASS, 0.5), a);
          for (let i = 0; i <= 8; i++) g.lineBetween(f.x - 46 + i * 11.5, f.y + 18, f.x - 46 + i * 11.5, f.y + (i % 2 ? 22 : 25));
        }
      }
    },

    drawAir(g, time) {
      // Verdict marks over each fighter just after a measure: shears for trimmed, a snuffer for snuffed.
      for (const f of [ctx.player, ctx.npc]) {
        const ver = verdicts.get(f);
        if (!ver || time - ver.at > 1100) continue;
        const a = 1 - (time - ver.at) / 1100;
        const x = f.x, y = f.y - 58 - (1 - a) * 10;
        if (ver.v === 'fast') {
          g.lineStyle(3, 0xd8d8e0, a); g.lineBetween(x - 10, y - 10, x + 10, y + 6); g.lineBetween(x + 10, y - 10, x - 10, y + 6);
          g.lineStyle(2, BRASS, a); g.strokeCircle(x - 10, y + 9, 4); g.strokeCircle(x + 10, y + 9, 4);
        } else if (ver.v === 'slow') {
          g.fillStyle(BRASS, a); g.fillTriangle(x - 10, y + 6, x + 10, y + 6, x, y - 12);
          g.lineStyle(2, dim(BRASS, 0.4), a); g.lineBetween(x, y - 12, x + 14, y - 20);
        } else {
          flame(g, x, y + 4, 5, time / 1000, 1, 0.05 * a);
        }
      }
    },

    drawHud(g, time) {
      // The tally-candle: a tall notched candle on the right, its height the gauge (0 at the foot).
      const cx = W - 54, foot = 330, head = 112;
      const yOf = (v: number): number => foot - (Math.min(GAUGE_MAX, v) / GAUGE_MAX) * (foot - head);
      g.fillStyle(0x000000, 0.42); g.fillRoundedRect(cx - 40, head - 22, 80, foot - head + 92, 10);
      g.fillStyle(WAX_SHADE, 1); g.fillRect(cx - 9, head, 18, foot - head);
      g.fillStyle(WAX, 1); g.fillRect(cx - 7, head, 12, foot - head);
      g.fillStyle(lit(WAX, 0.4), 1); g.fillRect(cx - 5, head, 3, foot - head);
      g.lineStyle(1, dim(WAX_SHADE, 0.35), 1);
      for (let v = 0; v <= GAUGE_MAX; v += 20) g.lineBetween(cx - 9, yOf(v), cx - (v % 60 === 0 ? 1 : 4), yOf(v));
      g.lineStyle(1.5, WICK, 1); g.lineBetween(cx, head, cx, head - 7);
      flame(g, cx, head - 6, 5, time / 1000, 3, 0.05);
      // The lawful band between two brass pins, shaded gold.
      g.fillStyle(BRASS, 0.32); g.fillRect(cx - 14, yOf(band.hi), 28, yOf(band.lo) - yOf(band.hi));
      for (const v of [band.lo, band.hi]) {
        g.lineStyle(2.5, BRASS, 1); g.lineBetween(cx - 18, yOf(v), cx + 18, yOf(v));
        g.fillStyle(lit(BRASS, 0.3), 1); g.fillCircle(cx + 18, yOf(v), 3);
      }
      // Each fighter's burn as a little flame-tipped pointer: player left, Notch right.
      for (const [f, side, tint] of [[ctx.player, -1, PLAYER_TINT], [ctx.npc, 1, FOE_TINT]] as [Fighter, number, number][]) {
        const v = pace(f), y = yOf(v);
        const out = v > band.hi || v < band.lo;
        g.fillStyle(tint, 1);
        g.fillTriangle(cx + side * 12, y, cx + side * 26, y - 6, cx + side * 26, y + 6);
        g.fillStyle(out && Math.floor(time / 140) % 2 ? SEAL_RED : tint, 1); g.fillCircle(cx + side * 30, y, 5);
      }
      // The hourglass under the candle: sand running out toward the measure.
      const period = late ? MEASURE_LATE_MS : MEASURE_MS;
      const k = Math.max(0, Math.min(1, 1 - (nextMeasureAt - time) / period));
      const hy = foot + 40;
      g.fillStyle(dim(BRASS, 0.2), 1); g.fillRect(cx - 18, hy - 30, 36, 4); g.fillRect(cx - 18, hy + 26, 36, 4);
      g.lineStyle(1.5, 0xe0e8f0, 0.8);
      g.strokeTriangle(cx - 14, hy - 26, cx + 14, hy - 26, cx, hy); g.strokeTriangle(cx - 14, hy + 26, cx + 14, hy + 26, cx, hy);
      const topFill = 1 - k, botFill = k;
      g.fillStyle(0xe8c070, 1);
      if (topFill > 0.02) g.fillTriangle(cx - 13 * topFill, hy - 26 * topFill, cx + 13 * topFill, hy - 26 * topFill, cx, hy - 1);
      if (botFill > 0.02) g.fillTriangle(cx - 13, hy + 25, cx + 13, hy + 25, cx, hy + 25 - 24 * botFill);
      if (k < 1) { g.lineStyle(1, 0xe8c070, 1); g.lineBetween(cx, hy, cx, hy + 25 - 24 * botFill); }
      if (nextMeasureAt - time < WARN_MS && Math.floor(time / 120) % 2) {
        g.lineStyle(2, SEAL_RED, 0.9); g.strokeRoundedRect(cx - 40, head - 22, 80, foot - head + 92, 10);
      }
    },
  };
}

export const MEASURE: GimmickDef = {
  id: fallenId('candlewick', 'measure'),
  rules: 'Your burn is how far you walked in 3 s. When the sand runs out, outside the pins: too fast is trimmed, too slow is snuffed.',
  make,
};
