import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, mixC, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRASS, SOOT, WAX_OLD, WICK, dist, flame, smokeCurl } from '../art';

/**
 * The Rendering — Renderer Suet, who in the King's telling boils down "what the court has no more
 * use for" into the cheap tallow the poor must burn for the tithe.
 *
 * Suet flings ladles of hot tallow across the yard. Each lands as a greasy slick, and a slick is
 * slippery: whoever walks on it keeps sliding the way they were going and stops late. Three tall
 * yard-tapers stand about the floor. Strike one and it topples away from you, its flame landing
 * two strides off; a flame that lands in tallow lights it, and fire runs from slick to touching
 * slick after a catching flicker. The exploit: the bot skates as badly as you do — catch it on a
 * slick, topple a taper toward it from the far side. Halfway, the vat tips: tallow comes faster
 * and every third ladle arrives already alight.
 */

const FLING_MS = 2500;
const FLING_LATE_MS = 1900;
const FLIGHT_MS = 850;
const SPLASH_R = 30;
const SPLASH_DAMAGE = 7;
const SLICK_R = 54;
const SLICK_MAX_R = 86;
const SLICK_LIFE_MS = 15000;
const MAX_SLICKS = 8;
const CATCH_MS = 620;
const BURN_MS = 2400;
const BURN_TICK_MS = 450;
const BURN_DAMAGE = 8;
const TOPPLE_LEN = 118;
const TOPPLE_MS = 380;
const TOPPLE_DAMAGE = 11;
const RESTAND_MS = 6500;
const SLIDE_GAIN = 0.6;

/** Tallow in flight from Suet's ladle. */
interface Fling { fx: number; fy: number; x: number; y: number; bornAt: number; landAt: number; lit: boolean }
/** A slick on the floor, from greasy through catching to burning. */
interface Slick { x: number; y: number; r: number; dieAt: number; catchAt: number; seed: number }
/** A yard-taper: standing (a strike target) or lying where it fell. */
interface Taper { home: Pt; target: StrikeTarget | null; fellAt: number; dir: number; standAt: number }
/** A fighter's slide state: momentum, the last position seen, and the last shove we gave it. */
interface Skid { mx: number; my: number; px: number; py: number; nx: number; ny: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const fieldTop = top + 30;
  let flings: Fling[] = [];
  let slicks: Slick[] = [];
  let nextFlingAt = 1500;
  let flingCount = 0;
  let tipped = false;
  let announced = false;
  let nextTickAt = 0;
  const skids = new Map<Fighter, Skid>();

  const burning = (s: Slick, t: number): boolean => s.catchAt > 0 && t >= s.catchAt + CATCH_MS;
  const catching = (s: Slick, t: number): boolean => s.catchAt > 0 && t < s.catchAt + CATCH_MS;
  const onSlick = (f: Fighter, t: number): Slick | undefined =>
    slicks.find((s) => !burning(s, t) && dist(s.x, s.y, f.x, f.y) < s.r * 0.92);

  const ignite = (s: Slick, time: number): void => {
    if (s.catchAt > 0) return;
    s.catchAt = time;
    s.dieAt = time + CATCH_MS + BURN_MS;
    ctx.sfx('sizzle');
  };

  const tapers: Taper[] = [
    { x: W * 0.24, y: fieldTop + (H - fieldTop) * 0.34 },
    { x: W * 0.76, y: fieldTop + (H - fieldTop) * 0.34 },
    { x: W * 0.5, y: fieldTop + (H - fieldTop) * 0.8 },
  ].map((home) => ({ home, target: null, fellAt: 0, dir: 0, standAt: 0 }));

  const stand = (tp: Taper): void => {
    tp.fellAt = 0;
    tp.target = ctx.target({
      x: tp.home.x, y: tp.home.y - 30, r: 24,
      onStruck(by) {
        if (!tp.target) return;
        const s = by === 'player' ? ctx.player : ctx.npc;
        tp.dir = Math.atan2(tp.home.y - s.y, tp.home.x - s.x);
        tp.fellAt = ctx.scene.time.now;
        tp.standAt = tp.fellAt + RESTAND_MS;
        tp.target.remove();
        tp.target = null;
        ctx.sfx('whoosh');
        ctx.tk.schedule(TOPPLE_MS, () => landFlame(tp));
      },
    });
  };
  tapers.forEach(stand);

