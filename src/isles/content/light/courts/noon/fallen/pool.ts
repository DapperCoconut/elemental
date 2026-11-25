import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, mixC, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { glint, sunburst } from '../art';
import {
  BEAM_HOT, CLEAR_EDGE, FISH_SHADE, GLASS_EDGE, GOLD, GOLD_DARK, GOLD_LIT, MARBLE, MARBLE_DARK, MARBLE_LIT, POOL,
  POOL_DEEP, POOL_GLINT, SUN,
} from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Drawn in the Water — Ondine Pellow, Skimmer of the Reflecting Pool.
 *
 * In the waking world Ondine skims the leaves off the reflecting pool at dawn that never comes.
 * In the star's telling she skims it so it stays a perfect mirror, and reads in it what nobody
 * will say to her face: the pool is too bright to look into, so the square looks at *her*.
 *
 * A long channel of still water runs across the yard, and both fighters have a double in it: the
 * same body, mirrored across the water's axis, walking the far bank upside down. Whenever a
 * fighter casts, their double gathers a glint and, a beat later, looses a sunbolt at the other
 * fighter's real body. Stand on her double and her bolts leave the water at your feet — and,
 * because a mirror is a mirror, your own double is then standing on her.
 *
 * The exploit is the water itself. Strike her double and the surface shivers: it breaks up into
 * rings and cannot cast for a few seconds. Halfway down she opens the cross-channel, and each of
 * you has a second double mirrored side to side.
 */

const ID = fallenId('noon', 'pool');
const CH_HALF = 30;
const GATHER_MS = 520;
const REFIRE_MS = 820;
const RIPPLE_MS = 4600;
const BOLT_SPEED = 360;
const DMG_PLAYER = 10;
const DMG_NPC = 13;

type Axis = 'h' | 'v';
type Side = 'player' | 'npc';

interface Double {
  owner: Side;
  axis: Axis;
  x: number;
  y: number;
  rippleUntil: number;
  gatherAt: number;
  lastFire: number;
  target: StrikeTarget | null;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const MID = (top + H) / 2;
  const CX = W / 2;
  const doubles: Double[] = [];
  let cross = false;
  let started = false;

  const body = (s: Side): Fighter => (s === 'player' ? player : npc);
  const foeOf = (s: Side): Fighter => (s === 'player' ? npc : player);

  /** Where a fighter's double stands across one axis of the water. */
  const mirror = (f: Fighter, axis: Axis): Pt =>
    axis === 'h' ? { x: f.x, y: clamp(2 * MID - f.y, top + 10, H - 10) } : { x: clamp(2 * CX - f.x, 10, W - 10), y: f.y };

  function addDouble(owner: Side, axis: Axis): void {
    const p = mirror(body(owner), axis);
    const d: Double = { owner, axis, x: p.x, y: p.y, rippleUntil: 0, gatherAt: -1, lastFire: -1e9, target: null };
    d.target = ctx.target({
      x: p.x, y: p.y - 20, r: 24, passThrough: true,
      onStruck(by) {
        // Only the other side's double shivers when struck; your own hand passes through yours.
        if (by === d.owner || tk.now < d.rippleUntil) return;
        d.rippleUntil = tk.now + RIPPLE_MS;
        d.gatherAt = -1;
        ctx.sfx('splash');
        ctx.flash(d.x, d.y, POOL_GLINT);
      },
    });
    doubles.push(d);
  }

  function cast(side: Side): void {
    const t = tk.now;
    for (const d of doubles) {
      if (d.owner !== side || t < d.rippleUntil || d.gatherAt >= 0 || t - d.lastFire < REFIRE_MS) continue;
      d.gatherAt = t;
      ctx.sfx('bubble');
    }
  }

