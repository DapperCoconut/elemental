import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, mixC } from '../../../../../art/IsleArt';
import { crystalPoint } from '../art';
import { AMETHYST, AMETHYST_DARK, AMETHYST_LIT, QUARTZ } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Druse — Grower Druse.
 *
 * Druse farms crystal in the gardens: a seed set in slurry and fed, and in a season it is a point
 * a hand high. Here he feeds them with blows. Wherever a hit lands, a seed of amethyst takes and
 * starts to grow: a cluster that swells over five seconds, shoving aside anyone standing where it
 * wants to be. A grown cluster stands between fighters like a wall — a blow that has to pass
 * through one is caught by the crystal and arrives at less than half its strength. At full size it
 * cracks, glows, and shatters in a ring of shards that hurts anyone near.
 *
 * So every hit you land plants a bomb at your foe's feet, and every hit you take plants one at
 * yours. Shelter behind the young ones; don't be near a ripe one. Druse sows on his own, too.
 */

const GROW_MS = 5000;
const RIPE_MS = 950;
const R0 = 8, R1 = 46;
const BLAST_R = 112;
const MAX = 9;

interface Druse { x: number; y: number; born: number; seed: number; done: boolean; doneAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const blast = ctx.hard ? 15 : 12;
  const crystals: Druse[] = [];
  let ownHit = false;
  let nextSow = 0;
  let started = false;
  const lastSeed = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);

  const radius = (c: Druse, time: number) => R0 + (R1 - R0) * clamp((time - c.born) / GROW_MS, 0, 1);
  const ripe = (c: Druse, time: number) => time - c.born >= GROW_MS;
  const live = (time: number) => crystals.filter((c) => !c.done && time - c.born < GROW_MS + RIPE_MS);

  function seed(x: number, y: number, time: number): void {
    if (live(time).length >= MAX) return;
    if (crystals.some((c) => !c.done && dist(c.x, c.y, x, y) < 52)) return;
    crystals.push({ x: clamp(x, 50, W - 50), y: clamp(y, top + 40, H - 30), born: time, seed: rng() * 10, done: false, doneAt: 0 });
    ctx.sfx('crystal-chime');
  }

  /** Is a grown crystal standing between the other fighter and `f`? */
  function sheltered(f: Fighter, time: number): boolean {
    const o = f === player ? npc : player;
    if (!alive(o)) return false;
    return live(time).some((c) => {
      const r = radius(c, time);
      if (r < 22) return false;
      if (dist(c.x, c.y, f.x, f.y) < r + 6 || dist(c.x, c.y, o.x, o.y) < r + 6) return false;
      return segDist(c.x, c.y, o.x, o.y, f.x, f.y) < r * 0.85;
    });
  }

  function onHurt(f: Fighter): void {
    if (ownHit || !alive(f)) return;
    const now = ctx.scene.time.now;
    if (now - (lastSeed.get(f) ?? 0) < 650) return;
    lastSeed.set(f, now);
    seed(f.x + (rng() - 0.5) * 20, f.y + 10, now);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSow = time + 2500; }
      // Druse sows: a seed flicked at your feet.
      if (time >= nextSow && alive(npc) && alive(player)) {
        nextSow = time + (ctx.hard ? 5200 : 6800);
        const a = Math.atan2(player.y - npc.y, player.x - npc.x);
        seed(player.x - Math.cos(a) * 40, player.y - Math.sin(a) * 40, time);
        ctx.float(npc.x, npc.y - 50, 'SOWN', '#d8b8ff');
      }
      for (const c of crystals) {
        if (c.done) continue;
        const r = radius(c, time);
        // Growing crystal shoulders fighters aside.
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const d = dist(c.x, c.y, f.x, f.y);
          const want = r + 16;
          if (d < want) {
            const a = d < 1 ? rng() * Math.PI * 2 : Math.atan2(f.y - c.y, f.x - c.x);
            const push = Math.min(want - d, 160 * dt + (want - d) * 0.25);
            ctx.nudge(f, Math.cos(a) * push, Math.sin(a) * push);
          }
        }
        // Ripe: it cracks, then shatters.
        if (time - c.born >= GROW_MS + RIPE_MS) {
          c.done = true; c.doneAt = time;
          ctx.sfx('crystal-shatter');
          ownHit = true;
          for (const f of [player, npc]) {
            if (alive(f) && dist(c.x, c.y, f.x, f.y) < BLAST_R) ctx.hit(f, blast, f.x, f.y);
          }
          ownHit = false;
          ctx.flash(c.x, c.y - 20, AMETHYST_LIT);
        }
      }
      for (let i = crystals.length - 1; i >= 0; i--) if (crystals[i].done && time - crystals[i].doneAt > 700) crystals.splice(i, 1);
    },

    playerTakenMult() { return sheltered(player, ctx.scene.time.now) ? 0.45 : 1; },
    npcTakenMult() { return sheltered(npc, ctx.scene.time.now) ? 0.45 : 1; },
    onPlayerHurt() { onHurt(player); },
    onNpcHurt() { onHurt(npc); },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const time = ctx.scene.time.now;
      // Clear out from anything ripe.
      for (const c of live(time)) {
        if (time - c.born > GROW_MS - 900 && dist(c.x, c.y, npc.x, npc.y) < BLAST_R + 30) {
          const a = Math.atan2(npc.y - c.y, npc.x - c.x);
          return { x: clamp(c.x + Math.cos(a) * (BLAST_R + 70), 60, W - 60), y: clamp(c.y + Math.sin(a) * (BLAST_R + 70), top + 50, H - 40) };
        }
      }
      // Shelter behind a young, grown-enough crystal, on the side away from you.
      let best: Pt | null = null, bd = Infinity;
      for (const c of live(time)) {
        const r = radius(c, time);
        if (r < 24 || time - c.born > GROW_MS - 1400) continue;
        const a = Math.atan2(c.y - player.y, c.x - player.x);
        const p = { x: c.x + Math.cos(a) * (r + 30), y: c.y + Math.sin(a) * (r + 30) };
        const d = dist(p.x, p.y, npc.x, npc.y);
        if (d < bd) { bd = d; best = p; }
      }
      if (best) return { x: clamp(best.x, 60, W - 60), y: clamp(best.y, top + 50, H - 40) };
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 230, 60, W - 60), y: clamp(player.y + Math.sin(a) * 200, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const c of crystals) {
        if (c.done) {
          const k = (time - c.doneAt) / 700;
          g.lineStyle(4 * (1 - k), AMETHYST_LIT, 1 - k); g.strokeCircle(c.x, c.y, BLAST_R * (0.4 + k * 0.6));
          continue;
        }
        const r = radius(c, time);
        // Slurry stain and the blast radius, which darkens as it ripens.
        g.fillStyle(AMETHYST_DARK, 0.25); g.fillEllipse(c.x, c.y + 4, r * 2.4, r * 1.0);
        const ripeK = clamp((time - c.born - (GROW_MS - 1500)) / 1500, 0, 1);
        if (ripeK > 0) {
          g.lineStyle(2, AMETHYST_LIT, 0.2 + ripeK * 0.5); g.strokeCircle(c.x, c.y, BLAST_R);
          g.fillStyle(AMETHYST, 0.05 + ripeK * 0.08); g.fillCircle(c.x, c.y, BLAST_R);
        }
      }
    },

    drawAir(g, time) {
      const sorted = crystals.filter((c) => !c.done).sort((a, b) => a.y - b.y);
      for (const c of sorted) {
        const r = radius(c, time);
        const isRipe = ripe(c, time);
        const shake = isRipe ? Math.sin(time / 25 + c.seed) * 2 : 0;
        const n = 3 + Math.floor((r / R1) * 5);
        for (let i = 0; i < n; i++) {
          const t = n === 1 ? 0 : i / (n - 1) - 0.5;
          const col = mixC(AMETHYST, i % 3 === 0 ? QUARTZ : AMETHYST_LIT, 0.2 + ((i * 37 + Math.floor(c.seed * 10)) % 10) / 30);
          crystalPoint(g, c.x + t * r * 1.1 + shake, c.y, r * 0.34, r * (1.5 - Math.abs(t) * 1.2), t * 1.1, col);
        }
        if (isRipe) {
          const k = (time - c.born - GROW_MS) / RIPE_MS;
          glow(g, c.x, c.y - r * 0.7, r * 1.3, AMETHYST_LIT, 0.06 + k * 0.1, 3);
          // Cracks racing through it.
          g.lineStyle(1.5, 0xffffff, 0.5 + k * 0.5);
          for (let i = 0; i < 4; i++) {
            const a = c.seed + i * 1.6;
            g.lineBetween(c.x, c.y - r * 0.6, c.x + Math.cos(a) * r * 0.6 * k, c.y - r * 0.6 + Math.sin(a) * r * 0.5 * k);
          }
        }
      }
      // Shards flying from fresh shatters.
      for (const c of crystals) {
        if (!c.done) continue;
        const k = (time - c.doneAt) / 700;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + c.seed;
          const d = k * BLAST_R;
          crystalPoint(g, c.x + Math.cos(a) * d, c.y - 20 + Math.sin(a) * d * 0.8 + k * k * 30, 4, 10, a + Math.PI / 2, AMETHYST_LIT, 1 - k);
        }
      }
    },

    drawHud(g, time) {
      // A little tally of how many clusters are growing.
      const n = live(time).length;
      for (let i = 0; i < MAX; i++) {
        g.fillStyle(i < n ? AMETHYST_LIT : 0x000000, i < n ? 0.9 : 0.35);
        g.fillTriangle(W / 2 - 72 + i * 16, top + 22, W / 2 - 66 + i * 16, top + 8, W / 2 - 60 + i * 16, top + 22);
      }
    },
  };
}

export const DRUSE: GimmickDef = {
  id: 'geode-druse',
  rules: 'Every hit plants crystal where it lands. Grown crystal shoves feet aside and halves blows through it — then ripens and shatters.',
  make,
};
