import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { HONEY, PLAYER_TINT, FOE_TINT, dist, skep, bee } from '../art';

/**
 * Hive Mind — Apiarist Hum's yard.
 *
 * A straw skep stands in each corner, slowly filling with honey. Strike a full hive (shoulder
 * into it) and you take its honey — a heal and a few seconds of sweetened hits — but the hive
 * remembers you: a beat later it boils over and its swarm hunts whoever struck it last. A full
 * hive nobody claims overflows on its own and swarms the nearest fighter.
 *
 * Swarms are slower than either fighter and they sting *anything* they fly through, mark or not.
 * That is the whole game: claim honey, then drag your swarm across Hum. Hum plays it too — she
 * claims hives when she is hurt or you are far, and when hunted she runs to put you between
 * herself and the bees.
 */

const FILL_MS = 8000;
const OVERFLOW_MS = 6000;
const STRIKE_R = 54;
const HONEY_HEAL = 14;
const SWEET_MS = 4000;
const SWEET_MULT = 1.2;
const ANGER_MS = 1400;
const SWARM_MS = 6000;
const SWARM_SPEED = 160;
const SWARM_SPEED_HARD = 176;
const SWARM_R = 40;
const STING_DAMAGE = 4;
const STING_EVERY_MS = 350;
const BEES = 18;

type Side = 'player' | 'npc';

interface Hive { x: number; y: number; honey: number; fullAt: number; mark: Side | null; angryUntil: number }
interface Swarm { x: number; y: number; mark: Side; bornAt: number; dieAt: number; lastSting: Map<Fighter, number>; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const swarmSpeed = ctx.hard ? SWARM_SPEED_HARD : SWARM_SPEED;
  const hives: Hive[] = [
    { x: 92, y: top + 74 }, { x: W - 92, y: top + 74 }, { x: 92, y: H - 64 }, { x: W - 92, y: H - 64 },
  ].map((p, i) => ({ ...p, honey: 0.15 + i * 0.18 + rng() * 0.1, fullAt: 0, mark: null, angryUntil: 0 }));
  let swarms: Swarm[] = [];
  let playerSweetUntil = 0;
  let npcSweetUntil = 0;
  let announced = false;

  const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;

  const strike = (h: Hive, side: Side, time: number): void => {
    const f = fighterOf(side);
    h.honey = 0; h.fullAt = 0; h.mark = side; h.angryUntil = time + ANGER_MS;
    ctx.heal(f, HONEY_HEAL);
    if (side === 'player') playerSweetUntil = time + SWEET_MS; else npcSweetUntil = time + SWEET_MS;
    ctx.float(h.x, h.y - 64, side === 'player' ? 'HONEY! (they know you)' : 'HUM TAKES THE HONEY', '#ffd36a');
    ctx.sfx('bubble');
  };

  const release = (h: Hive, mark: Side, time: number): void => {
    swarms.push({ x: h.x, y: h.y - 20, mark, bornAt: time, dieAt: time + SWARM_MS, lastSting: new Map(), seed: rng() * 100 });
    ctx.sfx('drone-buzz');
    ctx.float(h.x, h.y - 70, mark === 'player' ? 'SWARM → YOU' : 'SWARM → HUM', mark === 'player' ? '#8fd4ff' : '#ffb08a');
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('MIND THE HIVES', '#ffd36a'); }
      for (const h of hives) {
        if (h.angryUntil && time >= h.angryUntil) {
          h.angryUntil = 0;
          if (h.mark) release(h, h.mark, time);
        }
        if (h.honey < 1) {
          h.honey = Math.min(1, h.honey + (dt * 1000) / FILL_MS);
          if (h.honey >= 1) h.fullAt = time;
          continue;
        }
        // Full: whoever touches it first claims it.
        for (const side of ['player', 'npc'] as Side[]) {
          const f = fighterOf(side);
          if (alive(f) && dist(f.x, f.y, h.x, h.y) < STRIKE_R) { strike(h, side, time); break; }
        }
        if (h.honey >= 1 && time - h.fullAt > OVERFLOW_MS) {
          const p = ctx.player, n = ctx.npc;
          const side: Side = dist(p.x, p.y, h.x, h.y) <= dist(n.x, n.y, h.x, h.y) ? 'player' : 'npc';
          h.honey = 0; h.fullAt = 0; h.mark = side;
          ctx.float(h.x, h.y - 64, 'OVERFLOWING', '#ffd36a');
          release(h, side, time);
        }
      }

