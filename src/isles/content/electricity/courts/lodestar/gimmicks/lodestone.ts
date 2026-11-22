import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { horseshoe, ironPlate } from '../art';
import {
  FILINGS, FILINGS_LIT, IRON_DARK, MAGNETITE, MAGNETITE_LIT, NORTH, NORTH_LIT, RUST, SOUTH, SOUTH_LIT, SPARK,
} from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Lodestone — Prospector Magda.
 *
 * A boulder of raw lodestone sits in the middle of Magda's claim, and it breathes. For a few
 * seconds it *draws*: both fighters are dragged toward it, and the iron plates that pave the
 * claim slide in and stack against it. Get pulled in close and you are clamped to the stone and
 * crushed. Then the bands round it go from blue to red — the stone *turns* — and it *flings*:
 * everyone is thrown outward, and every stacked plate flies straight out along its spoke and
 * bowls over whoever stands on that line.
 *
 * The plates are nobody's. While the stone draws, the spokes are drawn on the floor for you;
 * put the stone and a plate between you and Magda as it turns and her own claim knocks her down.
 */

const CORE_R = 58;
const CRUSH_R = 100;
const PULL_MS = 3800;
const TURN_MS = 1000;
const FLING_MS = 700;
const REST_MS = 2000;
const PLATE_HIT = 11;
const CRUSH_DMG = 4;

type Phase = 'pull' | 'turn' | 'fling' | 'rest';

interface Plate {
  a: number;
  r: number;
  /** Outward speed during a fling (px/s). */
  v: number;
  spin: number;
  /** Fighters this plate has already struck in the current fling. */
  struck: Set<Fighter>;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const C: Pt = { x: W / 2, y: (top + H) / 2 + 10 };
  const PULL = ctx.hard ? 100 : 84;
  let phase: Phase = 'rest';
  let phaseAt = 0;
  let started = false;
  const plates: Plate[] = [];
  const n = ctx.hard ? 8 : 6;
  for (let i = 0; i < n; i++) {
    plates.push({ a: (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.4, r: 200 + rng() * 110, v: 0, spin: rng() * Math.PI, struck: new Set() });
  }
  const lastCrush = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const flingLeft = new Map<Fighter, number>([[player, 0], [npc, 0]]);

  /** How far out a plate can sit along angle `a` and stay on the floor. */
  const maxR = (a: number): number => {
    const c = Math.cos(a), s = Math.sin(a);
    const rx = c > 0 ? (W - 40 - C.x) / c : c < 0 ? (40 - C.x) / c : Infinity;
    const ry = s > 0 ? (H - 34 - C.y) / s : s < 0 ? (top + 34 - C.y) / s : Infinity;
    return Math.min(rx, ry);
  };
  const platePos = (p: Plate): Pt => ({ x: C.x + Math.cos(p.a) * p.r, y: C.y + Math.sin(p.a) * p.r });

  const hurt = (f: Fighter, amount: number, x: number, y: number) => {
    if (f === player) tk.hitPlayer(amount, x, y);
    else ctx.hit(f, amount, x, y);
  };

  function enter(next: Phase, time: number): void {
    phase = next;
    phaseAt = time;
    if (next === 'pull') { ctx.sfx('magnet-pull'); ctx.float(C.x, C.y - 80, 'THE STONE DRAWS', '#8ab4ff'); }
    if (next === 'turn') { ctx.banner('THE LODESTONE TURNS', '#ff8a7a'); ctx.sfx('electric-charge'); }
    if (next === 'fling') {
      ctx.sfx('gravity-slam');
      ctx.flash(C.x, C.y, NORTH_LIT);
      for (const p of plates) { p.v = 430 + rng() * 60; p.struck.clear(); }
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const d = dist(C.x, C.y, f.x, f.y);
        flingLeft.set(f, clamp(230 - d * 0.35, 70, 220));
      }
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; enter('rest', time); phaseAt = time - REST_MS + 1200; }
      const since = time - phaseAt;
      if (phase === 'rest' && since > REST_MS) enter('pull', time);
      else if (phase === 'pull' && since > (ctx.hard ? PULL_MS - 500 : PULL_MS)) enter('turn', time);
      else if (phase === 'turn' && since > TURN_MS) enter('fling', time);
      else if (phase === 'fling' && since > FLING_MS) enter('rest', time);

      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const dx = f.x - C.x, dy = f.y - C.y;
        const d = Math.hypot(dx, dy) || 1;
        // The stone itself is solid.
        if (d < CORE_R + 16) ctx.nudge(f, (dx / d) * (CORE_R + 16 - d), (dy / d) * (CORE_R + 16 - d));
        if (phase === 'pull' || phase === 'turn') {
          // Drawn in, harder the closer you are — until you are clamped against it.
          const k = phase === 'turn' ? 0.5 : 1;
          const pull = PULL * k * (0.65 + 0.35 * clamp(1 - d / 500, 0, 1));
          if (d > CORE_R + 22) ctx.nudge(f, (-dx / d) * pull * dt, (-dy / d) * pull * dt);
          if (d < CRUSH_R && time - (lastCrush.get(f) ?? 0) > 600) {
            lastCrush.set(f, time);
            hurt(f, CRUSH_DMG, f.x, f.y);
            ctx.float(f.x, f.y - 40, 'CLAMPED', '#8ab4ff');
          }
        }
        const left = flingLeft.get(f) ?? 0;
        if (left > 0) {
          const step = Math.min(left, 620 * dt);
          flingLeft.set(f, left - step);
          ctx.nudge(f, (dx / d) * step, (dy / d) * step);
        }
      }

