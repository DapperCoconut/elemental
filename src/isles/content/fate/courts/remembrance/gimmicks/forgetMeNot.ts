import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../../art/IsleArt';
import { fmn } from '../art';
import { FMN_BLUE, FMN_DARK, FMN_EYE, FMN_LIT, SEPIA_DARK, SEPIA_DEEP, WILT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Forget-Me-Not — Florist Myosotis.
 *
 * Round beds of forget-me-nots bloom across the floor. They are the flower you carry so as not to
 * forget, and standing among them your mind is quick: your cooldowns run faster the fuller the
 * bed is in bloom. But a bed stood in is a bed trampled — it loses its bloom under your feet, and
 * trampled bare it turns: a wilted bed makes you *forget*, and your cooldowns run slow in it
 * until it grows back. Myosotis comes and tramples whichever bed you are standing in, and now and
 * then she presses one — a ring of blue, then the bed bursts in a shower of pressed petals,
 * hurting whoever is in it and wilting it at once. Spread your standing over the beds, and lead her
 * into the brown ones.
 */

const BED_R = 72;
const TRAMPLE_PS = 0.24;
const REGROW_PS = 0.11;
const REGROW_DELAY = 6500;
const FAST = 0.9;
const SLOW = 0.6;

interface Bed {
  x: number; y: number; r: number;
  bloom: number;
  wilted: boolean;
  regrowAt: number;
  seed: number;
  /** Myosotis is pressing this bed: it bursts at `pressAt`. */
  pressAt: number;
  pressWarnAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const beds: Bed[] = [];
  // Six beds on a loose grid, jittered so no two fights are laid out quite alike.
  const cols = [190, 480, 770], rows = [top + 150, H - 140];
  for (const y of rows) for (const x of cols) {
    beds.push({ x: x + (rng() - 0.5) * 70, y: y + (rng() - 0.5) * 40, r: BED_R * (0.9 + rng() * 0.2), bloom: 0.7 + rng() * 0.3, wilted: false, regrowAt: 0, seed: rng() * 100, pressAt: 0, pressWarnAt: 0 });
  }
  const pressEvery = ctx.hard ? 8000 : 10000;
  const PRESS_WARN = 1100;
  let nextPress = 0;
  let started = false;

  const bedOf = (f: Fighter): Bed | null => {
    if (!alive(f)) return null;
    let best: Bed | null = null, bd = Infinity;
    for (const b of beds) { const d = dist(b.x, b.y, f.x, f.y); if (d < b.r && d < bd) { bd = d; best = b; } }
    return best;
  };
  const rateFor = (f: Fighter): number => {
    const b = bedOf(f);
    if (!b) return 1;
    if (b.wilted) return SLOW;
    return 1 + FAST * b.bloom;
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextPress = time + pressEvery; }
      for (const b of beds) {
        const standers = [player, npc].filter((f) => bedOf(f) === b).length;
        if (b.wilted) {
          if (time >= b.regrowAt) {
            b.bloom = clamp(b.bloom + REGROW_PS * dt, 0, 1);
            if (b.bloom > 0.35) { b.wilted = false; ctx.float(b.x, b.y - 20, 'in bloom again', '#9cc4ff'); }
          }
        } else if (standers > 0) {
          b.bloom = clamp(b.bloom - TRAMPLE_PS * standers * dt, 0, 1);
          if (b.bloom <= 0) {
            b.wilted = true; b.regrowAt = time + REGROW_DELAY;
            ctx.float(b.x, b.y - 24, 'TRAMPLED — FORGETTING', '#c8b080');
            ctx.sfx('status-debuff');
          }
        } else {
          b.bloom = clamp(b.bloom + REGROW_PS * 0.5 * dt, 0, 1);
        }
        if (b.pressAt > 0 && time >= b.pressAt) {
          b.pressAt = 0;
          b.wilted = true; b.bloom = 0; b.regrowAt = time + REGROW_DELAY;
          ctx.sfx('spore');
          for (const f of [player, npc]) {
            if (!alive(f) || dist(f.x, f.y, b.x, b.y) > b.r) continue;
            if (f === player) ctx.tk.hitPlayer(10, f.x, f.y); else ctx.hit(f, 10, f.x, f.y);
          }
        }
      }
      // Myosotis presses the bed you are standing in — or, if you are in none, the fullest.
      if (time >= nextPress) {
        nextPress = time + pressEvery;
        const mine = bedOf(player);
        const target = mine && !mine.wilted ? mine : beds.filter((b) => !b.wilted).sort((a, b) => b.bloom - a.bloom)[0];
        if (target) {
          target.pressWarnAt = time; target.pressAt = time + ctx.tk.warn(PRESS_WARN);
          ctx.banner('MYOSOTIS PRESSES A BED', '#9cc4ff');
          ctx.sfx('curse-cast');
        }
      }
    },

    playerCooldownRate() { return rateFor(player); },
    npcCooldownRate() { return rateFor(npc); },

    npcSeek() {
      // Trample the bed you're in; otherwise find the fullest bloom near her and not near you.
      const yours = bedOf(player);
      if (yours && !yours.wilted && yours.pressAt === 0) return { x: yours.x, y: yours.y };
      let best: Bed | null = null, bs = -Infinity;
      for (const b of beds) {
        if (b.wilted || b.pressAt > 0) continue;
        const s = b.bloom * 300 - dist(b.x, b.y, npc.x, npc.y) * 0.5 + Math.min(300, dist(b.x, b.y, player.x, player.y)) * 0.2;
        if (s > bs) { bs = s; best = b; }
      }
      return best ? { x: best.x + Math.cos(best.seed) * 20, y: best.y + Math.sin(best.seed) * 16 } : null;
    },

    drawGround(g, time) {
      for (const b of beds) {
        const k = b.bloom;
        // Leaf mound: green, browning as it wilts.
        const leaf = b.wilted ? mixC(0x5a4e36, WILT, 0.4) : mixC(0x56703c, 0x3e5a2e, 1 - k);
        g.fillStyle(dim(leaf, 0.3), 0.9); g.fillEllipse(b.x, b.y + 4, b.r * 2.08, b.r * 1.5);
        g.fillStyle(leaf, 1); g.fillEllipse(b.x, b.y, b.r * 2, b.r * 1.44);
        // A brick-edged ring.
        g.lineStyle(3, SEPIA_DARK, 0.7); g.strokeEllipse(b.x, b.y, b.r * 2 + 4, b.r * 1.44 + 4);
        // Flowers: how many still stand is the bloom.
        const n = 42;
        for (let i = 0; i < n; i++) {
          const a = b.seed + i * 2.39996, d = Math.sqrt(((i * 37) % n) / n) * b.r * 0.88;
          const fx = b.x + Math.cos(a) * d, fy = b.y + Math.sin(a) * d * 0.7;
          if (b.wilted) {
            if (i % 3) continue;
            g.fillStyle(WILT, 0.8); g.fillCircle(fx, fy, 1.6); g.lineStyle(1, SEPIA_DEEP, 0.6); g.lineBetween(fx, fy, fx + 2, fy + 4);
            continue;
          }
          if (i / n > k) { g.fillStyle(dim(FMN_BLUE, 0.4), 0.6); g.fillEllipse(fx, fy + 1, 3, 1.5); continue; }
          const sway = Math.sin(time / 600 + i) * 1.2;
          fmn(g, fx + sway, fy, 2 + ((i * 13) % 5) * 0.25, 1, i % 6 ? FMN_BLUE : FMN_LIT);
        }
        // Pressing: a ring of blue tightening, petals lifting.
        if (b.pressAt > 0) {
          const kk = clamp((time - b.pressWarnAt) / Math.max(1, b.pressAt - b.pressWarnAt), 0, 1);
          g.lineStyle(3, FMN_LIT, 0.4 + kk * 0.5); g.strokeEllipse(b.x, b.y, b.r * 2 * (1.3 - kk * 0.3), b.r * 1.44 * (1.3 - kk * 0.3));
          g.fillStyle(FMN_DARK, 0.15 + kk * 0.2); g.fillEllipse(b.x, b.y, b.r * 2, b.r * 1.44);
        }
        // Who is in it: a faint halo, blue when quickening, brown when forgetting.
        for (const f of [player, npc]) {
          if (bedOf(f) !== b) continue;
          g.lineStyle(2, b.wilted ? WILT : FMN_LIT, 0.5); g.strokeCircle(f.x, f.y + 8, 26 + Math.sin(time / 200) * 2);
        }
      }
    },

    drawAir(g, time) {
      for (const b of beds) {
        // Pressed-petal burst after a press.
        if (b.wilted && time - b.regrowAt + REGROW_DELAY < 600) {
          const e = (time - b.regrowAt + REGROW_DELAY) / 600;
          for (let i = 0; i < 18; i++) {
            const a = i * 0.349 + b.seed;
            fmn(g, b.x + Math.cos(a) * b.r * e, b.y + Math.sin(a) * b.r * 0.7 * e - e * 30, 2.4, 1 - e, i % 2 ? FMN_LIT : FMN_BLUE);
          }
        }
        // Drifting petals above a full bed.
        if (!b.wilted && b.bloom > 0.6) {
          for (let i = 0; i < 3; i++) {
            const ph = (time / 2400 + i / 3 + b.seed) % 1;
            fmn(g, b.x - b.r * 0.6 + i * b.r * 0.6 + Math.sin(ph * 6) * 6, b.y - ph * 50, 1.6, Math.sin(ph * Math.PI) * 0.8, FMN_LIT);
          }
        }
      }
    },

    drawHud(g) {
      // Each fighter's quickness: a little blue flower and a bar (slow is brown).
      for (const [f, x, d] of [[player, 20, 1], [npc, W - 20, -1]] as [Fighter, number, number][]) {
        const r = rateFor(f);
        const w = 110;
        const x0 = d > 0 ? x + 16 : x - 16 - w;
        const y = top + 10;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 2, y - 2, w + 4, 12, 5);
        const fill = clamp((r - 0.5) / 1.4, 0, 1);
        g.fillStyle(r < 1 ? WILT : r > 1 ? FMN_LIT : 0xc8c0a8, 0.95);
        g.fillRoundedRect(d > 0 ? x0 : x0 + w - w * fill, y, Math.max(2, w * fill), 8, 4);
        g.lineStyle(1, 0xffffff, 0.5); g.lineBetween(x0 + w * (0.5 / 1.4), y - 1, x0 + w * (0.5 / 1.4), y + 9);
        fmn(g, x, y + 4, 4, 1, r < 1 ? WILT : FMN_BLUE);
        g.fillStyle(FMN_EYE, 1); g.fillCircle(x, y + 4, 1.6);
        if (r > 1.5) { g.lineStyle(1, lit(FMN_BLUE, 0.6), 0.8); g.strokeCircle(x, y + 4, 7); }
      }
    },
  };
}

export const FORGET_ME_NOT: GimmickDef = {
  id: 'remembrance-forget-me-not',
  rules: 'Blooming beds speed your cooldowns, but standing tramples them. A trampled bed makes you forget: cooldowns run slow in it. Myosotis tramples yours.',
  make,
};
