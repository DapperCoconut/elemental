import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim } from '../../../../../art/IsleArt';
import { BRASS, FLAME_MID, HONEY, PLAYER_TINT, FOE_TINT, dist, flame, smokeCurl, taperOnStick, waxPuddle } from '../art';

/**
 * Vigil — Vigil-Keeper Amonet's nave.
 *
 * Eight tall tapers ring the room on brass sticks. A lit taper heals whoever stands in its
 * light, and pays for it in wax: the more it heals, the faster it burns, and a taper that burns
 * all the way down gutters in a spit of hot wax and is gone for the fight. Amonet keeps the
 * vigil her way — she walks to whichever lit taper is nearest you and blows it out; you relight
 * dark ones by standing at them. When she is hurt she stops snuffing and drinks from a taper
 * herself.
 *
 * The goal on top of the sustain: keep *every* remaining taper lit at once for a few seconds
 * and the vigil is kept — Amonet is exposed and takes heavy damage. Let her darken them all
 * and the vigil is broken, and her hits land harder. Healing is the trap: drinking a taper dry
 * shortens the vigil you are trying to keep.
 */

const TAPERS = 8;
const START_LIT = 5;
const HEAL_R = 64;
const HEAL_PER_S = 5;
const TOUCH_R = 50;
const IDLE_BURN = 0.6;
const HEAL_BURN = 3.2;
const SNUFF_MS = 700;
const SNUFF_HARD_MS = 520;
const LIGHT_MS = 520;
const GUTTER_R = 78;
const GUTTER_DAMAGE = 10;
const KEPT_HOLD_MS = 2500;
const KEPT_MS = 7000;
const KEPT_MULT = 1.35;
const BROKEN_MS = 6000;
const BROKEN_MULT = 1.25;
const SURGE_LOCKOUT_MS = 12000;

interface Taper {
  x: number; y: number;
  lit: boolean;
  /** 0–100 wax left. */
  wax: number;
  gone: boolean;
  snuff: number;
  light: number;
  /** When it was last snuffed (smoke curl). */
  snuffedAt: number;
  goneAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 6;
  const snuffMs = ctx.hard ? SNUFF_HARD_MS : SNUFF_MS;

  const tapers: Taper[] = [];
  const litIdx = new Set<number>();
  while (litIdx.size < START_LIT) litIdx.add(Math.floor(rng() * TAPERS));
  for (let i = 0; i < TAPERS; i++) {
    const a = -Math.PI / 2 + (i / TAPERS) * Math.PI * 2 + Math.PI / TAPERS;
    tapers.push({
      x: cx + Math.cos(a) * (W * 0.36), y: cy + Math.sin(a) * ((H - top) * 0.36),
      lit: litIdx.has(i), wax: 100, gone: false, snuff: 0, light: 0, snuffedAt: -9999, goneAt: 0,
    });
  }

  const healAcc = new Map<Fighter, number>();
  let keptSince = 0;
  let keptUntil = 0;
  let brokenUntil = 0;
  let surgeLockUntil = 0;
  let announced = false;

  const standing = (): Taper[] => tapers.filter((t) => !t.gone);
  const near = (f: Fighter, t: Taper, r: number): boolean => f.active && f.hp > 0 && dist(f.x, f.y, t.x, t.y) < r;
  /** Amonet drinks instead of snuffing while she is hurt. */
  const amonetDrinking = (): boolean => ctx.npc.hp / ctx.npc.maxHp < 0.5;

  const gutter = (t: Taper, time: number): void => {
    t.gone = true; t.lit = false; t.goneAt = time;
    ctx.sfx('sizzle');
    ctx.float(t.x, t.y - 70, 'GUTTERED', '#ffcf7a');
    ctx.flash(t.x, t.y - 20, FLAME_MID);
    for (const f of [ctx.player, ctx.npc]) if (near(f, t, GUTTER_R)) ctx.hit(f, GUTTER_DAMAGE, t.x, t.y);
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('KEEP THE VIGIL', '#ffe3a0'); }
      const p = ctx.player, n = ctx.npc;

