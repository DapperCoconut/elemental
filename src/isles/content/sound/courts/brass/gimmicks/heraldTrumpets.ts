import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { bandsman, heraldTrumpet } from '../art';
import { BRASS_LIT, BRASS_SHINE, NAVY, SCARLET, SCARLET_LIT } from '../palette';
import { alive, clamp, dist, segInfo, stepDt } from '../util';

/**
 * Herald Trumpets — Herald Clarion.
 *
 * Six of Clarion's trumpeters stand round the walls in scarlet tabards. In turn, each one
 * raises his long trumpet at a fighter — a gold line is traced from his bell, following them
 * — then the line sets, and a beat later he blasts straight down it: a shaft of fanfare that
 * strikes whoever is standing in it, whichever side they're on.
 *
 * A herald does what he is told, and a blow tells him. Strike a trumpeter and he does an
 * about-turn to face the other fighter (his sash changes: scarlet for you, navy for the foe).
 * Clarion has most of them on you to begin with. Turn them round — even one whose line is
 * already set on you — and the fanfare is his.
 */

const TRACK_MS = 560;
const SET_MS = 420;
const BLAST_MS = 260;
const HALF_W = 18;
const DMG = 13;

type Aim = 'player' | 'npc';

interface Herald {
  x: number; y: number;
  aim: Aim;
  /** −1 idle, else when the trumpet came up. */
  raisedAt: number;
  setA: number;
  blastAt: number;
  turnedAt: number;
  hit: Set<Fighter>;
  target: StrikeTarget;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const every = ctx.hard ? 1150 : 1450;
  const spots: [number, number, Aim][] = [
    [W * 0.28, top + 26, 'player'], [W * 0.72, top + 26, 'npc'],
    [W * 0.28, H - 22, 'npc'], [W * 0.72, H - 22, 'player'],
    [26, (top + H) / 2, 'player'], [W - 26, (top + H) / 2, 'player'],
  ];
  const heralds: Herald[] = spots.map(([x, y, aim]) => {
    const h: Herald = {
      x, y, aim, raisedAt: -1, setA: 0, blastAt: -1, turnedAt: -9999, hit: new Set<Fighter>(),
      target: null as unknown as StrikeTarget,
    };
    h.target = ctx.target({
      x, y: y - 20, r: 26,
      onStruck(by) {
        const now = ctx.scene.time.now;
        if (now - h.turnedAt < 600) return;
        const next: Aim = by === 'player' ? 'npc' : 'player';
        if (next === h.aim) return;
        h.aim = next;
        h.turnedAt = now;
        // A herald turned mid-call starts his trace again on his new mark (a short one).
        if (h.raisedAt >= 0 && h.blastAt < 0) h.raisedAt = now - TRACK_MS * 0.4;
        ctx.float(h.x, h.y - 64, 'ABOUT TURN!', next === 'npc' ? '#9ad0ff' : '#ff9a8a');
        ctx.sfx('clang');
      },
    });
    return h;
  });
  let order: number[] = [];
  let nextCall = 0;
  let started = false;