  const flamePoint = (tp: Taper): Pt => ({
    x: tp.home.x + Math.cos(tp.dir) * TOPPLE_LEN, y: tp.home.y + Math.sin(tp.dir) * TOPPLE_LEN,
  });

  const landFlame = (tp: Taper): void => {
    const p = flamePoint(tp), now = ctx.scene.time.now;
    ctx.sfx('flame-burst');
    for (const f of [ctx.player, ctx.npc]) {
      if (f.active && f.hp > 0 && dist(p.x, p.y, f.x, f.y) < 34 + 10) ctx.hit(f, TOPPLE_DAMAGE, p.x, p.y);
    }
    for (const s of slicks) if (dist(s.x, s.y, p.x, p.y) < s.r + 16) ignite(s, now);
  };

  const landFling = (fl: Fling, time: number): void => {
    ctx.sfx('oil-splash');
    for (const f of [ctx.player, ctx.npc]) {
      if (f.active && f.hp > 0 && dist(fl.x, fl.y, f.x, f.y) < SPLASH_R + 12) ctx.hit(f, SPLASH_DAMAGE, fl.x, fl.y);
    }
    let s = slicks.find((o) => o.catchAt === 0 && dist(o.x, o.y, fl.x, fl.y) < o.r);
    if (s) { s.r = Math.min(SLICK_MAX_R, s.r + 10); s.dieAt = time + SLICK_LIFE_MS; }
    else {
      while (slicks.length >= MAX_SLICKS) slicks.shift();
      s = { x: fl.x, y: fl.y, r: SLICK_R, dieAt: time + SLICK_LIFE_MS, catchAt: 0, seed: rng() * 10 };
      slicks.push(s);
    }
    if (fl.lit) ignite(s, time);
  };

  /** Momentum on the grease: the walk carries on after the feet stop. */
  const slide = (f: Fighter, dt: number, time: number): void => {
    let k = skids.get(f);
    if (!k) { k = { mx: 0, my: 0, px: f.x, py: f.y, nx: 0, ny: 0 }; skids.set(f, k); }
    const vx = (f.x - k.px - k.nx) / Math.max(dt, 0.001), vy = (f.y - k.py - k.ny) / Math.max(dt, 0.001);
    k.nx = 0; k.ny = 0;
    if (onSlick(f, time) && Math.hypot(vx, vy) < 600) {
      // Walking feeds the skid; standing still lets it bleed off only slowly.
      const moving = Math.hypot(vx, vy) > 30;
      const a = Math.min(1, dt * (moving ? 2.2 : 0.9));
      k.mx += ((moving ? vx : 0) - k.mx) * a;
      k.my += ((moving ? vy : 0) - k.my) * a;
      const dx = k.mx * SLIDE_GAIN * dt, dy = k.my * SLIDE_GAIN * dt;
      ctx.nudge(f, dx, dy);
      k.nx = dx; k.ny = dy;
    } else {
      const d = Math.max(0, 1 - dt * 7);
      k.mx *= d; k.my *= d;
    }
    k.px = f.x; k.py = f.y;
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('MIND THE TALLOW — MIND THE TAPERS', '#f0dca0'); }
      if (!tipped && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        tipped = true;
        ctx.banner('THE VAT TIPS', '#ffb070');
        ctx.sfx('boss-phase');
      }
      if (time >= nextFlingAt) {
        nextFlingAt = time + (tipped ? FLING_LATE_MS : FLING_MS) * (0.85 + rng() * 0.3);
        flingCount++;
        const p = ctx.player, n = ctx.npc;
        const x = Math.max(70, Math.min(W - 70, p.x + (rng() - 0.5) * 120));
        const y = Math.max(fieldTop + 30, Math.min(H - 60, p.y + (rng() - 0.5) * 90));
        flings.push({ fx: n.x, fy: n.y - 20, x, y, bornAt: time, landAt: time + FLIGHT_MS, lit: tipped && flingCount % 3 === 0 });
        ctx.sfx('whip');
      }
      for (const fl of flings) if (time >= fl.landAt) landFling(fl, time);
      flings = flings.filter((fl) => time < fl.landAt);