      for (const s of swarms) {
        const target = fighterOf(s.mark);
        if (alive(target)) {
          const d = dist(s.x, s.y, target.x, target.y);
          if (d > 2) {
            const step = Math.min(d, swarmSpeed * dt);
            s.x += ((target.x - s.x) / d) * step;
            s.y += ((target.y - s.y) / d) * step;
          }
        }
        // Stings land on anyone the cloud passes over.
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f) || dist(s.x, s.y, f.x, f.y) > SWARM_R + 12) continue;
          const last = s.lastSting.get(f) ?? 0;
          if (time - last >= STING_EVERY_MS) {
            s.lastSting.set(f, time);
            ctx.hit(f, STING_DAMAGE, f.x, f.y);
          }
        }
      }
      swarms = swarms.filter((s) => time < s.dieAt);
    },

    npcTakenMult() { return ctx.scene.time.now < playerSweetUntil ? SWEET_MULT : 1; },
    playerTakenMult() { return ctx.scene.time.now < npcSweetUntil ? SWEET_MULT : 1; },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const hunting = swarms.find((s) => s.mark === 'npc');
      if (hunting) {
        // Run so that you stand between her and her bees.
        const a = Math.atan2(p.y - hunting.y, p.x - hunting.x);
        return { x: p.x + Math.cos(a) * 90, y: p.y + Math.sin(a) * 90 };
      }
      const hurt = n.hp / n.maxHp < 0.7;
      let best: Hive | null = null; let bd = Infinity;
      for (const h of hives) {
        if (h.honey < 1 || h.angryUntil) continue;
        const dn = dist(n.x, n.y, h.x, h.y);
        const dp = dist(p.x, p.y, h.x, h.y);
        if (!hurt && dp < 280) continue;
        if (dn < bd && dn < dp + 60) { bd = dn; best = h; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      for (const h of hives) {
        // The honey a full hive has wept onto the boards.
        if (h.honey >= 1) {
          const k = Math.min(1, (time - h.fullAt) / OVERFLOW_MS);
          g.fillStyle(HONEY, 0.35 + k * 0.3); g.fillEllipse(h.x, h.y + 10, 46 + k * 40, 16 + k * 14);
          g.lineStyle(2, HONEY, 0.5 + 0.4 * Math.abs(Math.sin(time / 200)));
          g.strokeCircle(h.x, h.y - 10, STRIKE_R);
        }
      }
      // A marked hive's swarm draws a thin line to its quarry — who is being hunted is never a guess.
      for (const s of swarms) {
        const f = fighterOf(s.mark);
        g.lineStyle(1.5, s.mark === 'player' ? PLAYER_TINT : FOE_TINT, 0.35);
        const segs = 10;
        for (let i = 0; i < segs; i += 2) {
          const a = i / segs, b = (i + 1) / segs;
          g.lineBetween(s.x + (f.x - s.x) * a, s.y + (f.y - s.y) * a, s.x + (f.x - s.x) * b, s.y + (f.y - s.y) * b);
        }
        g.fillStyle(0x000000, 0.12); g.fillEllipse(s.x, s.y + 22, SWARM_R * 2, SWARM_R * 0.7);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const h of hives) {
        const angry = h.angryUntil > 0;
        const shake = angry ? Math.sin(time / 25) * 3 : 0;
        skep(g, h.x + shake, h.y, 26, h.honey);
        // Honey gauge: a ring of comb cells round the skep's foot.
        for (let i = 0; i < 6; i++) {
          const filled = h.honey * 6 >= i + 1;
          const a = Math.PI * (0.15 + i * 0.14);
          const x = h.x + Math.cos(a) * 34, y = h.y - 8 + Math.sin(a) * 14;
          g.fillStyle(filled ? HONEY : 0x4a3a20, filled ? 1 : 0.6); g.fillCircle(x, y, 3.2);
        }
        // Who it remembers.
        if (h.mark) {
          g.fillStyle(h.mark === 'player' ? PLAYER_TINT : FOE_TINT, 0.95);
          g.fillTriangle(h.x - 6, h.y - 66, h.x + 6, h.y - 66, h.x, h.y - 58);
        }
        // Idle bees around a hive.
        const idle = angry ? 10 : 3;
        for (let i = 0; i < idle; i++) {
          const a = t * (angry ? 5 : 1.6) + i * 2.1;
          bee(g, h.x + Math.cos(a) * (18 + i * 3) + shake, h.y - 30 + Math.sin(a * 1.3) * 12, t, i);
        }
      }
      for (const s of swarms) {
        const life = (s.dieAt - time) / SWARM_MS;
        for (let i = 0; i < BEES; i++) {
          const a = t * (3 + (i % 5)) + i * 1.7 + s.seed;
          const r = 8 + ((i * 7) % 26) * (0.7 + Math.sin(t * 4 + i) * 0.3);
          bee(g, s.x + Math.cos(a) * r, s.y + Math.sin(a * 1.2) * r * 0.75, t, i + s.seed, life < 0.2 ? 0.8 : 1.1);
        }
      }
    },
  };
}

export const HIVE_MIND: GimmickDef = {
  id: 'candlewick-hive',
  rules: 'Touch a full hive for honey — its swarm then hunts you. Swarms sting ANYONE they pass: drag yours through Hum.',
  make,
};