      for (const t of tapers) {
        if (t.gone) continue;
        if (t.lit) {
          let burn = IDLE_BURN;
          for (const f of [p, n]) {
            if (!near(f, t, HEAL_R) || f.hp >= f.maxHp) continue;
            burn += HEAL_BURN;
            const acc = (healAcc.get(f) ?? 0) + HEAL_PER_S * dt;
            if (acc >= 1) {
              const whole = Math.floor(acc);
              ctx.heal(f, whole);
              healAcc.set(f, acc - whole);
            } else healAcc.set(f, acc);
          }
          t.wax -= burn * dt;
          if (t.wax <= 0) { gutter(t, time); continue; }
          // Amonet snuffing — unless she is drinking.
          if (!amonetDrinking() && near(n, t, TOUCH_R)) {
            t.snuff += (dt * 1000) / snuffMs;
            if (t.snuff >= 1) {
              t.lit = false; t.snuff = 0; t.snuffedAt = time;
              ctx.sfx('hush');
              ctx.float(t.x, t.y - 72, 'SNUFFED', '#c9c2b8');
            }
          } else t.snuff = Math.max(0, t.snuff - dt * 2);
        } else {
          if (near(p, t, TOUCH_R)) {
            t.light += (dt * 1000) / LIGHT_MS;
            if (t.light >= 1) {
              t.lit = true; t.light = 0;
              ctx.sfx('flame-burst');
              ctx.float(t.x, t.y - 72, 'LIT', '#ffd27a');
            }
          } else t.light = Math.max(0, t.light - dt * 2);
        }
      }