      // Fire spreads to every slick touching one that has caught.
      for (const s of slicks) {
        if (!burning(s, time)) continue;
        for (const o of slicks) if (o.catchAt === 0 && dist(s.x, s.y, o.x, o.y) < s.r + o.r - 8) ignite(o, time);
      }
      if (time >= nextTickAt) {
        nextTickAt = time + BURN_TICK_MS;
        for (const f of [ctx.player, ctx.npc]) {
          if (!f.active || f.hp <= 0) continue;
          if (slicks.some((s) => burning(s, time) && dist(s.x, s.y, f.x, f.y) < s.r * 0.9)) ctx.hit(f, BURN_DAMAGE, f.x, f.y);
        }
      }
      slicks = slicks.filter((s) => time < s.dieAt);
      for (const tp of tapers) if (!tp.target && tp.fellAt > 0 && time >= tp.standAt) stand(tp);
      slide(ctx.player, dt, time);
      slide(ctx.npc, dt, time);
    },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player, t = ctx.scene.time.now;
      // Fire under him, or about to be: off the grease.
      const hot = slicks.find((s) => s.catchAt > 0 && dist(s.x, s.y, n.x, n.y) < s.r + 24);
      if (hot) {
        const a = Math.atan2(n.y - hot.y, n.x - hot.x);
        return { x: hot.x + Math.cos(a) * (hot.r + 70), y: hot.y + Math.sin(a) * (hot.r + 70) };
      }
      // The player on unlit grease: get behind a standing taper so his blow tips it onto them.
      const s = onSlick(p, t);
      if (s && s.catchAt === 0) {
        for (const tp of tapers) {
          if (!tp.target) continue;
          const d = dist(tp.home.x, tp.home.y, s.x, s.y);
          if (d < 40 || d > TOPPLE_LEN + s.r * 0.8) continue;
          const a = Math.atan2(tp.home.y - s.y, tp.home.x - s.x);
          return { x: tp.home.x + Math.cos(a) * 58, y: tp.home.y + Math.sin(a) * 58 };
        }
      }
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      for (const s of slicks) {
        const fade = Math.min(1, (s.dieAt - time) / 700);
        tallowSlick(g, s, t, fade, catching(s, time), burning(s, time));
      }
      // Landing marks for flings in the air: a greasy ring, red-rimmed if the ladle is alight.
      for (const fl of flings) {
        const k = Math.min(1, (time - fl.bornAt) / FLIGHT_MS);
        g.fillStyle(0x000000, 0.1 + k * 0.25); g.fillEllipse(fl.x, fl.y, SPLASH_R * 2.2, SPLASH_R * 1.3);
        g.lineStyle(2, fl.lit ? 0xff6a2a : WAX_OLD, 0.4 + k * 0.5); g.strokeEllipse(fl.x, fl.y, SPLASH_R * 2, SPLASH_R * 1.2);
      }
      // Toppling and fallen tapers lie on the floor; the flame-landing spot shows while it falls.
      for (const tp of tapers) {
        if (tp.target || tp.fellAt === 0) continue;
        const k = Math.min(1, (time - tp.fellAt) / TOPPLE_MS);
        const p = flamePoint(tp);
        if (k < 1) { g.lineStyle(2, 0xff8a3a, 0.8); g.strokeEllipse(p.x, p.y, 88, 52); }
        if (k >= 1) yardTaper(g, tp.home.x, tp.home.y, t, tp.dir, 1, time >= tp.standAt - 900);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const tp of tapers) {
        if (tp.target) yardTaper(g, tp.home.x, tp.home.y, t, 0, 0, false);
        else if (tp.fellAt > 0 && time - tp.fellAt < TOPPLE_MS) {
          yardTaper(g, tp.home.x, tp.home.y, t, tp.dir, (time - tp.fellAt) / TOPPLE_MS, false);
        }
      }
      // Ladles of tallow arcing over: a fat dollop with a grease trail, alight if late in the fight.
      for (const fl of flings) {
        const k = Math.min(1, (time - fl.bornAt) / FLIGHT_MS);
        const x = fl.fx + (fl.x - fl.fx) * k, y = fl.fy + (fl.y - fl.fy) * k - Math.sin(k * Math.PI) * 120;
        g.fillStyle(dim(WAX_OLD, 0.2), 0.5); g.fillCircle(x - (fl.x - fl.fx) * 0.03, y + 4, 7);
        g.fillStyle(mixC(WAX_OLD, 0xf4e8c0, 0.4), 1); g.fillEllipse(x, y, 18, 14);
        g.fillStyle(0xffffff, 0.5); g.fillEllipse(x - 3, y - 3, 6, 3);
        if (fl.lit) flame(g, x, y - 4, 6, t, 4, 0.05);
      }
      // Grease on the boots: a smear and a wobble over whoever is sliding.
      for (const f of [ctx.player, ctx.npc]) {
        const k = skids.get(f);
        if (!k || Math.hypot(k.mx, k.my) < 40) continue;
        const a = Math.atan2(k.my, k.mx);
        g.lineStyle(3, mixC(WAX_OLD, 0xffffff, 0.3), 0.5);
        g.lineBetween(f.x - Math.cos(a) * 26, f.y + 16 - Math.sin(a) * 10, f.x - Math.cos(a) * 46, f.y + 16 - Math.sin(a) * 18);
      }
    },

    drawHud(g, time) {
      // Three taper pips top-right: lit and standing, or lying down with a re-stand clock.
      const x0 = W - 120, y0 = 72;
      tapers.forEach((tp, i) => {
        const x = x0 + i * 34;
        g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x - 13, y0 - 34, 26, 40, 5);
        if (tp.target) {
          g.fillStyle(WAX_OLD, 1); g.fillRect(x - 3, y0 - 22, 6, 24);
          flame(g, x, y0 - 23, 3.2, time / 1000, i, 0);
        } else {
          g.fillStyle(dim(WAX_OLD, 0.3), 1); g.fillRect(x - 11, y0 - 2, 22, 5);
          const k = Math.max(0, Math.min(1, 1 - (tp.standAt - time) / RESTAND_MS));
          g.lineStyle(2, BRASS, 0.8); g.beginPath(); g.arc(x, y0 - 16, 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
        }
      });
      if (tipped) {
        // The tipped vat: a little iron pot on its side spilling.
        g.fillStyle(SOOT, 1); g.fillEllipse(x0 - 40, y0 - 10, 26, 20);
        g.fillStyle(WAX_OLD, 1); g.fillEllipse(x0 - 28, y0 - 4, 14, 6);
      }
    },

    destroy() {
      for (const tp of tapers) tp.target?.remove();
      slicks = []; flings = [];
    },
  };
}

