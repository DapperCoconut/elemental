import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow } from '../../../../../art/IsleArt';
import { candle } from '../art';
import { CANDLELIGHT, FLAME, GILT, OAK_DARK, SMOKE, WAX, WAX_RED } from '../palette';
import { alive, dist, stepDt, stillness } from '../util';

/**
 * Candle Vigil — Votary Taper.
 *
 * Four candle-forests stand about the side-chapel: two of Taper's own red votives, two of the
 * pilgrims' white stubs. Kneel among lit candles — stand still inside a forest — and their light
 * heals you, more for every flame still burning. But a candle is a small thing: a blow struck
 * into a forest snuffs three of them, and any fighter hurt inside one puts another out with the
 * gust of it.
 *
 * Taper carries a lit taper on a long brass pole, and goes round her red forests relighting them
 * flame by flame whenever she can spare the time — then kneels in the brightest. The pilgrims'
 * white stubs are never relit by her; a pilgrim creeps in to light one now and again. So snuff
 * her forests before she kneels, and keep a white forest burning for yourself.
 */

const CANDLES = 8;
const R = 70;
const KNEEL_S = 0.45;
const HEAL_PER_FLAME = 0.55;

interface Forest {
  x: number; y: number;
  mine: boolean;              // Taper's red votives (she relights them)
  lit: boolean[];
  target: StrikeTarget | null;
  snuffFx: number;
  relightAt: number;
  gustAt: number;
  hs: number[];               // candle heights
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const still = stillness();
  const kneelTime = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const healAcc = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const forests: Forest[] = [
    { x: 170, y: top + 120, mine: true },
    { x: W - 170, y: H - 100, mine: true },
    { x: W - 170, y: top + 120, mine: false },
    { x: 170, y: H - 100, mine: false },
  ].map((f) => ({ ...f, lit: Array.from({ length: CANDLES }, () => true), target: null, snuffFx: 0, relightAt: 0, gustAt: 0, hs: Array.from({ length: CANDLES }, () => 10 + rng() * 12) }));
  let started = false;
  let nextPilgrim = 0;

  const litCount = (f: Forest) => f.lit.filter(Boolean).length;
  const forestOf = (x: number, y: number) => forests.find((f) => dist(f.x, f.y, x, y) < R) ?? null;
  const candlePos = (f: Forest, i: number) => {
    const a = (i / CANDLES) * Math.PI * 2 + (f.mine ? 0.2 : 0.6);
    const rr = i % 2 ? 40 : 24;
    return { x: f.x + Math.cos(a) * rr, y: f.y + Math.sin(a) * rr * 0.7 };
  };

  function snuff(f: Forest, n: number, time: number): void {
    let k = 0;
    for (let i = 0; i < CANDLES && k < n; i++) {
      const j = (i * 3 + Math.floor(time / 97)) % CANDLES;
      if (f.lit[j]) { f.lit[j] = false; k++; }
    }
    if (k > 0) { f.snuffFx = time; ctx.sfx('hush'); }
  }

  function gust(x: number, y: number, time: number): void {
    const f = forestOf(x, y);
    if (!f || time - f.gustAt < 300) return;
    f.gustAt = time;
    snuff(f, 1, time);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextPilgrim = time + 4000;
        for (const f of forests) {
          f.target = ctx.target({
            x: f.x, y: f.y, r: 46, passThrough: true,
            onStruck: (by) => {
              const now = ctx.scene.time.now;
              // Taper never snuffs her own.
              if (litCount(f) === 0 || (by === 'npc' && f.mine)) return;
              snuff(f, 3, now);
              ctx.float(f.x, f.y - 50, 'SNUFFED', '#d8d4e4');
            },
          });
        }
      }

      // Kneeling: standing still among lit candles heals.
      for (const fi of [player, npc]) {
        if (!alive(fi)) continue;
        const s = still(fi, dt);
        kneelTime.set(fi, s);
        const f = forestOf(fi.x, fi.y);
        if (!f || s < KNEEL_S) continue;
        const n = litCount(f);
        if (!n) continue;
        const rate = HEAL_PER_FLAME * n * (fi === player && ctx.hard ? 0.8 : 1);
        const acc = (healAcc.get(fi) ?? 0) + rate * dt;
        if (acc >= 2) { ctx.heal(fi, Math.floor(acc)); healAcc.set(fi, acc - Math.floor(acc)); } else healAcc.set(fi, acc);
      }

      // Taper relights her own forests, flame by flame, when she stands in one.
      for (const f of forests) {
        if (!f.mine || !alive(npc) || dist(npc.x, npc.y, f.x, f.y) > R - 6) continue;
        if (time < f.relightAt) continue;
        const j = f.lit.indexOf(false);
        if (j < 0) continue;
        f.lit[j] = true;
        f.relightAt = time + (ctx.hard ? 380 : 520);
        const p = candlePos(f, j);
        ctx.flash(p.x, p.y - 20, FLAME);
        ctx.sfx('sizzle');
      }

