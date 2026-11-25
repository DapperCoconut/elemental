import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BONE, BONE_LIT, GREY_LIT, IRON, IRON_LIT, LAMP, LAMP_HOT, RUST, WISP, WISP_DIM } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Corpse-Candles — Eluned Sallis, who walks the rows at night with the marsh-lights.
 *
 * On Fangmire a corpse-candle is a small flame that walks the yard on its own, and everyone knows
 * it goes the wrong way: step toward it and it comes to meet you, step back and it backs off. The
 * gravediggers say it mirrors the living. Eluned keeps them. In the King's telling she walked them
 * to the doors of the passed-over, so the house would know it was next.
 *
 * Each fighter owns two candles, lit at iron prickets round the yard. Your candles move as your
 * mirror: every step you take, they take the opposite way. A candle that touches anyone — the foe
 * or you — gutters out in a burst that burns and slows, then relights at its pricket. So you steer
 * yours into her by walking away from where you want them to go, and must never walk straight at
 * your own. Strike one of hers and it is yours. Halfway her candles stride half again as far.
 */

const ID = fallenId('grave', 'corpse-candles');
const TOUCH = 30;
const BURN = 12;
const SLOW_MS = 900;
const GRACE_MS = 650;

type Side = 'player' | 'npc';
interface Candle {
  x: number; y: number; home: Pt; owner: Side; lit: boolean; litAt: number; relightAt: number;
  vx: number; vy: number; outAt: number; seed: number; handle: StrikeTarget;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const last = { player: { x: player.x, y: player.y }, npc: { x: npc.x, y: npc.y } };
  let npcSlowUntil = 0;
  let wild = false;
  let started = false;

  const homes: [Pt, Side][] = [
    [{ x: 120, y: top + 70 }, 'player'], [{ x: 120, y: H - 60 }, 'player'],
    [{ x: W - 120, y: top + 70 }, 'npc'], [{ x: W - 120, y: H - 60 }, 'npc'],
  ];
  const candles: Candle[] = homes.map(([home, owner], i) => {
    const c: Candle = {
      x: home.x, y: home.y - 30, home, owner, lit: true, litAt: 0, relightAt: 0, vx: 0, vy: 0, outAt: -9999, seed: i * 1.7,
      handle: ctx.target({
        x: home.x, y: home.y - 30, r: 16, passThrough: true,
        onStruck: (by) => {
          if (!c.lit || c.owner === by) return;
          c.owner = by;
          ctx.flash(c.x, c.y, by === 'player' ? WISP : LAMP);
          ctx.sfx('blink');
        },
      }),
    };
    return c;
  });
  const fighter = (s: Side): Fighter => (s === 'player' ? player : npc);
  const stride = (c: Candle) => (c.owner === 'npc' && wild ? 1.5 : 1);
  const relightMs = () => (wild ? 2700 : 3500);