      // The vigil itself.
      const st = standing();
      const allLit = st.length >= 4 && st.every((t) => t.lit);
      const allDark = st.length > 0 && st.every((t) => !t.lit);
      if (allLit && time >= surgeLockUntil) {
        if (!keptSince) keptSince = time;
        if (time - keptSince >= KEPT_HOLD_MS) {
          keptUntil = time + KEPT_MS;
          surgeLockUntil = time + SURGE_LOCKOUT_MS;
          keptSince = 0;
          ctx.banner('THE VIGIL IS KEPT', '#ffe3a0');
          ctx.sfx('holy-chord');
          ctx.flash(n.x, n.y, 0xffffff);
        }
      } else keptSince = 0;
      if (allDark && time >= surgeLockUntil) {
        brokenUntil = time + BROKEN_MS;
        surgeLockUntil = time + SURGE_LOCKOUT_MS;
        ctx.banner('THE VIGIL IS BROKEN', '#b9b2c8');
        ctx.sfx('curse-cast');
      }
    },

    npcTakenMult() { return ctx.scene.time.now < keptUntil ? KEPT_MULT : 1; },
    playerTakenMult() { return ctx.scene.time.now < brokenUntil ? BROKEN_MULT : 1; },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const lit = standing().filter((t) => t.lit);
      if (!lit.length) return null;
      if (amonetDrinking()) {
        // Drink from the lit taper farthest from you.
        let best: Taper | null = null; let bd = -1;
        for (const t of lit) { const d = dist(t.x, t.y, p.x, p.y); if (d > bd) { bd = d; best = t; } }
        return best ? { x: best.x, y: best.y + 18 } : null;
      }
      // Snuff the lit taper nearest you — but only bother when you are anywhere near one.
      let best: Taper | null = null; let bd = Infinity;
      for (const t of lit) { const d = dist(t.x, t.y, p.x, p.y); if (d < bd) { bd = d; best = t; } }
      if (!best) return null;
      if (bd > 230 && dist(n.x, n.y, best.x, best.y) > 260) return null;
      return { x: best.x + (n.x < best.x ? -14 : 14), y: best.y + 12 };
    },

    drawGround(g, time) {
      const t = time / 1000;
      // The nave's processional ring, joining the tapers.
      g.lineStyle(2, BRASS, 0.18);
      g.strokeEllipse(cx, cy, W * 0.72, (H - top) * 0.72);
      for (const tp of tapers) {
        if (tp.gone) {
          waxPuddle(g, tp.x, tp.y + 4, 22, t, 1, 0xe9dfc8, tp.x);
          g.fillStyle(0x1a1410, 0.4); g.fillEllipse(tp.x, tp.y + 4, 30, 12);
          continue;
        }
        if (tp.lit) {
          const pulse = 1 + Math.sin(t * 2.4 + tp.x) * 0.04;
          g.fillStyle(HONEY, 0.08); g.fillEllipse(tp.x, tp.y, HEAL_R * 2 * pulse, HEAL_R * 1.5 * pulse);
          g.lineStyle(1.5, HONEY, 0.35); g.strokeEllipse(tp.x, tp.y, HEAL_R * 2 * pulse, HEAL_R * 1.5 * pulse);
        }
        // Progress rings — gold for your relight, ash-grey for her breath.
        if (tp.light > 0) {
          g.lineStyle(4, PLAYER_TINT, 0.85);
          g.beginPath(); g.arc(tp.x, tp.y, 30, -Math.PI / 2, -Math.PI / 2 + tp.light * Math.PI * 2, false); g.strokePath();
        }
        if (tp.snuff > 0) {
          g.lineStyle(4, FOE_TINT, 0.85);
          g.beginPath(); g.arc(tp.x, tp.y, 34, -Math.PI / 2, -Math.PI / 2 + tp.snuff * Math.PI * 2, false); g.strokePath();
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      const n = ctx.npc;
      for (const tp of tapers) {
        if (tp.gone) continue;
        const wick = taperOnStick(g, tp.x, tp.y, tp.wax / 100, 1.15);
        if (tp.lit) {
          const gutterSoon = tp.wax < 18;
          flame(g, wick.x, wick.y, gutterSoon ? 6 + Math.sin(t * 30) * 2 : 7, t, tp.x * 0.01, 0.06);
          if (gutterSoon && Math.floor(time / 110) % 2 === 0) {
            g.lineStyle(2, 0xffffff, 0.6); g.strokeCircle(tp.x, tp.y, GUTTER_R);
          }
        } else {
          smokeCurl(g, wick.x, wick.y, t + tp.x, time - tp.snuffedAt < 2500 ? 0.6 : 0.2);
        }
        // Amonet's breath streaming at the flame she is putting out.
        if (tp.snuff > 0.05) {
          for (let i = 0; i < 5; i++) {
            const ph = ((t * 2.5 + i / 5) % 1);
            const x = n.x + (wick.x - n.x) * ph;
            const y = n.y - 10 + (wick.y - (n.y - 10)) * ph + Math.sin(ph * 9 + i) * 4;
            g.fillStyle(0xd8e2f0, 0.45 * (1 - ph * 0.6));
            g.fillCircle(x, y, 2.5 + ph * 2);
          }
        }
      }
    },

    drawHud(g, time) {
      const n = tapers.length;
      const w = 18, gap = 6;
      const x0 = W / 2 - (n * (w + gap) - gap) / 2;
      const y = top + 8;
      g.fillStyle(0x140f0a, 0.55); g.fillRoundedRect(x0 - 8, y - 4, n * (w + gap) - gap + 16, 34, 6);
      tapers.forEach((tp, i) => {
        const x = x0 + i * (w + gap);
        const h = tp.gone ? 0 : 4 + (tp.wax / 100) * 16;
        g.fillStyle(dim(0xf3e3bf, 0.4), 1); g.fillRect(x + w / 2 - 4, y + 24 - h, 8, h);
        g.fillStyle(tp.gone ? 0x3a302a : 0xf3e3bf, 1); g.fillRect(x + w / 2 - 3, y + 24 - h, 6, h);
        if (tp.lit) { g.fillStyle(FLAME_MID, 1); g.fillCircle(x + w / 2, y + 20 - h, 3); }
        else if (tp.gone) { g.lineStyle(1.5, 0x8a7a6a, 1); g.lineBetween(x + 3, y + 24, x + w - 3, y + 24); }
      });
      // The hold bar while every taper is lit.
      if (keptSince) {
        const k = Math.min(1, (time - keptSince) / KEPT_HOLD_MS);
        g.fillStyle(HONEY, 0.9); g.fillRect(x0, y + 28, (n * (w + gap) - gap) * k, 3);
      }
    },
  };
}

export const VIGIL: GimmickDef = {
  id: 'candlewick-vigil',
  rules: 'Lit tapers heal whoever stands by them (and burn down for it). Relight dark ones; light them ALL to expose Amonet.',
  make,
};