      // Now and then a pilgrim creeps in and lights one white stub.
      if (time >= nextPilgrim) {
        nextPilgrim = time + 4200 + rng() * 1600;
        const f = forests.filter((x) => !x.mine && litCount(x) < CANDLES).sort((a, b) => litCount(a) - litCount(b))[0];
        if (f) {
          const j = f.lit.indexOf(false);
          f.lit[j] = true;
          const p = candlePos(f, j);
          ctx.float(p.x, p.y - 30, 'a pilgrim lights one', '#ffe2a8');
        }
      }
    },

    onPlayerHurt() { gust(player.x, player.y, ctx.scene.time.now); },
    onNpcHurt() { gust(npc.x, npc.y, ctx.scene.time.now); },

    npcSeek() {
      const mine = forests.filter((f) => f.mine);
      const hurt = npc.hp < npc.maxHp * 0.7;
      // Hurt: kneel in the brightest forest (her own first), unless you are standing in it.
      if (hurt) {
        const best = [...forests].sort((a, b) => litCount(b) + (b.mine ? 1 : 0) - litCount(a) - (a.mine ? 1 : 0))
          .find((f) => litCount(f) >= 3 && dist(f.x, f.y, player.x, player.y) > 120);
        if (best) return { x: best.x, y: best.y };
      }
      // Otherwise: tend whichever of her forests is darkest, if it is dark enough to bother.
      const dark = mine.filter((f) => litCount(f) <= CANDLES - 3).sort((a, b) => litCount(a) - litCount(b))[0];
      if (dark) return { x: dark.x, y: dark.y };
      return null;
    },

    drawGround(g, time) {
      for (const f of forests) {
        const n = litCount(f);
        // The forest's floor: a stone step with a drip-tray of wax, lit by what still burns.
        g.fillStyle(0x3a3634, 0.55); g.fillEllipse(f.x, f.y + 6, R * 2.1, R * 1.3);
        g.fillStyle(0x5a5450, 0.6); g.fillEllipse(f.x, f.y + 2, R * 1.9, R * 1.15);
        g.fillStyle(WAX, 0.35); g.fillEllipse(f.x + 8, f.y + 8, R * 1.2, R * 0.5);
        if (n > 0) glow(g, f.x, f.y, R + 20, CANDLELIGHT, 0.015 + n * 0.008, 3);
        // A kneeling-ring: where to stand still.
        g.lineStyle(2, f.mine ? WAX_RED : WAX, 0.25 + (n / CANDLES) * 0.4); g.strokeEllipse(f.x, f.y, R * 2, R * 1.3);
        // An iron pricket at the heart, with a gilt coin-box.
        g.fillStyle(OAK_DARK, 1); g.fillRect(f.x - 8, f.y - 4, 16, 9);
        g.fillStyle(GILT, 1); g.fillRect(f.x - 4, f.y - 2, 8, 2);
      }
      // The kneelers' halo on the floor.
      for (const fi of [player, npc]) {
        if (!alive(fi)) continue;
        const f = forestOf(fi.x, fi.y);
        if (!f || (kneelTime.get(fi) ?? 0) < KNEEL_S || !litCount(f)) continue;
        const ph = (time / 900) % 1;
        g.lineStyle(2, CANDLELIGHT, 0.6 * (1 - ph)); g.strokeCircle(fi.x, fi.y + 4, 14 + ph * 26);
      }
    },

    drawAir(g, time) {
      for (const f of forests) {
        for (let i = 0; i < CANDLES; i++) {
          const p = candlePos(f, i);
          const flick = Math.sin(time / 90 + i * 1.7 + f.x) * 0.8;
          candle(g, p.x, p.y, f.hs[i], f.lit[i], f.mine ? WAX_RED : WAX, flick);
          if (f.lit[i]) glow(g, p.x, p.y - f.hs[i] - 6, 10, CANDLELIGHT, 0.05, 2);
        }
        // Smoke curls up from freshly snuffed wicks.
        if (time - f.snuffFx < 1400) {
          const k = (time - f.snuffFx) / 1400;
          for (let i = 0; i < 6; i++) {
            const x = f.x - 30 + i * 12 + Math.sin(time / 200 + i) * 6 * k;
            g.fillStyle(SMOKE, 0.35 * (1 - k)); g.fillCircle(x, f.y - 30 - k * 50 - i * 3, 4 + k * 8);
          }
        }
        // Taper's taper, when she is relighting here.
        if (f.mine && alive(npc) && dist(npc.x, npc.y, f.x, f.y) < R - 6 && f.lit.includes(false)) {
          g.lineStyle(2.5, GILT, 1); g.lineBetween(npc.x + 10, npc.y - 10, npc.x + 34, npc.y - 52);
          g.fillStyle(FLAME, 0.9); g.fillEllipse(npc.x + 35, npc.y - 58, 5, 10);
        }
      }
      // A meter over each kneeling fighter: flames counted in their forest.
      for (const fi of [player, npc]) {
        if (!alive(fi)) continue;
        const f = forestOf(fi.x, fi.y);
        if (!f) continue;
        const n = litCount(f);
        for (let i = 0; i < CANDLES; i++) {
          const x = fi.x - (CANDLES - 1) * 3.5 + i * 7, y = fi.y - 48;
          g.fillStyle(i < n ? FLAME : dim(SMOKE, 0.4), i < n ? 1 : 0.6); g.fillCircle(x, y, 2.2);
        }
      }
    },

    destroy() { for (const f of forests) f.target?.remove(); },
  };
}

export const CANDLE_VIGIL: GimmickDef = {
  id: 'cathedral-candle-vigil',
  rules: 'Stand still among lit candles to heal — more for every flame. Strike a forest to snuff it. Taper relights her red ones; pilgrims, the white.',
  make,
};