  function gutter(c: Candle, time: number, f: Fighter): void {
    c.lit = false; c.outAt = time; c.relightAt = time + relightMs();
    ctx.hit(f, BURN, c.x, c.y);
    if (f === player) tk.slowPlayer(0.6, SLOW_MS); else npcSlowUntil = time + SLOW_MS;
    ctx.sfx('sizzle');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; ctx.banner('YOUR CANDLES WALK AS YOUR MIRROR', '#b8f0d8'); }
      if (!wild && npc.hp < npc.maxHp * 0.5) { wild = true; ctx.banner('HER LIGHTS STRIDE LONGER', '#ffc66a'); ctx.sfx('wings'); }
      // Each owner's step this frame, capped to a run so a blink or a shove doesn't fling the lights.
      const step: Record<Side, Pt> = { player: { x: 0, y: 0 }, npc: { x: 0, y: 0 } };
      for (const s of ['player', 'npc'] as Side[]) {
        const f = fighter(s);
        let dx = f.x - last[s].x, dy = f.y - last[s].y;
        const m = Math.hypot(dx, dy), cap = 260 * Math.max(dt, 0.001);
        if (m > cap) { dx *= cap / m; dy *= cap / m; }
        step[s] = { x: dx, y: dy };
        last[s] = { x: f.x, y: f.y };
      }
      for (const c of candles) {
        if (!c.lit) {
          const blocked = [player, npc].some((f) => alive(f) && dist(f.x, f.y, c.home.x, c.home.y) < 60);
          if (time >= c.relightAt && !blocked) {
            c.lit = true; c.litAt = time; c.x = c.home.x; c.y = c.home.y - 30;
            c.handle.moveTo(c.x, c.y);
            ctx.sfx('fireball');
          }
          continue;
        }
        const st = step[c.owner], k = stride(c);
        c.vx = -st.x * k; c.vy = -st.y * k;
        c.x = clamp(c.x + c.vx, 40, W - 40); c.y = clamp(c.y + c.vy, top + 30, H - 30);
        c.handle.moveTo(c.x, c.y);
        if (time - c.litAt < GRACE_MS) continue;
        for (const f of [player, npc]) {
          if (!alive(f) || ctx.isAirborne(f) || dist(f.x, f.y - 10, c.x, c.y) > TOUCH) continue;
          gutter(c, time, f);
          break;
        }
      }
    },

    npcSpeedMult() { return ctx.scene.time.now < npcSlowUntil ? 0.6 : 1; },

    npcSeek(): Pt | null {
      // Walk away from where she wants her light to go — but never toward one of her own.
      const mine = candles.filter((c) => c.lit && c.owner === 'npc');
      if (mine.length && alive(player)) {
        let best = mine[0];
        for (const c of mine) if (dist(c.x, c.y, player.x, player.y) < dist(best.x, best.y, player.x, player.y)) best = c;
        const d = Math.max(1, dist(best.x, best.y, player.x, player.y));
        const ux = (player.x - best.x) / d, uy = (player.y - best.y) / d;
        let tx = npc.x - ux * 120, ty = npc.y - uy * 120;
        // Moving that way pulls her other candles toward her: sidestep if one is close.
        for (const c of mine) {
          if (c !== best && dist(c.x, c.y, npc.x, npc.y) < 90) { tx = npc.x + uy * 120; ty = npc.y - ux * 120; }
        }
        return { x: clamp(tx, 50, W - 50), y: clamp(ty, top + 40, H - 40) };
      }
      const theirs = candles.filter((c) => c.lit && c.owner === 'player' && dist(c.x, c.y, npc.x, npc.y) < 280);
      if (theirs.length) { const c = theirs[0]; const a = Math.atan2(npc.y - c.y, npc.x - c.x); return { x: c.x + Math.cos(a) * 50, y: c.y + Math.sin(a) * 50 }; }
      return null;
    },

    drawGround(g, time) {
      for (const c of candles) drawPricket(g, c, time);
      for (const c of candles) {
        if (!c.lit) continue;
        const col = c.owner === 'player' ? WISP : LAMP;
        glow(g, c.x, c.y + 26, 34, col, 0.05, 3);
        g.fillStyle(0x000000, 0.18); g.fillEllipse(c.x, c.y + 30, 18, 5);
        // Which way it is drifting: a faint chevron ahead of it.
        const m = Math.hypot(c.vx, c.vy);
        if (m > 0.2) {
          const a = Math.atan2(c.vy, c.vx);
          g.lineStyle(2, col, 0.35);
          g.lineBetween(c.x + Math.cos(a) * 26, c.y + 26 + Math.sin(a) * 26, c.x + Math.cos(a + 2.5) * 16, c.y + 26 + Math.sin(a + 2.5) * 16);
          g.lineBetween(c.x + Math.cos(a) * 26, c.y + 26 + Math.sin(a) * 26, c.x + Math.cos(a - 2.5) * 16, c.y + 26 + Math.sin(a - 2.5) * 16);
        }
      }
    },

    drawAir(g, time) {
      for (const c of candles) {
        if (c.lit) drawFlame(g, c, time);
        const since = time - c.outAt;
        if (!c.lit && since < 600) {
          const k = since / 600;
          const col = c.owner === 'player' ? WISP : LAMP;
          g.lineStyle(3, col, 1 - k); g.strokeCircle(c.x, c.y, 8 + k * 40);
          for (let i = 0; i < 7; i++) {
            const a = i * 0.9 + c.seed;
            g.fillStyle(i % 2 ? col : BONE_LIT, 1 - k);
            g.fillCircle(c.x + Math.cos(a) * k * 36, c.y + Math.sin(a) * k * 26 - k * 20, 2.4);
          }
        }
      }
    },

    drawHud(g, time) {
      const y = top + 16;
      const plate = (x: number, s: Side, col: number) => {
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 10, y - 12, 110, 24, 7);
        g.fillStyle(s === 'player' ? GREY_LIT : LAMP, 1); g.fillCircle(x, y, 5);
        const owned = candles.filter((c) => c.owner === s);
        owned.forEach((c, i) => {
          const fx = x + 20 + i * 18;
          if (c.lit) {
            g.fillStyle(col, 0.9); g.fillTriangle(fx - 4, y + 3, fx + 4, y + 3, fx, y - 8 + Math.sin(time / 120 + i) * 1.5);
            g.fillStyle(LAMP_HOT, 1); g.fillCircle(fx, y, 2);
          } else { g.lineStyle(1.2, dim(col, 0.4), 1); g.strokeCircle(fx, y, 4); }
        });
      };
      plate(W / 2 - 124, 'player', WISP);
      plate(W / 2 + 24, 'npc', LAMP);
    },

    destroy() { for (const c of candles) c.handle.remove(); },
  };
}