/** A tallow slick: an opaque, greasy, lumpy spread with a dull sheen — then blue flicker, then fire. */
function tallowSlick(g: Phaser.GameObjects.Graphics, s: Slick, t: number, fade: number, catching: boolean, burning: boolean): void {
  const base = burning ? mixC(WAX_OLD, SOOT, 0.55) : mixC(WAX_OLD, 0xe8dcb0, 0.35);
  g.fillStyle(dim(base, 0.35), 0.45 * fade); g.fillEllipse(s.x + 3, s.y + 4, s.r * 2.05, s.r * 1.38);
  // A lumpy ten-sided spread, traced by hand so the edge is never a clean ellipse.
  g.fillStyle(base, 0.88 * fade);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const k = 0.84 + Math.sin(s.seed * 2.3 + i * 1.7) * 0.14;
    const px = s.x + Math.cos(a) * s.r * k, py = s.y + Math.sin(a) * s.r * 0.66 * k;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
  g.fillPath();
  // Congealed lumps and the greasy sheen that marks it as slippery.
  for (let i = 0; i < 5; i++) {
    const a = s.seed + i * 1.3, rr = s.r * (0.2 + ((i * 37) % 10) / 20);
    g.fillStyle(lit(base, 0.12), 0.8 * fade); g.fillEllipse(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr * 0.6, 9, 5);
  }
  if (!burning) {
    const sh = (t * 0.35 + s.seed) % 1;
    g.lineStyle(2, 0xffffff, 0.22 * fade); g.strokeEllipse(s.x - s.r * 0.15, s.y - s.r * 0.12, s.r * (0.6 + sh * 0.5), s.r * 0.22);
  }
  if (catching) {
    // Little blue tongues racing round the rim before it goes up.
    for (let i = 0; i < 7; i++) {
      const a = t * 5 + i * 0.9;
      const x = s.x + Math.cos(a) * s.r * 0.8, y = s.y + Math.sin(a) * s.r * 0.52;
      g.fillStyle(0x6aa8ff, 0.7); g.fillTriangle(x - 3, y, x + 3, y, x, y - 9);
    }
    g.lineStyle(2, 0xff8a3a, 0.5 + Math.sin(t * 30) * 0.3); g.strokeEllipse(s.x, s.y, s.r * 2, s.r * 1.32);
  }
  if (burning) {
    g.fillStyle(0xff7a1e, 0.18); g.fillEllipse(s.x, s.y, s.r * 2.1, s.r * 1.4);
    const n = Math.max(4, Math.round(s.r / 11));
    for (let i = 0; i < n; i++) {
      const a = s.seed + i * 2.4, rr = s.r * 0.62 * (((i * 53) % 10) / 10);
      flame(g, s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr * 0.62 + 4, 7 + (i % 3) * 2, t, i + s.seed, 0);
    }
    smokeCurl(g, s.x, s.y - 18, t, 0.3, 50);
  }
}