  const mark = (h: Herald): Fighter => (h.aim === 'player' ? player : npc);
  const bellOf = (h: Herald, a: number) => ({ x: h.x + Math.cos(a) * 34, y: h.y - 22 + Math.sin(a) * 34 });
  const laneEnd = (h: Herald, a: number) => ({ x: h.x + Math.cos(a) * 1400, y: h.y - 22 + Math.sin(a) * 1400 });
  const aimNow = (h: Herald, time: number): number => {
    if (h.raisedAt >= 0 && time - h.raisedAt >= TRACK_MS) return h.setA;
    const f = mark(h);
    return Math.atan2(f.y - (h.y - 22), f.x - h.x);
  };

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextCall = time + 900; ctx.banner('HEAR YE — THE HERALDS CALL', '#ffe2a8'); }
      if (time >= nextCall) {
        nextCall = time + every;
        if (!order.length) order = heralds.map((_, i) => i).sort(() => rng() - 0.5);
        const idx = order.shift() ?? 0;
        const h = heralds[idx];
        if (h.raisedAt < 0 && alive(mark(h))) { h.raisedAt = time; h.blastAt = -1; h.hit.clear(); ctx.sfx('beam-charge'); }
      }
      for (const h of heralds) {
        if (h.raisedAt < 0) continue;
        const age = time - h.raisedAt;
        if (age < TRACK_MS) h.setA = aimNow(h, time - 1);
        if (h.blastAt < 0 && age >= TRACK_MS + SET_MS) {
          h.blastAt = time;
          ctx.sfx('light-beam');
          ctx.sfx('train-horn');
        }
        if (h.blastAt >= 0) {
          const b = bellOf(h, h.setA), e = laneEnd(h, h.setA);
          for (const f of [player, npc]) {
            if (!alive(f) || h.hit.has(f)) continue;
            if (segInfo(f.x, f.y, b.x, b.y, e.x, e.y).d < HALF_W + 18) {
              h.hit.add(f);
              ctx.hit(f, DMG, f.x, f.y);
              ctx.float(f.x, f.y - 46, 'TANTARA!', '#fff2b0');
            }
          }
          if (time - h.blastAt > BLAST_MS) { h.raisedAt = -1; h.blastAt = -1; }
        }
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const now = ctx.scene.time.now;
      // Sidestep a set line aimed at you.
      for (const h of heralds) {
        if (h.raisedAt < 0 || h.aim !== 'npc' || now - h.raisedAt < TRACK_MS * 0.6) continue;
        const b = bellOf(h, h.setA), e = laneEnd(h, h.setA);
        if (segInfo(npc.x, npc.y, b.x, b.y, e.x, e.y).d < HALF_W + 50) {
          const pa = h.setA + Math.PI / 2;
          return { x: clamp(npc.x + Math.cos(pa) * 140, 60, W - 60), y: clamp(npc.y + Math.sin(pa) * 140, top + 50, H - 40) };
        }
      }
      // Turn round the nearest herald who has you as his mark.
      let best: Herald | null = null;
      let bd = Infinity;
      for (const h of heralds) {
        if (h.aim !== 'npc') continue;
        const d = dist(npc.x, npc.y, h.x, h.y);
        if (d < bd) { bd = d; best = h; }
      }
      if (best) return { x: clamp(best.x + (best.x < W / 2 ? 50 : -50) * (best.y > top + 60 && best.y < H - 60 ? 1 : 0), 60, W - 60), y: clamp(best.y + (best.y < H / 2 ? 54 : -54), top + 50, H - 40) };
      return { x: clamp(player.x + (npc.x < player.x ? -170 : 170), 60, W - 60), y: clamp(player.y, top + 60, H - 50) };
    },

    drawGround(g, time) {
      for (const h of heralds) {
        // Each herald's sash colour, painted in a ring at his feet: scarlet = you, navy = the foe.
        const c = h.aim === 'player' ? SCARLET_LIT : 0x6a8ae0;
        g.lineStyle(3, c, 0.55); g.strokeEllipse(h.x, h.y + 4, 56, 18);
        if (h.raisedAt < 0) continue;
        const age = time - h.raisedAt;
        const a = h.blastAt >= 0 ? h.setA : aimNow(h, time);
        const b = bellOf(h, a), e = laneEnd(h, a);
        if (h.blastAt < 0) {
          // The traced line: thin while it follows, then thick and set.
          const setK = clamp((age - TRACK_MS) / SET_MS, 0, 1);
          const tracing = age < TRACK_MS;
          g.lineStyle(tracing ? 1.5 : 2 + setK * 3, tracing ? BRASS_LIT : c, tracing ? 0.5 : 0.45 + setK * 0.45);
          g.lineBetween(b.x, b.y, e.x, e.y);
          if (!tracing) {
            g.lineStyle(1, BRASS_SHINE, 0.4);
            g.lineBetween(b.x - Math.sin(a) * HALF_W, b.y + Math.cos(a) * HALF_W, e.x - Math.sin(a) * HALF_W, e.y + Math.cos(a) * HALF_W);
            g.lineBetween(b.x + Math.sin(a) * HALF_W, b.y - Math.cos(a) * HALF_W, e.x + Math.sin(a) * HALF_W, e.y - Math.cos(a) * HALF_W);
          }
          // Little gold pennants tick along the line toward the mark.
          for (let k = 0; k < 6; k++) {
            const u = ((time / 600 + k / 6) % 1) * 600;
            g.fillStyle(BRASS_LIT, 0.5);
            g.fillCircle(b.x + Math.cos(a) * u, b.y + Math.sin(a) * u, 2);
          }
        } else {
          // The blast: a shaft of light with flaring sun-rays.
          const k = clamp((time - h.blastAt) / BLAST_MS, 0, 1);
          g.lineStyle(HALF_W * 2 + 10, lit(BRASS_LIT, 0.5), 0.35 * (1 - k)); g.lineBetween(b.x, b.y, e.x, e.y);
          g.lineStyle(HALF_W * 2, BRASS_LIT, 0.6 * (1 - k)); g.lineBetween(b.x, b.y, e.x, e.y);
          g.lineStyle(6, 0xffffff, 0.8 * (1 - k)); g.lineBetween(b.x, b.y, e.x, e.y);
          for (let r = 0; r < 8; r++) {
            const ra = a + (r - 3.5) * 0.12;
            g.lineStyle(2, BRASS_SHINE, 0.5 * (1 - k)); g.lineBetween(b.x, b.y, b.x + Math.cos(ra) * 90, b.y + Math.sin(ra) * 90);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const h of heralds) {
        const turning = time - h.turnedAt < 400;
        const dir = turning ? (Math.sin((time - h.turnedAt) / 40) > 0 ? 1 : -1) : mark(h).x >= h.x ? 1 : -1;
        bandsman(g, h.x, h.y + 6, 1.05, 'none', 0, dir, h.aim === 'player' ? SCARLET : NAVY, time);
        const a = h.raisedAt >= 0 ? (h.blastAt >= 0 ? h.setA : aimNow(h, time)) : (dir > 0 ? 0.9 : Math.PI - 0.9);
        const glowK = h.blastAt >= 0 ? 1 : h.raisedAt >= 0 ? clamp((time - h.raisedAt) / (TRACK_MS + SET_MS), 0, 1) : 0;
        heraldTrumpet(g, h.x + dir * 4, h.y - 22, a, 30, 0.95, h.aim === 'player' ? SCARLET : NAVY, glowK);
        if (glowK > 0.6) glow(g, h.x + Math.cos(a) * 34, h.y - 22 + Math.sin(a) * 34, 16, BRASS_LIT, 0.08, 2);
      }
    },

    destroy() { for (const h of heralds) h.target.remove(); },
  };
}

export const HERALD_TRUMPETS: GimmickDef = {
  id: 'brass-herald-trumpets',
  rules: 'Heralds round the walls trace a gold line at a fighter, then blast down it. Strike a herald to about-turn him onto the other fighter.',
  make,
};
