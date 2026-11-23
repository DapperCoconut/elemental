import type { Fighter } from '../../../../../../entities/Fighter';
import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { ferryLanding } from '../art';
import { GILT, GILT_DARK, GILT_LIT, INK, LETHE, LETHE_DEEP, LETHE_LIT, SEPIA_DEEP, SEPIA_LIT, STONE, STONE_DARK } from '../palette';
import { alive, clamp, dist, forgetLast, stepDt } from '../util';

/**
 * Lethe — Ferryman Oblivion.
 *
 * Pale pools of Lethe water lie about the landing. Wade in and the water closes your wounds — but
 * it takes as it gives: after a moment in it you *forget your last-used ability* for a few
 * seconds (it will not come when called). The Ferryman knows the trade; when he is losing he
 * goes and drinks, and the water takes from him too. Every pool drains as it is waded, dries,
 * and fills again somewhere else. And there is the ferry bell on its post at the head of the
 * landing: strike it and its toll freezes everyone standing in the Lethe where they stand —
 * ring it on the Ferryman while he drinks. He rings it himself, if you linger in the water.
 */

const POOL_RX = 84;
const POOL_RY = 54;
const WADE_TO_FORGET = 0.9;
const FORGET_MS = 3600;
const DRAIN_PS = 0.085;
const REFILL_MS = 6500;
const BELL_CD = 6000;
const TOLL_STUN = 1100;

interface Pool { x: number; y: number; level: number; refillAt: number; seed: number }
interface Wader { inFor: number; forgetReady: number; healAcc: number; forgotAt: number; outFor: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const spots = [
    { x: 200, y: 260 }, { x: 760, y: 260 }, { x: 480, y: 430 }, { x: 200, y: 540 }, { x: 760, y: 540 },
  ];
  const pools: Pool[] = [];
  const used = new Set<number>();
  const pickSpot = (): { x: number; y: number } => {
    const free = spots.map((s, i) => i).filter((i) => !used.has(i));
    const i = free[Math.floor(rng() * free.length)] ?? 0;
    used.add(i);
    return { x: spots[i].x + (rng() - 0.5) * 40, y: spots[i].y + (rng() - 0.5) * 30 };
  };
  for (let i = 0; i < 3; i++) { const s = pickSpot(); pools.push({ x: s.x, y: s.y, level: 1, refillAt: 0, seed: rng() * 10 }); }
  const waders = new Map<Fighter, Wader>([
    [player, { inFor: 0, forgetReady: 0, healAcc: 0, forgotAt: -9999, outFor: 0 }],
    [npc, { inFor: 0, forgetReady: 0, healAcc: 0, forgotAt: -9999, outFor: 0 }],
  ]);
  const healPs = ctx.hard ? 4 : 5;
  const BELL = { x: W / 2, y: top + 46 };
  let bellReady = 0;
  let tollAt = -9999;
  let ringWarnAt = 0;
  let now = 0;

  const poolOf = (f: Fighter): Pool | null => {
    if (!alive(f)) return null;
    for (const p of pools) {
      if (p.level <= 0) continue;
      const rx = POOL_RX * (0.55 + p.level * 0.45), ry = POOL_RY * (0.55 + p.level * 0.45);
      const dx = (f.x - p.x) / rx, dy = (f.y - p.y) / ry;
      if (dx * dx + dy * dy < 1) return p;
    }
    return null;
  };

  function toll(): void {
    tollAt = now;
    bellReady = now + BELL_CD;
    ctx.sfx('holy-chord');
    for (const f of [player, npc]) {
      if (!poolOf(f)) continue;
      ctx.stun(f, TOLL_STUN);
      ctx.float(f.x, f.y - 50, 'THE BELL TOLLS', '#f2f8f4');
    }
  }

