import type { Fighter } from '../../../../../../entities/Fighter';
import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { shard } from '../art';
import { GLASS_LIT, GOLD, GOLD_DARK, GOLD_LIT, IRON_LIT, MIRROR, MIRROR_DARK, MIRROR_LIT, NOON_SHADOW, SUN } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Glass Cage — Gaoler Lucent.
 *
 * Lucent keeps the mirror cages in the yard, and he brings them with him. Every few seconds the
 * shadow of a cage swells on the floor round somebody — mostly you — and a breath later a cage
 * of mirror rods drops out of the glare onto that spot. Whoever is inside when it lands is caged:
 * the bars hold them in (and hold everyone else out), and the glass focuses the noon on them, so
 * they take more from every hit. Shots still pass in through the bars.
 *
 * Any blow on a cage cracks it, from either side, and enough cracks shatter it — and the shards go
 * the way the blow went. Smash a cage from outside and the shards fly *in*, into whoever is caged;
 * smash it from inside and they fly *out*, into anyone standing close. So: step out of the shadow
 * at the last moment and leave Lucent standing in it, then shatter his cage on him from outside.
 */

const CAGE_R = 74;
const WARN_MS = 1150;
const SHARD_DMG = 12;
const RIM_DMG = 8;
const LIGHT_MULT = 1.2;

interface Cage {
  x: number; y: number;
  bornAt: number; dropAt: number; liftAt: number;
  down: boolean;
  /** Who was inside when it landed. */
  inmates: Set<Fighter>;
  /** Damage it has taken; `need` shatters it. */
  struck: number; need: number;
  target: StrikeTarget | null;
  shatterAt: number; inward: boolean;
  gone: boolean; liftedAt: number;
  seed: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const cages: Cage[] = [];
  const every = ctx.hard ? 4300 : 5200;
  const hold = ctx.hard ? 7000 : 6000;
  const need = ctx.hard ? 44 : 34;
  let nextDrop = ctx.scene.time.now + 2200;
  let count = 0;

  const other = (f: Fighter) => (f === player ? npc : player);
  const caged = (f: Fighter) => cages.some((c) => c.down && !c.gone && c.inmates.has(f));
  const cageOf = (f: Fighter) => cages.find((c) => c.down && !c.gone && c.inmates.has(f)) ?? null;

  function drop(time: number): void {
    count++;
    // Mostly at you; every third at the foe's own feet (he is a fair gaoler). When you are close
    // together, the shadow lands between you and may take you both.
    let at: Pt = count % 3 === 0 ? { x: npc.x, y: npc.y } : { x: player.x, y: player.y };
    if (dist(player.x, player.y, npc.x, npc.y) < 170) at = { x: (player.x + npc.x) / 2, y: (player.y + npc.y) / 2 };
    const x = clamp(at.x, CAGE_R + 30, W - CAGE_R - 30), y = clamp(at.y, top + CAGE_R + 10, H - CAGE_R - 20);
    if (cages.some((c) => !c.gone && dist(c.x, c.y, x, y) < CAGE_R * 2 + 20)) return;
    cages.push({
      x, y, bornAt: time, dropAt: time + WARN_MS, liftAt: time + WARN_MS + hold, down: false, inmates: new Set(),
      struck: 0, need, target: null, shatterAt: 0, inward: false, gone: false, liftedAt: 0, seed: rng() * 10,
    });
    ctx.sfx('chain');
  }