/** An iron pricket: a three-footed stand with a spike for a candle, wax run down it in ropes. */
function drawPricket(g: G, c: Candle, time: number): void {
  const { x, y } = c.home;
  shadow(g, x + 3, y + 2, 34, 9, 0.3);
  for (const k of [-1, 0, 1]) { g.lineStyle(2.5, IRON, 1); g.lineBetween(x, y - 20, x + k * 14, y + (k ? 0 : 4)); }
  g.fillStyle(IRON, 1); g.fillRect(x - 2, y - 40, 4, 22);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 2, y - 40, 1.5, 22);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y - 40, 22, 6);
  g.fillStyle(RUST, 0.7); g.fillCircle(x + 4, y - 30, 1.5);
  // Wax ropes down the stem and a stub on the spike.
  g.fillStyle(BONE, 1); g.fillRect(x - 4, y - 50, 8, 10);
  g.fillStyle(dim(BONE, 0.15), 1); g.fillRect(x + 1, y - 40, 3, 14); g.fillRect(x - 3, y - 38, 2, 8);
  if (!c.lit) {
    const k = clamp(1 - (c.relightAt - time) / 3500, 0, 1);
    g.fillStyle(c.owner === 'player' ? WISP_DIM : dim(LAMP, 0.3), 0.3 + k * 0.5); g.fillCircle(x, y - 54, 2 + k * 2);
  }
}

/**
 * A corpse-candle: a flame walking on nothing, cupped in a faint bony hand, its halo the owner's
 * colour, wax drops falling from a candle that is not there, sparks thrown behind as it moves.
 */
function drawFlame(g: G, c: Candle, time: number): void {
  const col = c.owner === 'player' ? WISP : LAMP;
  const bob = Math.sin(time / 260 + c.seed) * 3;
  const x = c.x, y = c.y + bob;
  glow(g, x, y, 30, col, 0.08, 4);
  // The cupping hand: palm and four thin fingers, barely there.
  g.fillStyle(GREY_LIT, 0.28); g.fillEllipse(x, y + 10, 18, 8);
  for (let i = 0; i < 4; i++) { g.lineStyle(2, GREY_LIT, 0.3); g.lineBetween(x - 7 + i * 4.5, y + 9, x - 9 + i * 5.5, y + 1 - (i === 1 || i === 2 ? 2 : 0)); }
  // The flame: outer, inner, white core, flickering tip.
  const f = Math.sin(time / 70 + c.seed) * 2;
  g.fillStyle(col, 0.85); g.fillTriangle(x - 7, y + 4, x + 7, y + 4, x + f, y - 20);
  g.fillEllipse(x, y + 2, 14, 10);
  g.fillStyle(lit(col, 0.5), 1); g.fillTriangle(x - 4, y + 3, x + 4, y + 3, x + f * 0.6, y - 12);
  g.fillStyle(LAMP_HOT, 1); g.fillEllipse(x, y + 2, 5, 7);
  // Wax drops falling, and sparks thrown behind its drift.
  for (let i = 0; i < 2; i++) {
    const k = ((time / 900) + i / 2 + c.seed) % 1;
    g.fillStyle(BONE, 0.7 * (1 - k)); g.fillCircle(x + (i ? 3 : -3), y + 12 + k * 18, 1.6);
  }
  const m = Math.hypot(c.vx, c.vy);
  if (m > 0.2) {
    for (let i = 1; i <= 4; i++) {
      g.fillStyle(col, 0.5 - i * 0.1);
      g.fillCircle(x - (c.vx / m) * i * 7 + Math.sin(time / 90 + i) * 2, y - (c.vy / m) * i * 7, 2.2 - i * 0.3);
    }
  }
}

export const FALLEN_CORPSE_CANDLES: GimmickDef = {
  id: ID,
  rules: 'Your candles move as your mirror: step one way and they drift the other. A touch bursts one on whoever it meets. Strike one of hers to make it yours.',
  make,
};