  function loose(d: Double): void {
    const foe = foeOf(d.owner);
    d.gatherAt = -1;
    d.lastFire = tk.now;
    if (!alive(foe)) return;
    const a = Math.atan2(foe.y - 20 - d.y, foe.x - d.x);
    tk.spawnBullet({
      x: d.x, y: d.y, angle: a, speed: BOLT_SPEED, r: 7, lifeMs: 3200,
      damage: d.owner === 'npc' ? DMG_PLAYER : DMG_NPC,
      color: d.owner === 'npc' ? GOLD_LIT : 0xbfe8ff,
      hits: [foe],
    });
    ctx.sfx('light-beam');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; addDouble('player', 'h'); addDouble('npc', 'h'); }
      if (!cross && npc.hp < npc.maxHp * 0.5) {
        cross = true;
        addDouble('player', 'v'); addDouble('npc', 'v');
        ctx.banner('THE CROSS-CHANNEL OPENS', '#dcf2fb');
        ctx.sfx('geyser');
      }
      for (const d of doubles) {
        const p = mirror(body(d.owner), d.axis);
        d.x = p.x; d.y = p.y;
        d.target?.moveTo(p.x, p.y - 20);
        if (d.gatherAt >= 0 && time - d.gatherAt >= GATHER_MS) loose(d);
      }
    },

    onPlayerCast() { cast('player'); },
    onNpcCast() { cast('npc'); },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // She wants her double close enough to you that its bolts are short, never on top of you,
      // and she steps off the line of any double of yours that is gathering.
      let best: Pt | null = null, bs = -Infinity;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const x = tk.clampX(player.x + Math.cos(a) * 240, 60), y = tk.clampY(player.y + Math.sin(a) * 200, 50);
        const imgY = clamp(2 * MID - y, top + 10, H - 10);
        const dImg = dist(x, imgY, player.x, player.y);
        let s = -Math.abs(dImg - 190) - dist(x, y, npc.x, npc.y) * 0.25;
        if (Math.abs(y - MID) < CH_HALF + 20) s -= 60;
        for (const d of doubles) {
          if (d.owner !== 'player' || d.gatherAt < 0) continue;
          if (segDist(x, y, d.x, d.y, npc.x, npc.y) < 70) s -= 140;
        }
        if (s > bs) { bs = s; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      drawChannel(g, 40, MID - CH_HALF, W - 80, CH_HALF * 2, time, true);
      if (cross) drawChannel(g, CX - CH_HALF, top + 14, CH_HALF * 2, H - top - 28, time, false);
      // The doubles: mirrored, see-through, walking the far bank.
      for (const d of doubles) {
        const tint = d.owner === 'npc' ? 0xffb35a : 0x9fd8ff;
        if (tk.now < d.rippleUntil) {
          const k = (d.rippleUntil - tk.now) / RIPPLE_MS;
          for (let i = 0; i < 3; i++) {
            const r = 10 + ((time / 9 + i * 14) % 42);
            g.lineStyle(1.5, tint, 0.45 * k * (1 - r / 52)); g.strokeEllipse(d.x, d.y, r * 2, r * 0.9);
          }
          continue;
        }
        drawDouble(g, d.x, d.y, d.axis, d.owner === 'player' ? player : npc, tint, time);
        if (d.gatherAt >= 0) {
          const k = clamp((tk.now - d.gatherAt) / GATHER_MS, 0, 1);
          const foe = foeOf(d.owner);
          g.lineStyle(1.5, tint, 0.2 + k * 0.5);
          const steps = 14;
          for (let s = 0; s < steps; s += 2) {
            const a0 = s / steps, a1 = (s + 1) / steps;
            g.lineBetween(d.x + (foe.x - d.x) * a0, d.y + (foe.y - 20 - d.y) * a0, d.x + (foe.x - d.x) * a1, d.y + (foe.y - 20 - d.y) * a1);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const d of doubles) {
        if (d.gatherAt < 0 || tk.now < d.rippleUntil) continue;
        const k = clamp((tk.now - d.gatherAt) / GATHER_MS, 0, 1);
        glow(g, d.x, d.y, 16 + k * 22, d.owner === 'npc' ? SUN : 0xdcf2fb, 0.08 + k * 0.08, 4);
        glint(g, d.x, d.y, 8 + k * 16 + Math.sin(time / 50) * 2, 0.6 + k * 0.4);
        g.lineStyle(2, 0xffffff, 0.7 * k); g.strokeCircle(d.x, d.y, 34 - k * 24);
      }
    },

    drawHud(g, time) {
      // One small pool per double: a figure when it can cast, rings while it is shivering.
      const x0 = 30, y = top + 28;
      const mine = doubles.filter((d) => d.owner === 'player'), hers = doubles.filter((d) => d.owner === 'npc');
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 14, y - 20, 170, 40, 8);
      [mine, hers].forEach((list, row) => {
        list.forEach((d, i) => {
          const x = x0 + row * 84 + i * 36, tint = d.owner === 'npc' ? 0xffb35a : 0x9fd8ff;
          g.fillStyle(POOL_DEEP, 1); g.fillEllipse(x + 8, y, 30, 14);
          g.lineStyle(1.5, GOLD, 1); g.strokeEllipse(x + 8, y, 30, 14);
          if (tk.now < d.rippleUntil) {
            const k = 1 - (d.rippleUntil - tk.now) / RIPPLE_MS;
            g.lineStyle(2, tint, 0.9); g.beginPath(); g.arc(x + 8, y, 9, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          } else {
            g.fillStyle(tint, 0.9); g.fillCircle(x + 8, y + (d.axis === 'h' ? 3 : -3), 3);
            g.fillRect(x + 6, d.axis === 'h' ? y - 5 : y - 1, 4, 6);
            if (d.gatherAt >= 0) glint(g, x + 8, y, 7 + Math.sin(time / 40), 1);
          }
        });
      });
    },

    destroy() { for (const d of doubles) d.target?.remove(); },
  };
}

