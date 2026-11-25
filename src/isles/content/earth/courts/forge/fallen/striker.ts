import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { anvil } from '../art';
import { HEAT_ORANGE, HEAT_RED, HEAT_WHITE, HEAT_YELLOW, IRON, IRON_DARK, IRON_LIT, IRON_SHEEN, TIMBER, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { hurt, onFloor } from './kit';

/**
 * Between Hammer and Anvil — Absalom Strake, the Hall's Striker: the biggest arm in the iron hills,
 * who swung the sledge for the smiths of Hammer Row until, in the King's telling, the Prince bought
 * him to swing it at whoever the Hook found short.
 *
 * Four great anvils stand in the yard, each with its striking circle chalked round it.
 * - **On the anvil**: whoever stands inside an anvil's circle takes blows half again as hard, and a
 *   heavy blow there *rings* them — a short stun (once every few seconds per fighter). It works on
 *   Absalom exactly as on you.
 * - **The sledge**: when you are close, he plants his feet (really rooted) and winds an overhead
 *   swing; its wedge and your knock-back line are drawn. Caught, you are hurt and thrown back — and
 *   thrown into an anvil, you are **slammed**: hurt again and stunned.
 * - **Strike an anvil** to slide it away from you: set one behind him, then fight him there.
 *
 * Past half every swing has a follow-through, re-aimed. The bot works round you so an anvil is at
 * your back, and steps out of the circles itself.
 */

const ID = fallenId('forge', 'striker');
const ANV_R = 60;
const ON_ANVIL = 1.5;
const RING_MIN = 6;
const RING_STUN = 650;
const RING_EVERY = 4000;
const WIND_MS = 950;
const FOLLOW_MS = 720;
const SWING_R = 165;
const SWING_HALF = 1.05;
const SWING_DMG = 14;
const KNOCK = 130;
const KNOCK_SPEED = 760;
const SLAM_R = 46;
const SLAM_DMG = 12;
const SLAM_STUN = 900;
const SLIDE = 72;
const PERIOD = 4000;
const PERIOD_LATE = 3000;

interface Anvil { x: number; y: number; t: StrikeTarget; slidAt: number; rangAt: number }
interface Wind { ox: number; oy: number; aim: number; at: number; ms: number; follow: boolean }
interface Knock { f: Fighter; ux: number; uy: number; left: number }

/** The Striker's sledge: a long ash helve and a squared iron head, drawn from the hands along `a`. */
function sledge(g: G, x: number, y: number, a: number, len: number): void {
  const hx = x + Math.cos(a) * len, hy = y + Math.sin(a) * len;
  g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(x, y, hx, hy);
  g.lineStyle(2, TIMBER, 1); g.lineBetween(x, y - 1, hx, hy - 1);
  const px = -Math.sin(a), py = Math.cos(a);
  const pts = [
    { x: hx + px * 13 - Math.cos(a) * 4, y: hy + py * 13 - Math.sin(a) * 4 },
    { x: hx + px * 13 + Math.cos(a) * 10, y: hy + py * 13 + Math.sin(a) * 10 },
    { x: hx - px * 13 + Math.cos(a) * 10, y: hy - py * 13 + Math.sin(a) * 10 },
    { x: hx - px * 13 - Math.cos(a) * 4, y: hy - py * 13 - Math.sin(a) * 4 },
  ];
  g.fillStyle(IRON_DARK, 1); g.fillPoints(pts, true);
  g.lineStyle(1.5, IRON_SHEEN, 0.8); g.lineBetween(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
  g.fillStyle(IRON_LIT, 1); g.fillCircle(hx, hy, 2.5);
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const anvils: Anvil[] = [];
  const knocks: Knock[] = [];
  const rungAt = new Map<Fighter, number>();
  let wind: Wind | null = null;
  let swungAt = -1e9;
  let swung: Wind | null = null;
  let nextSwing = 0;
  let late = false;
  let started = false;
  let own = false;
  let now = 0;

  const nearAnvil = (x: number, y: number, r = ANV_R) => anvils.find((a) => dist(a.x, a.y, x, y) < r) ?? null;
  const takenMult = (f: Fighter) => (alive(f) && nearAnvil(f.x, f.y) ? ON_ANVIL : 1);

  function slide(a: Anvil, by: Fighter): void {
    if (now - a.slidAt < 300) return;
    const ang = Math.atan2(a.y - by.y, a.x - by.x);
    const p = onFloor(ctx, a.x + Math.cos(ang) * SLIDE, a.y + Math.sin(ang) * SLIDE, 60);
    if (anvils.some((o) => o !== a && dist(o.x, o.y, p.x, p.y) < 120)) return;
    a.slidAt = now;
    a.x = p.x; a.y = p.y; a.t.moveTo(p.x, p.y - 18);
    ctx.sfx('anvil');
  }

  /** A heavy blow taken on the anvil rings the one who took it. */
  function ring(f: Fighter, amount: number): void {
    if (own || amount < RING_MIN || !alive(f)) return;
    const a = nearAnvil(f.x, f.y);
    if (!a || now - (rungAt.get(f) ?? -1e9) < RING_EVERY) return;
    rungAt.set(f, now);
    a.rangAt = now;
    ctx.stun(f, RING_STUN);
    ctx.float(f.x, f.y - 56, 'RUNG ON THE ANVIL', '#ffe2a8');
    ctx.sfx('anvil');
  }

  /** Where a knock-back from this wind would carry the player, and the anvil it would slam them into. */
  function knockPath(w: Wind, f: Fighter): { end: Pt; anvil: Anvil | null } {
    const a = Math.atan2(f.y - w.oy, f.x - w.ox);
    for (let s = 10; s <= KNOCK; s += 10) {
      const p = onFloor(ctx, f.x + Math.cos(a) * s, f.y + Math.sin(a) * s, 40);
      const hit = nearAnvil(p.x, p.y, SLAM_R);
      if (hit) return { end: p, anvil: hit };
    }
    return { end: onFloor(ctx, f.x + Math.cos(a) * KNOCK, f.y + Math.sin(a) * KNOCK, 40), anvil: null };
  }
  const inWedge = (w: Wind, x: number, y: number) => {
    const d = dist(w.ox, w.oy, x, y);
    const off = Math.abs(Math.atan2(Math.sin(Math.atan2(y - w.oy, x - w.ox) - w.aim), Math.cos(Math.atan2(y - w.oy, x - w.ox) - w.aim)));
    return d < SWING_R + 20 && (d < 30 || off < SWING_HALF);
  };

  function startWind(follow: boolean): void {
    const n = ctx.npc, p = ctx.player;
    const ms = follow ? FOLLOW_MS : WIND_MS;
    wind = { ox: n.x, oy: n.y, aim: Math.atan2(p.y - n.y, p.x - n.x), at: now, ms, follow };
    ctx.root(n, ms + 120);
    ctx.sfx('whoosh');
  }

  function swing(w: Wind): void {
    const p = ctx.player;
    swungAt = now;
    swung = w;
    ctx.sfx('hammer-forge');
    if (alive(p) && inWedge(w, p.x, p.y)) {
      own = true;
      hurt(ctx, p, SWING_DMG);
      own = false;
      const a = Math.atan2(p.y - w.oy, p.x - w.ox);
      knocks.push({ f: p, ux: Math.cos(a), uy: Math.sin(a), left: KNOCK });
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      now = time;
      if (!started) {
        started = true;
        nextSwing = time + 2600;
        for (const h of [{ x: W * 0.25, y: top + 150 }, { x: W * 0.75, y: top + 150 }, { x: W * 0.3, y: H - 110 }, { x: W * 0.7, y: H - 110 }]) {
          const a: Anvil = { x: h.x, y: h.y, slidAt: -1e9, rangAt: -1e9, t: null as unknown as StrikeTarget };
          a.t = ctx.target({ x: h.x, y: h.y - 18, r: 24, onStruck: (by) => slide(a, by === 'player' ? ctx.player : ctx.npc) });
          anvils.push(a);
        }
      }
      if (!late && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        late = true;
        ctx.banner('THE FOLLOW-THROUGH', '#ffb070');
      }
      const n = ctx.npc, p = ctx.player;
      if (wind && time >= wind.at + wind.ms) {
        const w = wind;
        wind = null;
        swing(w);
        if (late && !w.follow && alive(n) && dist(n.x, n.y, p.x, p.y) < 280) startWind(true);
        else nextSwing = time + (late ? PERIOD_LATE : PERIOD);
      }
      if (!wind && time >= nextSwing && alive(n) && alive(p) && dist(n.x, n.y, p.x, p.y) < 230) startWind(false);
      // Knock-backs travel; an anvil in the way stops them hard.
      for (let i = knocks.length - 1; i >= 0; i--) {
        const k = knocks[i];
        const step = Math.min(k.left, KNOCK_SPEED * dt);
        ctx.nudge(k.f, k.ux * step, k.uy * step);
        k.left -= step;
        const a = nearAnvil(k.f.x, k.f.y, SLAM_R);
        if (a) {
          own = true;
          hurt(ctx, k.f, SLAM_DMG, a.x, a.y);
          own = false;
          ctx.stun(k.f, SLAM_STUN);
          a.rangAt = time;
          ctx.float(k.f.x, k.f.y - 56, 'SLAMMED', '#ff9a6a');
          ctx.flash(a.x, a.y - 30, HEAT_WHITE);
          ctx.sfx('anvil');
          knocks.splice(i, 1);
        } else if (k.left <= 0.5) knocks.splice(i, 1);
      }
    },

    playerTakenMult() { return takenMult(ctx.player); },
    npcTakenMult() { return takenMult(ctx.npc); },
    onPlayerHurt(amount) { ring(ctx.player, amount); },
    onNpcHurt(amount) { ring(ctx.npc, amount); },

    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      const mine = nearAnvil(n.x, n.y, ANV_R + 10);
      if (mine) {
        const a = Math.atan2(n.y - mine.y, n.x - mine.x);
        return onFloor(ctx, mine.x + Math.cos(a) * (ANV_R + 60), mine.y + Math.sin(a) * (ANV_R + 60));
      }
      // Put an anvil at your back: stand on the far side of you from the anvil nearest you.
      const back = anvils.filter((a) => dist(a.x, a.y, p.x, p.y) < 240)
        .sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0];
      if (back) {
        const a = Math.atan2(p.y - back.y, p.x - back.x);
        const t = onFloor(ctx, p.x + Math.cos(a) * 110, p.y + Math.sin(a) * 110);
        if (!nearAnvil(t.x, t.y, ANV_R + 20)) return t;
      }
      return onFloor(ctx, p.x + (n.x < p.x ? -120 : 120), p.y + 20);
    },

    drawGround(g, time) {
      for (const a of anvils) {
        // The striking circle, chalked, and the floor plate the anvil stands on.
        const hot = [ctx.player, ctx.npc].some((f) => alive(f) && dist(f.x, f.y, a.x, a.y) < ANV_R);
        g.fillStyle(IRON_DARK, 0.5); g.fillEllipse(a.x, a.y, 70, 22);
        for (let s = 0; s < 24; s++) {
          if (s % 2) continue;
          g.lineStyle(2, hot ? HEAT_YELLOW : 0xf4ecd8, hot ? 0.75 : 0.35);
          g.beginPath(); g.arc(a.x, a.y, ANV_R, (s / 24) * Math.PI * 2, ((s + 1) / 24) * Math.PI * 2); g.strokePath();
        }
        if (time - a.rangAt < 600) {
          const k = (time - a.rangAt) / 600;
          g.lineStyle(3, HEAT_WHITE, 0.8 * (1 - k)); g.strokeCircle(a.x, a.y - 10, 20 + k * 90);
        }
      }
      const w = wind;
      if (w) {
        // The swing's wedge, and where you would be thrown.
        const k = clamp((time - w.at) / w.ms, 0, 1);
        const pts: Pt[] = [{ x: w.ox, y: w.oy }];
        for (let s = 0; s <= 16; s++) {
          const a = w.aim - SWING_HALF + (s / 16) * SWING_HALF * 2;
          pts.push({ x: w.ox + Math.cos(a) * SWING_R, y: w.oy + Math.sin(a) * SWING_R });
        }
        g.fillStyle(HEAT_RED, 0.1 + k * 0.22); g.fillPoints(pts, true);
        g.lineStyle(2.5, HEAT_YELLOW, 0.5 + k * 0.45); g.strokePoints(pts, true);
        const p = ctx.player;
        if (alive(p) && inWedge(w, p.x, p.y)) {
          const path = knockPath(w, p);
          g.lineStyle(3, path.anvil ? HEAT_RED : 0xf4ecd8, 0.8); g.lineBetween(p.x, p.y, path.end.x, path.end.y);
          const a = Math.atan2(path.end.y - p.y, path.end.x - p.x);
          g.fillStyle(path.anvil ? HEAT_RED : 0xf4ecd8, 0.9);
          g.fillTriangle(path.end.x + Math.cos(a) * 10, path.end.y + Math.sin(a) * 10, path.end.x + Math.cos(a + 2.4) * 9, path.end.y + Math.sin(a + 2.4) * 9, path.end.x + Math.cos(a - 2.4) * 9, path.end.y + Math.sin(a - 2.4) * 9);
          if (path.anvil) { g.lineStyle(4, HEAT_RED, 0.6 + 0.4 * Math.sin(time / 60)); g.strokeCircle(path.anvil.x, path.anvil.y - 14, 34); }
        }
      }
    },

    drawAir(g, time) {
      for (const a of anvils) anvil(g, a.x, a.y, 1.5, time - a.rangAt < 800 ? 1 - (time - a.rangAt) / 800 : 0);
      const n = ctx.npc;
      if (!alive(n)) return;
      const hx = n.x, hy = n.y - 26;
      if (wind) {
        // Winding: the sledge goes back over his shoulder.
        const k = clamp((time - wind.at) / wind.ms, 0, 1);
        sledge(g, hx, hy, wind.aim + Math.PI * (0.55 + k * 0.5), 62);
        if (k > 0.7) glow(g, hx, hy, 30, HEAT_ORANGE, 0.05, 2);
      } else if (swung && time - swungAt < 260) {
        // The blow: the head comes over and down through the wedge, leaving its arc.
        const k = (time - swungAt) / 260;
        const a = swung.aim + Math.PI * 1.05 - k * (Math.PI * 1.05 + SWING_HALF);
        for (let s = 1; s <= 5; s++) {
          const ab = a + s * 0.12;
          g.lineStyle(5, HEAT_YELLOW, 0.3 - s * 0.05);
          g.lineBetween(hx + Math.cos(ab) * 50, hy + Math.sin(ab) * 50, hx + Math.cos(ab) * 70, hy + Math.sin(ab) * 70);
        }
        sledge(g, hx, hy, a, 62);
      } else {
        // At rest: the sledge on his shoulder.
        sledge(g, hx - 6, hy + 4, -Math.PI * 0.72, 54);
      }
    },

    drawHud(g, time) {
      // An anvil glyph per fighter: red while that fighter stands on an anvil, a pip when they can be rung.
      for (const [f, x] of [[ctx.player, 34], [ctx.npc, W - 34]] as [Fighter, number][]) {
        const on = alive(f) && !!nearAnvil(f.x, f.y);
        const y = top + 22;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 22, y - 16, 44, 28, 6);
        g.fillStyle(on ? HEAT_RED : IRON, 1);
        g.fillRect(x - 12, y - 6, 22, 5); g.fillTriangle(x + 10, y - 6, x + 10, y - 2, x + 18, y - 4);
        g.fillRect(x - 5, y - 1, 10, 4); g.fillRect(x - 9, y + 3, 18, 3);
        const ready = now - (rungAt.get(f) ?? -1e9) >= RING_EVERY;
        g.fillStyle(ready ? HEAT_YELLOW : IRON_DARK, 1); g.fillCircle(x + 14, y - 11, 3);
        if (on) glow(g, x, y, 18, HEAT_RED, 0.05 + 0.03 * Math.sin(time / 80), 2);
      }
    },

    destroy() { for (const a of anvils) a.t.remove(); },
  };
}

/** Between Hammer and Anvil: blows by an anvil land harder and ring; his sledge throws you into one. */
export const FALLEN_STRIKER: GimmickDef = {
  id: ID,
  rules: 'By an anvil you take more and a heavy blow rings you. His sledge throws you back — into an anvil, you are slammed. Strike an anvil to slide it.',
  make,
};