  const bell: StrikeTarget = ctx.target({
    x: BELL.x, y: BELL.y, r: 24,
    onStruck: () => { if (now >= bellReady) toll(); },
  });

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      now = time;
      for (const [f, w] of waders) {
        const p = poolOf(f);
        if (!p) { w.inFor = 0; w.outFor += dt; continue; }
        w.outFor = 0;
        w.inFor += dt;
        p.level = clamp(p.level - DRAIN_PS * dt, 0, 1);
        if (p.level <= 0) { p.refillAt = time + REFILL_MS; ctx.float(p.x, p.y - 20, 'DRUNK DRY', '#c8d6d2'); ctx.sfx('splash'); }
        // The water closes wounds, a little at a time.
        w.healAcc += healPs * dt;
        if (w.healAcc >= 2 && f.hp < f.maxHp) { ctx.heal(f, Math.floor(w.healAcc)); w.healAcc -= Math.floor(w.healAcc); }
        // …and takes the last thing you did.
        if (w.inFor >= WADE_TO_FORGET && time >= w.forgetReady) {
          w.forgetReady = time + FORGET_MS * 0.85;
          w.forgotAt = time;
          if (!forgetLast(f, FORGET_MS)) ctx.silence(f, 1800);
          ctx.float(f.x, f.y - 44, f === player ? 'YOU FORGET…' : 'THE FERRYMAN FORGETS…', '#c8d6d2');
          ctx.sfx('hush');
        }
      }
      // Dry pools fill again somewhere else.
      for (const p of pools) {
        if (p.level > 0 || time < p.refillAt) continue;
        used.clear();
        for (const q of pools) if (q !== p) { const i = spots.findIndex((s) => dist(s.x, s.y, q.x, q.y) < 60); if (i >= 0) used.add(i); }
        const s = pickSpot();
        p.x = s.x; p.y = s.y; p.level = 1; p.seed = rng() * 10;
        ctx.sfx('bubble');
      }
      // The Ferryman rings for you if you linger.
      const pw = waders.get(player);
      if (pw && pw.inFor > 1.6 && time >= bellReady && ringWarnAt === 0) {
        ringWarnAt = time + ctx.tk.warn(800);
        ctx.banner('OBLIVION REACHES FOR THE BELL', '#f2f8f4');
      }
      if (ringWarnAt > 0 && time >= ringWarnAt) { ringWarnAt = 0; if (time >= bellReady) toll(); }
    },

    npcSeek() {
      // He drinks when he is losing.
      const mine = npc.hp / Math.max(1, npc.maxHp), yours = player.hp / Math.max(1, player.maxHp);
      if (mine < 0.45 || mine < yours - 0.08) {
        let best: Pool | null = null, bd = Infinity;
        for (const p of pools) { if (p.level < 0.2) continue; const d = dist(p.x, p.y, npc.x, npc.y); if (d < bd) { bd = d; best = p; } }
        if (best) return { x: best.x, y: best.y };
      }
      // Otherwise keep the dry ground between you, near the bell if you're wading.
      if (poolOf(player)) return { x: BELL.x + (npc.x < BELL.x ? -40 : 40), y: BELL.y + 50 };
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      let x = player.x + Math.cos(a) * 220, y = player.y + Math.sin(a) * 180;
      for (const p of pools) if (dist(p.x, p.y, x, y) < POOL_RX + 20) { x += (x - p.x) * 0.7; y += (y - p.y) * 0.7; }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 60, H - 50) };
    },

    drawGround(g, time) {
      for (const p of pools) {
        const s = 0.55 + p.level * 0.45;
        const rx = POOL_RX * s, ry = POOL_RY * s;
        if (p.level <= 0) {
          // A dry bed: cracked pale silt, drying.
          g.fillStyle(SEPIA_LIT, 0.45); g.fillEllipse(p.x, p.y, POOL_RX * 1.6, POOL_RY * 1.6);
          g.lineStyle(1, SEPIA_DEEP, 0.4);
          for (let i = 0; i < 6; i++) { const a = p.seed + i; g.lineBetween(p.x, p.y, p.x + Math.cos(a) * POOL_RX * 0.7, p.y + Math.sin(a) * POOL_RY * 0.7); }
          continue;
        }
        g.fillStyle(STONE_DARK, 0.8); g.fillEllipse(p.x, p.y + 3, rx * 2 + 12, ry * 2 + 10);
        g.fillStyle(STONE, 1); g.fillEllipse(p.x, p.y, rx * 2 + 8, ry * 2 + 6);
        g.fillStyle(LETHE_DEEP, 1); g.fillEllipse(p.x, p.y, rx * 2, ry * 2);
        g.fillStyle(LETHE, 1); g.fillEllipse(p.x - 4, p.y - 3, rx * 1.8, ry * 1.7);
        // Slow milky rings.
        for (let i = 0; i < 3; i++) {
          const ph = (time / 3000 + i / 3 + p.seed) % 1;
          g.lineStyle(1.2, LETHE_LIT, 0.5 * (1 - ph)); g.strokeEllipse(p.x, p.y, rx * 1.8 * ph, ry * 1.7 * ph);
        }
        // Forgotten letters sinking: little ink glyphs fading as they go down.
        for (let i = 0; i < 5; i++) {
          const ph = (time / 2600 + i / 5 + p.seed) % 1;
          const gx = p.x + Math.cos(i * 2.1 + p.seed) * rx * 0.5, gy = p.y + Math.sin(i * 2.1 + p.seed) * ry * 0.4;
          g.lineStyle(1.2, INK, 0.5 * (1 - ph)); g.lineBetween(gx - 3, gy, gx + 3, gy - 4 * (1 - ph)); g.lineBetween(gx, gy - 3, gx, gy + 3);
        }
      }
      // The bell post's footing.
      g.fillStyle(STONE_DARK, 1); g.fillEllipse(BELL.x, BELL.y + 30, 54, 16);
    },

    drawAir(g, time) {
      // The ferry bell on its post, swinging when tolled; arms reaching for it when Oblivion rings.
      const sw = Math.sin((time - tollAt) / 90) * Math.max(0, 1 - (time - tollAt) / 1400) * 0.6;
      const bx = BELL.x, by = BELL.y;
      g.fillStyle(0x3a2a1c, 1); g.fillRect(bx - 26, by - 30, 4, 60); g.fillRect(bx + 22, by - 30, 4, 60); g.fillRect(bx - 28, by - 32, 56, 5);
      const hx = bx + Math.sin(sw) * 16, hy = by - 26 + Math.cos(sw) * 30;
      g.fillStyle(GILT_DARK, 1); g.fillTriangle(bx + Math.sin(sw) * 4 - 12, hy, bx + Math.sin(sw) * 4 + 12, hy, bx, by - 26);
      g.fillStyle(GILT, 1); g.fillEllipse(hx, hy, 28, 9);
      g.fillStyle(GILT_LIT, 0.8); g.fillEllipse(hx - 5, hy - 8, 6, 10);
      g.fillStyle(0x2a2016, 1); g.fillCircle(hx, hy + 4, 3);
      if (time < bellReady) {
        g.lineStyle(2, LETHE_LIT, 0.4); g.beginPath(); g.arc(bx, by, 30, -Math.PI / 2, -Math.PI / 2 + (1 - (bellReady - time) / BELL_CD) * Math.PI * 2, false); g.strokePath();
      }
      if (time - tollAt < 900) {
        const e = (time - tollAt) / 900;
        for (let i = 0; i < 3; i++) { g.lineStyle(3 - i, LETHE_LIT, 0.6 * (1 - e)); g.strokeCircle(bx, by, 30 + e * (200 + i * 120)); }
      }
      if (ringWarnAt > 0) { g.lineStyle(2, LETHE_LIT, 0.5 + Math.sin(time / 60) * 0.4); g.strokeCircle(bx, by, 36); }
      // A little punt drawn at the lower corner, where the Ferryman tied up.
      ferryLanding(g, W - 90, H - 20);
      // A "?" over anyone who has just forgotten.
      for (const [f, w] of waders) {
        const e = (time - w.forgotAt) / FORGET_MS;
        if (e < 0 || e > 1 || !alive(f)) continue;
        g.fillStyle(LETHE_LIT, 0.9 * (1 - e)); g.fillCircle(f.x, f.y - 52, 9);
        g.lineStyle(2, INK, 1 - e);
        g.beginPath(); g.arc(f.x, f.y - 55, 3.5, Math.PI, Math.PI * 2.4, false); g.strokePath();
        g.fillStyle(INK, 1 - e); g.fillCircle(f.x, f.y - 47, 1.3);
      }
    },

    destroy() { bell.remove(); },
  };
}

export const LETHE_GIMMICK: GimmickDef = {
  id: 'remembrance-lethe',
  rules: 'Lethe pools heal you, but you forget your last-used ability while you wade. Oblivion drinks when he is losing. Strike the bell: whoever is in the water is held.',
  make,
};