  function land(c: Cage, time: number): void {
    c.down = true;
    ctx.sfx('crystal-chime');
    ctx.flash(c.x, c.y, MIRROR_LIT);
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      const d = dist(f.x, f.y, c.x, c.y);
      if (d < CAGE_R - 10) { c.inmates.add(f); ctx.float(f.x, f.y - 50, 'CAGED', '#d8f0f6'); }
      else if (d < CAGE_R + 16) {
        // Clipped by the falling rim: knocked out of the way.
        ctx.hit(f, RIM_DMG, f.x, f.y);
        const a = Math.atan2(f.y - c.y, f.x - c.x);
        ctx.nudge(f, Math.cos(a) * 40, Math.sin(a) * 40);
      }
    }
    c.target = ctx.target({
      x: c.x, y: c.y, r: CAGE_R, passThrough: true,
      onStruck: (by, amount) => {
        if (c.gone || !c.down) return;
        c.struck += Math.max(4, amount);
        ctx.sfx('crystal-shatter');
        if (c.struck >= c.need) shatter(c, by === 'player' ? player : npc, ctx.scene.time.now);
      },
    });
    void time;
  }

  function shatter(c: Cage, by: Fighter, time: number): void {
    c.gone = true;
    c.shatterAt = time;
    c.target?.remove();
    c.target = null;
    const fromInside = c.inmates.has(by);
    c.inward = !fromInside;
    ctx.sfx('ice-shatter');
    ctx.banner(fromInside ? 'SHATTERED OUTWARD' : 'SHATTERED INWARD', '#d8f0f6');
    const dmg = ctx.hard ? SHARD_DMG + 3 : SHARD_DMG;
    if (c.inward) {
      for (const f of c.inmates) if (alive(f)) { ctx.hit(f, dmg, f.x, f.y); ctx.float(f.x, f.y - 40, 'SHARDS', '#f4fbff'); }
    } else {
      for (const f of [player, npc]) {
        if (!alive(f) || c.inmates.has(f)) continue;
        if (dist(f.x, f.y, c.x, c.y) < CAGE_R + 120) { ctx.hit(f, dmg, f.x, f.y); ctx.float(f.x, f.y - 40, 'SHARDS', '#f4fbff'); }
      }
    }
    c.inmates.clear();
  }

  function lift(c: Cage, time: number): void {
    c.gone = true;
    c.liftedAt = time;
    c.target?.remove();
    c.target = null;
    c.inmates.clear();
    ctx.sfx('chain');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (time >= nextDrop) {
        nextDrop = time + every;
        if (alive(player) && alive(npc)) drop(time);
      }
      for (const c of cages) {
        if (c.gone) continue;
        if (!c.down && time >= c.dropAt) land(c, time);
        if (c.down && time >= c.liftAt) { lift(c, time); continue; }
        if (!c.down) continue;
        // The bars: inmates kept in, everybody else kept out.
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const d = dist(f.x, f.y, c.x, c.y);
          const a = Math.atan2(f.y - c.y, f.x - c.x);
          if (c.inmates.has(f)) {
            const lim = CAGE_R - 18;
            if (d > lim) ctx.nudge(f, -Math.cos(a) * (d - lim), -Math.sin(a) * (d - lim));
          } else {
            const lim = CAGE_R + 16;
            if (d < lim) ctx.nudge(f, Math.cos(a) * (lim - d), Math.sin(a) * (lim - d));
          }
        }
      }
      for (let i = cages.length - 1; i >= 0; i--) {
        const c = cages[i];
        if (c.gone && time - Math.max(c.shatterAt, c.liftedAt) > 1400) cages.splice(i, 1);
      }
    },

    playerTakenMult: () => (caged(player) ? LIGHT_MULT : 1),
    npcTakenMult: () => (caged(npc) ? LIGHT_MULT : 1),

    npcSeek() {
      const mine = cageOf(npc);
      // Caged: stand by the bars and swing at them, so the shards go out at you.
      if (mine) {
        const a = Math.atan2(player.y - mine.y, player.x - mine.x);
        return { x: mine.x + Math.cos(a) * (CAGE_R - 30), y: mine.y + Math.sin(a) * (CAGE_R - 30) };
      }
      // You are caged: come up to the outside of your bars and break them in on you.
      const yours = cageOf(player);
      if (yours) {
        const a = Math.atan2(npc.y - yours.y, npc.x - yours.x);
        return { x: clamp(yours.x + Math.cos(a) * (CAGE_R + 40), 60, W - 60), y: clamp(yours.y + Math.sin(a) * (CAGE_R + 40), top + 40, H - 40) };
      }
      // Otherwise keep out of every shadow, at casting range of you.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      let x = player.x + Math.cos(a) * 260, y = player.y + Math.sin(a) * 220;
      for (const c of cages) {
        if (c.gone) continue;
        const d = dist(c.x, c.y, x, y);
        if (d < CAGE_R + 60) { const b = Math.atan2(y - c.y, x - c.x); x = c.x + Math.cos(b) * (CAGE_R + 80); y = c.y + Math.sin(b) * (CAGE_R + 80); }
      }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const c of cages) {
        if (!c.down && !c.gone) {
          // The shadow swells as the cage comes down out of the glare.
          const k = clamp((time - c.bornAt) / WARN_MS, 0, 1);
          g.fillStyle(NOON_SHADOW, 0.12 + k * 0.3); g.fillEllipse(c.x, c.y, CAGE_R * 2 * (0.5 + k * 0.5), CAGE_R * 1.7 * (0.5 + k * 0.5));
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            g.lineStyle(2, NOON_SHADOW, 0.2 + k * 0.4);
            g.lineBetween(c.x + Math.cos(a) * CAGE_R * 0.3 * k, c.y + Math.sin(a) * CAGE_R * 0.25 * k, c.x + Math.cos(a) * CAGE_R * k, c.y + Math.sin(a) * CAGE_R * 0.85 * k);
          }
          g.lineStyle(2, MIRROR_LIT, 0.3 + k * 0.5); g.strokeEllipse(c.x, c.y, CAGE_R * 2, CAGE_R * 1.7);
          continue;
        }
        if (c.down && !c.gone) {
          // The gilt floor ring and the hot white spot of focused noon on the inmates.
          g.fillStyle(SUN, 0.18 + Math.sin(time / 160) * 0.05); g.fillEllipse(c.x, c.y, CAGE_R * 1.6, CAGE_R * 1.3);
          g.lineStyle(5, GOLD_DARK, 1); g.strokeEllipse(c.x, c.y, CAGE_R * 2, CAGE_R * 1.7);
          g.lineStyle(2, GOLD, 1); g.strokeEllipse(c.x, c.y - 1, CAGE_R * 2, CAGE_R * 1.7);
          continue;
        }
        // Shards scattered on the floor after a shatter.
        if (c.shatterAt) {
          const fade = clamp(1 - (time - c.shatterAt) / 1400, 0, 1);
          for (let i = 0; i < 14; i++) {
            const a = c.seed + i * 0.45;
            const d = c.inward ? CAGE_R * (0.2 + ((i * 37) % 10) / 14) : CAGE_R * (1.1 + ((i * 37) % 10) / 8);
            shard(g, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.85, 4, a + i, fade * 0.8);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const c of cages) {
        const BAR_H = 120;
        let drop = 0;
        let alpha = 1;
        if (!c.down && !c.gone) {
          const k = clamp((time - c.bornAt) / WARN_MS, 0, 1);
          drop = (1 - k * k) * 360;
          alpha = 0.3 + k * 0.7;
        } else if (c.liftedAt) {
          const k = clamp((time - c.liftedAt) / 900, 0, 1);
          drop = k * k * 420;
          alpha = 1 - k;
        } else if (c.gone) continue;
        if (alpha <= 0.02) continue;
        const by = c.y - drop;
        // The chain it hangs on.
        g.lineStyle(3, IRON_LIT, alpha); g.lineBetween(c.x, by - BAR_H - CAGE_R * 0.5 - 10, c.x, by - BAR_H - 600);
        // Bars: back ones dim, front ones bright.
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          const bx = c.x + Math.cos(a) * CAGE_R, bty = by + Math.sin(a) * CAGE_R * 0.85;
          const front = Math.sin(a) > 0;
          g.lineStyle(front ? 3 : 2, front ? MIRROR_LIT : MIRROR_DARK, alpha * (front ? 0.75 : 0.45));
          g.lineBetween(bx, bty, bx, bty - BAR_H);
        }
        for (const hy of [0, BAR_H * 0.5, BAR_H]) {
          g.lineStyle(3, GOLD_DARK, alpha); g.strokeEllipse(c.x, by - hy, CAGE_R * 2, CAGE_R * 1.7);
          g.lineStyle(1.5, GOLD, alpha); g.strokeEllipse(c.x, by - hy - 1, CAGE_R * 2, CAGE_R * 1.7);
        }
        // The domed cap and its ring.
        g.fillStyle(GOLD_DARK, alpha); g.slice(c.x, by - BAR_H, CAGE_R, Math.PI, 0, false); g.fillPath();
        g.fillStyle(GOLD, alpha); g.slice(c.x - 2, by - BAR_H - 2, CAGE_R - 6, Math.PI, 0, false); g.fillPath();
        g.fillStyle(GOLD_LIT, alpha * 0.7); g.fillEllipse(c.x - CAGE_R * 0.35, by - BAR_H - CAGE_R * 0.5, CAGE_R * 0.3, CAGE_R * 0.3);
        g.lineStyle(3, GOLD_DARK, alpha); g.strokeCircle(c.x, by - BAR_H - CAGE_R - 6, 7);
        // Cracks spreading over the glass as it is struck.
        if (c.down && c.struck > 0) {
          const k = clamp(c.struck / c.need, 0, 1);
          for (let i = 0; i < Math.ceil(k * 7); i++) {
            const a = c.seed + i * 0.9;
            const sx = c.x + Math.cos(a) * CAGE_R * 0.95, sy = by + Math.sin(a) * CAGE_R * 0.8 - 30 - (i * 13) % 70;
            g.lineStyle(1.5, GLASS_LIT, 0.9);
            g.beginPath(); g.moveTo(sx, sy);
            g.lineTo(sx + 6, sy + 8); g.lineTo(sx + 2, sy + 16); g.lineTo(sx + 9, sy + 24);
            g.strokePath();
          }
          if (k > 0.6) glow(g, c.x, by - BAR_H * 0.5, CAGE_R, MIRROR_LIT, 0.03 + Math.sin(time / 60) * 0.02, 2);
        }
      }
      // Shards flying.
      for (const c of cages) {
        if (!c.shatterAt) continue;
        const k = clamp((time - c.shatterAt) / 500, 0, 1);
        if (k >= 1) continue;
        for (let i = 0; i < 18; i++) {
          const a = c.seed + (i / 18) * Math.PI * 2;
          const r0 = c.inward ? CAGE_R : 10, r1 = c.inward ? 6 : CAGE_R + 120;
          const r = r0 + (r1 - r0) * k;
          shard(g, c.x + Math.cos(a) * r, c.y - 50 + Math.sin(a) * r * 0.8, 5, a + k * 6, 1 - k);
        }
      }
      // A focused glare over anyone caged.
      for (const f of [player, npc]) {
        if (!caged(f) || !alive(f)) continue;
        glow(g, f.x, f.y - 10, 30, lit(MIRROR, 0.5), 0.05 + Math.sin(time / 90) * 0.02, 3);
      }
    },

    destroy() { for (const c of cages) c.target?.remove(); },
  };
}

export const GLASS_CAGE: GimmickDef = {
  id: 'tribunal-glass-cage',
  rules: 'Cages drop where their shadow swells: the caged can\'t leave and take more. Strike a cage to shatter it — shards fly the way the blow went.',
  make,
};