/** A channel of the reflecting pool: a gilt-lipped marble kerb, water too bright to look into, fish as shapes. */
function drawChannel(g: G, x: number, y: number, w: number, h: number, time: number, across: boolean): void {
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 8, y - 8, w + 16, h + 16);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 8, y - 8, w + 16, 3);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 3, y - 3, w + 6, h + 6);
  g.fillStyle(GOLD, 1); g.fillRect(x - 2, y - 2, w + 4, 2);
  g.fillStyle(POOL_DEEP, 1); g.fillRect(x, y, w, h);
  g.fillStyle(POOL, 0.9); g.fillRect(x + 2, y + 2, w - 4, h - 4);
  // The sun's own image, a white disc in the middle of the water, and the glare round it.
  const sx = x + w / 2, sy = y + h / 2;
  glow(g, sx, sy, Math.min(w, h) * 0.9, SUN, 0.1, 3);
  g.fillStyle(0xffffff, 0.85); g.fillCircle(sx, sy, Math.min(w, h) * 0.32);
  // Glare streaks drifting with the water.
  const n = across ? 14 : 8;
  for (let i = 0; i < n; i++) {
    const f = ((time / 3200 + i / n) % 1);
    const px = across ? x + 10 + f * (w - 20) : x + 6 + ((i * 17) % (w - 12));
    const py = across ? y + 6 + ((i * 13) % (h - 12)) : y + 10 + f * (h - 20);
    g.fillStyle(POOL_GLINT, 0.55 + Math.sin(time / 200 + i) * 0.3);
    if (across) g.fillRect(px, py, 18 + (i % 3) * 8, 1.5); else g.fillRect(px, py, 1.5, 18 + (i % 3) * 8);
  }
  // Two fish, only ever seen as shapes.
  for (let i = 0; i < 2; i++) {
    const f = ((time / 9000 + i * 0.5) % 1);
    const fx = across ? x + 30 + f * (w - 60) : x + w / 2 + Math.sin(time / 700 + i) * 6;
    const fy = across ? y + h / 2 + Math.sin(time / 600 + i * 2) * (h * 0.25) : y + 30 + f * (h - 60);
    const a = across ? 0 : Math.PI / 2;
    g.fillStyle(FISH_SHADE, 0.32);
    g.fillEllipse(fx, fy, across ? 22 : 8, across ? 8 : 22);
    g.fillTriangle(fx - Math.cos(a) * 11, fy - Math.sin(a) * 11, fx - Math.cos(a) * 18 - Math.sin(a) * 5, fy - Math.sin(a) * 18 + Math.cos(a) * 5,
      fx - Math.cos(a) * 18 + Math.sin(a) * 5, fy - Math.sin(a) * 18 - Math.cos(a) * 5);
  }
  // The gilt sun-mark inlaid on the kerb at each end.
  if (across) { sunburst(g, x - 2, y + h / 2, 12, 10, 0.9); sunburst(g, x + w + 2, y + h / 2, 12, 10, 0.9); }
  else { sunburst(g, x + w / 2, y - 2, 12, 10, 0.9); sunburst(g, x + w / 2, y + h + 2, 12, 10, 0.9); }
  g.lineStyle(1, MARBLE, 0.6); g.strokeRect(x - 8, y - 8, w + 16, h + 16);
}

