import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { flower, thornStem } from '../art';
import { BLOOM_GOLD, BLOOM_PINK, BLOOM_RED, BLOOM_VIOLET, BLOOM_WHITE, LEAF, SOIL, SOIL_DARK, STEM, THORN, WILT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Deadheading — Pruner Sabine.
 *
 * Blooms come up across three bands of bed soil. Each is a closed bud for a while, then opens
 * *ripe* — gold-edged and nodding. Walk over a ripe bloom and you cut it: it heals whoever cut
 * it. Leave it, and it goes over: the petals brown and drop, and what is left is a knot of bare
 * thorn stems that scratches and slows anyone who walks through it.
 *
 * Sabine is a pruner — she goes for the ripe heads, and every so often she raises her snips and
 * calls the cut: every ripe bloom on the floor wilts at once and turns to thorn. The player's
 * answer is tempo: get to the ripe heads first, cut the ones *near her* before she can, and walk
 * her through the thorn patches she made — the thorns are nobody's, and they scratch her too.
 */

const MAX_BLOOMS = 7;
const BUD_MS = 2200;
const RIPE_MS = 4200;
const WILT_MS = 900;
const THORN_MS = 8500;
const CUT_R = 28;
const THORN_R = 34;
const HEAL = 8;
const SCRATCH = 3;
const SCRATCH_EVERY = 520;

type Stage = 'bud' | 'ripe' | 'wilt' | 'thorn' | 'cut';

interface Bloom {
  x: number; y: number;
  color: number;
  bornAt: number;
  /** When it last changed stage. */
  at: number;
  stage: Stage;
  seed: number;
  /** Whoever cut it (for the little flourish). */
  by: Fighter | null;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const blooms: Bloom[] = [];
  /** Three bands of bed soil across the floor; blooms come up only in them. */
  const bands = [0, 1, 2].map((i) => ({ y: top + 70 + i * ((H - top - 140) / 2), h: 70 }));
  const spawnEvery = ctx.hard ? 1100 : 1500;
  const callEvery = ctx.hard ? 9000 : 11000;
  const colors = [BLOOM_RED, BLOOM_GOLD, BLOOM_VIOLET, BLOOM_PINK, BLOOM_WHITE];
  let started = false;
  let nextSpawn = 0;
  let nextCall = 0;
  let callWarned = false;
  let callFx = 0;
  const lastScratch = new Map<Fighter, number>();

  function spawn(time: number): void {
    const b = bands[Math.floor(rng() * bands.length)];
    // Keep blooms apart so a single walk cuts one, not three.
    for (let tries = 0; tries < 8; tries++) {
      const x = 70 + rng() * (W - 140);
      const y = b.y + (rng() - 0.5) * b.h * 0.7;
      if (blooms.some((o) => o.stage !== 'cut' && dist(o.x, o.y, x, y) < 70)) continue;
      blooms.push({ x, y, color: colors[Math.floor(rng() * colors.length)], bornAt: time, at: time, stage: 'bud', seed: rng() * 10, by: null });
      return;
    }
  }

  function setStage(b: Bloom, s: Stage, time: number): void { b.stage = s; b.at = time; }

  const live = () => blooms.filter((b) => b.stage !== 'cut' && b.stage !== 'thorn').length;
  const onThorns = (f: Fighter) => blooms.some((b) => b.stage === 'thorn' && dist(b.x, b.y, f.x, f.y + 10) < THORN_R);

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        nextSpawn = time + 400;
        nextCall = time + callEvery;
        for (let i = 0; i < 3; i++) spawn(time - BUD_MS * 0.6);
      }
      if (time >= nextSpawn) {
        nextSpawn = time + spawnEvery;
        if (live() < MAX_BLOOMS) spawn(time);
      }
      // Sabine calls the cut: every ripe head wilts.
      if (!callWarned && time >= nextCall - 1500) {
        callWarned = true;
        ctx.banner('SABINE RAISES HER SNIPS', '#ffd0a0');
        ctx.sfx('trap-set');
      }
      if (time >= nextCall) {
        nextCall = time + callEvery;
        callWarned = false;
        callFx = time;
        let n = 0;
        for (const b of blooms) if (b.stage === 'ripe') { setStage(b, 'wilt', time); n++; }
        ctx.banner(n ? 'DEADHEAD!' : 'DEADHEAD! (nothing ripe)', '#ff9a7a');
        ctx.sfx('slash');
      }

      for (let i = blooms.length - 1; i >= 0; i--) {
        const b = blooms[i];
        const age = time - b.at;
        if (b.stage === 'bud' && age >= BUD_MS) { setStage(b, 'ripe', time); ctx.sfx('sparkle'); }
        else if (b.stage === 'ripe' && age >= RIPE_MS) setStage(b, 'wilt', time);
        else if (b.stage === 'wilt' && age >= WILT_MS) { setStage(b, 'thorn', time); ctx.sfx('thorn'); }
        else if (b.stage === 'thorn' && age >= THORN_MS) blooms.splice(i, 1);
        else if (b.stage === 'cut' && age >= 700) blooms.splice(i, 1);
        if (b.stage !== 'ripe') continue;
        // Cut by whoever reaches it first.
        for (const f of [player, npc]) {
          if (!alive(f) || dist(b.x, b.y, f.x, f.y + 8) > CUT_R) continue;
          setStage(b, 'cut', time);
          b.by = f;
          ctx.heal(f, HEAL);
          ctx.float(b.x, b.y - 24, f === player ? `CUT +${HEAL}` : `SABINE CUTS +${HEAL}`, f === player ? '#a8f0a0' : '#ffb0a0');
          ctx.sfx('snap-back');
          break;
        }
      }

      // Thorns scratch anyone in them, Sabine included.
      for (const f of [player, npc]) {
        if (!alive(f) || !onThorns(f)) continue;
        const last = lastScratch.get(f) ?? 0;
        if (time - last < SCRATCH_EVERY) continue;
        lastScratch.set(f, time);
        ctx.hit(f, SCRATCH, f.x, f.y + 10);
      }
    },

    playerSpeedMult: () => (onThorns(player) ? 0.7 : 1),
    npcSpeedMult: () => (onThorns(npc) ? 0.7 : 1),

    npcSeek() {
      // The nearest ripe head, unless the player is much closer to it; then the next.
      let best: Bloom | null = null;
      let bd = Infinity;
      for (const b of blooms) {
        if (b.stage !== 'ripe') continue;
        const dn = dist(npc.x, npc.y, b.x, b.y);
        const dp = dist(player.x, player.y, b.x, b.y);
        if (dp < dn * 0.6) continue;
        if (dn < bd) { bd = dn; best = b; }
      }
      if (best) return { x: best.x, y: best.y - 8 };
      // Nothing ripe: wait by the fattest bud.
      const bud = blooms.filter((b) => b.stage === 'bud').sort((a, b) => a.at - b.at)[0];
      return bud ? { x: bud.x + 30, y: bud.y } : null;
    },

    drawGround(g, time) {
      // The three bands of bed soil, raked.
      for (const b of bands) {
        g.fillStyle(SOIL_DARK, 0.45); g.fillRoundedRect(30, b.y - b.h / 2 - 2, W - 60, b.h + 4, 18);
        g.fillStyle(SOIL, 0.55); g.fillRoundedRect(34, b.y - b.h / 2, W - 68, b.h, 16);
        g.lineStyle(1, SOIL_DARK, 0.5);
        for (let k = -2; k <= 2; k++) g.lineBetween(46, b.y + k * 12, W - 46, b.y + k * 12);
      }
      for (const b of blooms) {
        const age = time - b.at;
        if (b.stage === 'thorn') {
          const fade = age > THORN_MS - 800 ? (THORN_MS - age) / 800 : 1;
          const grow = clamp(age / 400, 0, 1);
          g.fillStyle(0x2a1a10, 0.25 * fade); g.fillCircle(b.x, b.y, THORN_R * grow);
          g.lineStyle(1.2, THORN, 0.4 * fade); g.strokeCircle(b.x, b.y, THORN_R);
          for (let k = 0; k < 5; k++) {
            const a = b.seed + k * 1.26;
            const r1 = THORN_R * 0.9 * grow;
            thornStem(g, [
              { x: b.x + Math.cos(a) * 4, y: b.y + Math.sin(a) * 3 },
              { x: b.x + Math.cos(a + 0.4) * r1 * 0.55, y: b.y + Math.sin(a + 0.4) * r1 * 0.45 - 4 },
              { x: b.x + Math.cos(a + 0.1) * r1, y: b.y + Math.sin(a + 0.1) * r1 * 0.8 - 2 },
            ], 2, fade);
          }
        } else if (b.stage !== 'cut') {
          // A little mound of turned soil and a leaf rosette.
          g.fillStyle(SOIL_DARK, 0.7); g.fillEllipse(b.x, b.y + 4, 26, 9);
          for (let k = 0; k < 4; k++) {
            const a = b.seed + k * (Math.PI / 2);
            g.fillStyle(b.stage === 'wilt' ? WILT : LEAF, 1); g.fillEllipse(b.x + Math.cos(a) * 8, b.y + 3 + Math.sin(a) * 3, 10, 5);
          }
          if (b.stage === 'ripe') {
            const k = age / RIPE_MS;
            // A ring that closes as the head goes over — your window.
            g.lineStyle(2, BLOOM_GOLD, 0.7); g.beginPath(); g.arc(b.x, b.y + 4, CUT_R, -Math.PI / 2, -Math.PI / 2 + (1 - k) * Math.PI * 2, false); g.strokePath();
          }
        }
      }
      if (callFx && time - callFx < 700) {
        const k = (time - callFx) / 700;
        g.lineStyle(3 * (1 - k), 0xff9a7a, 0.6 * (1 - k)); g.strokeCircle(npc.x, npc.y, 30 + k * 300);
      }
    },

    drawAir(g, time) {
      for (const b of blooms) {
        const age = time - b.at;
        if (b.stage === 'thorn') continue;
        if (b.stage === 'cut') {
          // The cut head tumbling away, petals scattering.
          const k = age / 700;
          for (let i = 0; i < 6; i++) {
            const a = b.seed + i;
            g.fillStyle(b.color, 1 - k);
            g.fillEllipse(b.x + Math.cos(a) * k * 30, b.y - 14 - k * 18 + Math.sin(a) * k * 10 + k * k * 30, 5, 3);
          }
          continue;
        }
        const sway = Math.sin(time / 400 + b.seed) * 2;
        const stemH = b.stage === 'bud' ? 10 + (age / BUD_MS) * 8 : 18;
        const droop = b.stage === 'wilt' ? (age / WILT_MS) * 10 : 0;
        g.lineStyle(2, b.stage === 'wilt' ? WILT : STEM, 1);
        g.lineBetween(b.x, b.y + 2, b.x + sway + droop * 0.6, b.y - stemH + droop);
        const hx = b.x + sway + droop * 0.6, hy = b.y - stemH + droop;
        if (b.stage === 'bud') {
          flower(g, hx, hy, 5, b.color, 'bud');
        } else if (b.stage === 'ripe') {
          const pulse = 0.5 + Math.sin(time / 160 + b.seed) * 0.5;
          glow(g, hx, hy, 18, lit(b.color, 0.3), 0.05 + pulse * 0.04, 2);
          flower(g, hx, hy, 9, b.color, 'daisy', 1);
          g.lineStyle(1.5, BLOOM_GOLD, 0.6 + pulse * 0.4); g.strokeCircle(hx, hy, 10);
        } else {
          // Wilting: browned, drooping, dropping petals.
          flower(g, hx, hy, 7, dim(b.color, 0.5), 'daisy', 0.6);
          const k = age / WILT_MS;
          for (let i = 0; i < 3; i++) { g.fillStyle(dim(b.color, 0.4), 1 - k); g.fillEllipse(hx + (i - 1) * 6, hy + k * 22 + i * 3, 4, 3); }
        }
      }
    },
  };
}

export const DEADHEADING: GimmickDef = {
  id: 'bloom-deadheading',
  rules: 'Blooms ripen in the beds: walk over a ripe one to cut it and heal. Left alone, it wilts into thorns that scratch and slow anyone in them. Sabine calls the cut: every ripe bloom wilts.',
  make,
};