      for (const p of plates) {
        p.spin += dt * (phase === 'fling' ? 6 : 0.4);
        if (phase === 'pull' || phase === 'turn') {
          p.r = Math.max(CORE_R + 28, p.r - (phase === 'pull' ? 78 : 20) * dt);
        }
        if (p.v > 0) {
          p.r += p.v * dt;
          p.v = Math.max(0, p.v - 520 * dt);
          const mr = maxR(p.a);
          if (p.r > mr) { p.r = mr; p.v = 0; tk.sfx('clang'); }
          if (p.v > 110) {
            const pp = platePos(p);
            for (const f of [player, npc]) {
              if (!alive(f) || p.struck.has(f)) continue;
              if (dist(pp.x, pp.y, f.x, f.y) < 38) {
                p.struck.add(f);
                hurt(f, PLATE_HIT, f.x, f.y);
                ctx.nudge(f, Math.cos(p.a) * 50, Math.sin(p.a) * 50);
                ctx.float(f.x, f.y - 44, 'PLATED', '#ff8a7a');
              }
            }
          }
        }
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      if (phase === 'rest' || phase === 'fling') return null;
      // Off every spoke, out of the crush, and with a spoke running through you if it can manage it.
      const pa = Math.atan2(player.y - C.y, player.x - C.x);
      let best: Pt | null = null;
      let bs = -Infinity;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const gap = plates.reduce((m, p) => Math.min(m, Math.abs(wrapAngle(p.a - a))), Math.PI);
        const away = Math.abs(wrapAngle(a - pa));
        const score = gap * 3 + away * 0.6;
        if (score > bs) { bs = score; best = { x: C.x + Math.cos(a) * 250, y: C.y + Math.sin(a) * 210 }; }
      }
      return best ? { x: clamp(best.x, 60, W - 60), y: clamp(best.y, top + 50, H - 40) } : null;
    },

    drawGround(g, time) {
      const since = time - phaseAt;
      const drawing = phase === 'pull' || phase === 'turn';
      // Filings round the stone: lying in toward it while it draws, bristling outward when it flings.
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        for (let k = 0; k < 7; k++) {
          const r = CORE_R + 30 + k * 34;
          const tilt = drawing ? 0 : phase === 'fling' ? 0.5 : 0.2;
          const x = C.x + Math.cos(a) * r, y = C.y + Math.sin(a) * r * 0.9;
          const len = 7 + (phase === 'fling' ? 5 : 0);
          g.lineStyle(1.5, k % 2 ? FILINGS : dim(FILINGS_LIT, 0.4), 0.7 - k * 0.07);
          g.lineBetween(x, y, x + Math.cos(a + tilt) * len, y + Math.sin(a + tilt) * len);
        }
      }
      // The pull: rings closing in, blue.
      if (drawing) {
        for (let i = 0; i < 4; i++) {
          const ph = 1 - (((since / 900) + i / 4) % 1);
          g.lineStyle(2, SOUTH_LIT, 0.35 * ph); g.strokeCircle(C.x, C.y, CORE_R + 20 + ph * 330);
        }
        g.lineStyle(2, SOUTH, 0.45); g.strokeCircle(C.x, C.y, CRUSH_R);
      }
      // The spokes: where every plate will fly when the stone turns.
      if (phase === 'pull' || phase === 'turn') {
        const k = phase === 'turn' ? clamp(since / TURN_MS, 0, 1) : clamp(since / 2000, 0, 0.35);
        for (const p of plates) {
          const mr = maxR(p.a);
          g.lineStyle(phase === 'turn' ? 4 : 2, NORTH, 0.15 + k * 0.5);
          g.lineBetween(C.x + Math.cos(p.a) * p.r, C.y + Math.sin(p.a) * p.r, C.x + Math.cos(p.a) * mr, C.y + Math.sin(p.a) * mr);
          if (phase === 'turn') {
            for (let d = p.r + 40; d < mr; d += 46) {
              const x = C.x + Math.cos(p.a) * d, y = C.y + Math.sin(p.a) * d;
              g.fillStyle(NORTH_LIT, 0.3 + k * 0.4);
              g.fillTriangle(x + Math.cos(p.a) * 8, y + Math.sin(p.a) * 8, x + Math.cos(p.a + 2.4) * 6, y + Math.sin(p.a + 2.4) * 6, x + Math.cos(p.a - 2.4) * 6, y + Math.sin(p.a - 2.4) * 6);
            }
          }
        }
      }
      // The plates themselves.
      for (const p of plates) {
        const pp = platePos(p);
        const glint = p.v > 110 ? 0.8 : phase === 'turn' ? 0.4 : 0;
        ironPlate(g, pp.x, pp.y, 46, 30, p.a + Math.PI / 2 + (p.v > 0 ? p.spin : 0), glint);
        if (p.v > 110) { g.lineStyle(3, NORTH_LIT, 0.35); g.lineBetween(pp.x, pp.y, pp.x - Math.cos(p.a) * 50, pp.y - Math.sin(p.a) * 50); }
      }
      // The stone.
      g.fillStyle(0x000000, 0.35); g.fillEllipse(C.x + 6, C.y + 22, CORE_R * 2.4, CORE_R * 0.9);
      g.fillStyle(IRON_DARK, 1); g.fillCircle(C.x, C.y, CORE_R + 4);
      g.fillStyle(MAGNETITE, 1); g.fillCircle(C.x, C.y - 3, CORE_R);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.3;
        g.fillStyle(i % 2 ? MAGNETITE_LIT : dim(MAGNETITE_LIT, 0.3), 0.6);
        g.fillTriangle(C.x, C.y - 3, C.x + Math.cos(a) * CORE_R, C.y - 3 + Math.sin(a) * CORE_R, C.x + Math.cos(a + 0.9) * CORE_R, C.y - 3 + Math.sin(a + 0.9) * CORE_R);
      }
      g.fillStyle(RUST, 0.4); g.fillCircle(C.x + 18, C.y + 14, 12);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        g.lineStyle(1.5, FILINGS_LIT, 0.9);
        g.lineBetween(C.x + Math.cos(a) * (CORE_R - 2), C.y - 3 + Math.sin(a) * (CORE_R - 2), C.x + Math.cos(a) * (CORE_R + 6), C.y - 3 + Math.sin(a) * (CORE_R + 6));
      }
      horseshoe(g, C.x - 22, C.y - 30, 0.8, -0.6);
    },

    drawAir(g, time) {
      const since = time - phaseAt;
      // The band round the stone: blue while it draws, red as it turns.
      const turnK = phase === 'turn' ? clamp(since / TURN_MS, 0, 1) : phase === 'fling' ? 1 : 0;
      const band = phase === 'rest' ? dim(SOUTH, 0.4) : turnK > 0 ? NORTH : SOUTH;
      g.lineStyle(7, band, 0.9);
      g.beginPath(); g.arc(C.x, C.y - 3, CORE_R - 8, Math.PI * (1 + turnK), Math.PI * (2 + turnK), false); g.strokePath();
      g.lineStyle(7, phase === 'rest' ? dim(NORTH, 0.4) : turnK > 0 ? SOUTH : NORTH, 0.9);
      g.beginPath(); g.arc(C.x, C.y - 3, CORE_R - 8, Math.PI * turnK, Math.PI * (1 + turnK), false); g.strokePath();
      if (phase === 'pull' || phase === 'turn') glow(g, C.x, C.y, CORE_R + 30, turnK > 0.5 ? NORTH_LIT : SOUTH_LIT, 0.05 + turnK * 0.05, 3);
      if (phase === 'fling' && since < 400) {
        const k = since / 400;
        g.lineStyle(10 * (1 - k), NORTH_LIT, 1 - k); g.strokeCircle(C.x, C.y, CORE_R + k * 260);
      }
      // Sparks crawling over a fighter clamped against the stone.
      for (const f of [player, npc]) {
        if (!alive(f) || (phase !== 'pull' && phase !== 'turn')) continue;
        if (dist(C.x, C.y, f.x, f.y) > CRUSH_R) continue;
        for (let i = 0; i < 4; i++) {
          const a = time / 90 + i * 1.7;
          g.lineStyle(1.5, SPARK, 0.8);
          g.lineBetween(f.x + Math.cos(a) * 14, f.y + Math.sin(a) * 14, f.x + Math.cos(a + 0.5) * 22, f.y + Math.sin(a + 0.5) * 22);
        }
        g.lineStyle(2, lit(SOUTH, 0.3), 0.6); g.lineBetween(f.x, f.y, C.x, C.y);
      }
    },

    drawHud(g, time) {
      // The stone's breath: a bar filling blue as it draws, red as it turns.
      const since = time - phaseAt;
      const w = 220, x0 = W / 2 - w / 2, y = top + 8;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 3, y - 3, w + 6, 14, 6);
      const len = phase === 'pull' ? PULL_MS : phase === 'turn' ? TURN_MS : phase === 'fling' ? FLING_MS : REST_MS;
      const k = clamp(since / len, 0, 1);
      const col = phase === 'pull' ? SOUTH : phase === 'turn' || phase === 'fling' ? NORTH : 0x5a6070;
      g.fillStyle(col, 0.95); g.fillRoundedRect(x0, y, Math.max(3, w * k), 8, 4);
      horseshoe(g, x0 - 16, y + 6, 0.7, 0, phase === 'pull');
    },
  };
}

export const LODESTONE: GimmickDef = {
  id: 'lodestar-lodestone',
  rules: 'The lodestone draws everyone in (too close and you are clamped and crushed), then turns and flings them out — every stacked iron plate flies along its spoke.',
  make,
};