/**
 * A yard-taper: a man-high dirty tallow candle in an iron spike-stand. `fall` 0→1 swings it down
 * along `dir`; lying down, it shows its spilled flame at the tip and, `rising`, a hand-crank twitch.
 */
function yardTaper(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, dir: number, fall: number, rising: boolean): void {
  // The iron stand stays put.
  shadow(g, x, y + 2, 34, 10, 0.32);
  g.fillStyle(0x2a2420, 1); g.fillEllipse(x, y, 30, 10);
  g.lineStyle(3, 0x2a2420, 1); g.lineBetween(x - 12, y, x - 4, y - 14); g.lineBetween(x + 12, y, x + 4, y - 14);
  const len = 64;
  const lean = fall * fall * (Math.PI / 2);
  // The candle's axis rotates from straight up toward `dir` (drawn in the floor plane as it lands).
  const ux = Math.cos(dir) * Math.sin(lean), uy = -Math.cos(lean) + Math.sin(dir) * Math.sin(lean) * 0.6;
  const bx = x, by = y - 14;
  const tx = bx + ux * len, ty = by + uy * len;
  const px = -uy, py = ux;
  const half = 7;
  g.fillStyle(dim(WAX_OLD, 0.25), 1);
  g.fillTriangle(bx + px * half, by + py * half, bx - px * half, by - py * half, tx - px * half, ty - py * half);
  g.fillTriangle(bx + px * half, by + py * half, tx + px * half, ty + py * half, tx - px * half, ty - py * half);
  g.lineStyle(4, WAX_OLD, 1); g.lineBetween(bx + px * 2, by + py * 2, tx + px * 2, ty + py * 2);
  g.lineStyle(1.5, lit(WAX_OLD, 0.3), 0.8); g.lineBetween(bx + px * 4, by + py * 4, tx + px * 4, ty + py * 4);
  // Runs of melted tallow down its side.
  for (let i = 1; i < 4; i++) {
    const k = i / 4;
    g.fillStyle(lit(WAX_OLD, 0.15), 1); g.fillCircle(bx + ux * len * k + px * half, by + uy * len * k + py * half, 2.4);
  }
  g.lineStyle(2, WICK, 1); g.lineBetween(tx, ty, tx + ux * 6, ty + uy * 6);
  if (fall < 1) flame(g, tx + ux * 6, ty + uy * 6, 7, t, x, 0.06);
  else { g.fillStyle(SOOT, 0.6); g.fillCircle(tx + ux * 8, ty + uy * 8, 5); }
  if (rising) { g.lineStyle(1.5, BRASS, 0.7); g.strokeCircle(x, y - 6, 12 + Math.sin(t * 12) * 2); }
}

export const RENDERING: GimmickDef = {
  id: fallenId('candlewick', 'rendering'),
  rules: 'Tallow slicks are slippery. Strike a yard-taper and it falls away from you — a flame in tallow sets every touching slick alight.',
  make,
};