/**
 * A fighter's double: their silhouette mirrored across the water — head-down for the long
 * channel, turned about for the cross-channel — glassy, edged with light, and faintly rippling.
 */
function drawDouble(g: G, x: number, y: number, axis: Axis, f: Fighter, tint: number, time: number): void {
  const flip = axis === 'h' ? 1 : -1;
  const wob = Math.sin(time / 180 + x * 0.02) * 1.5;
  const fill = mixC(tint, 0xffffff, 0.35);
  // Feet at (x, y); for the long channel the body hangs downward from them.
  const by = axis === 'h' ? y + 22 : y - 22;
  const hy = axis === 'h' ? y + 44 : y - 44;
  g.fillStyle(dim(tint, 0.3), 0.18); g.fillEllipse(x, y, 30, 9);
  g.fillStyle(fill, 0.3); g.fillEllipse(x + wob, by, 24, 30);
  g.lineStyle(1.5, lit(tint, 0.3), 0.7); g.strokeEllipse(x + wob, by, 24, 30);
  g.fillStyle(fill, 0.34); g.fillCircle(x + wob * 1.4, hy, 10);
  g.lineStyle(1.5, lit(tint, 0.3), 0.75); g.strokeCircle(x + wob * 1.4, hy, 10);
  // Legs (two short strokes from the feet), arms out to the sides.
  g.lineStyle(3, fill, 0.45);
  g.lineBetween(x - 5, y, x - 4 + wob, by + 10 * -flip);
  g.lineBetween(x + 5, y, x + 4 + wob, by + 10 * -flip);
  g.lineBetween(x - 11 + wob, by, x - 18 + wob, by + 8 * flip);
  g.lineBetween(x + 11 + wob, by, x + 18 + wob, by + 8 * flip);
  // The eyes: the double sees what its owner sees, in its owner's colour.
  g.fillStyle(f.hp > 0 ? 0xffffff : CLEAR_EDGE, 0.7);
  g.fillCircle(x - 3 + wob * 1.4, hy, 1.5); g.fillCircle(x + 3 + wob * 1.4, hy, 1.5);
  // A waterline glint across the middle.
  g.lineStyle(1, GLASS_EDGE, 0.5); g.lineBetween(x - 14, by, x + 14, by);
  g.fillStyle(BEAM_HOT, 0.5); g.fillRect(x - 8 + Math.sin(time / 300) * 4, by - 1, 6, 1.5);
}

export const FALLEN_POOL: GimmickDef = {
  id: ID,
  rules: 'Each cast, the caster\'s double in the water looses a sunbolt at the other. Strike her double to shiver it. At half, a cross-channel.',
  make,
};
