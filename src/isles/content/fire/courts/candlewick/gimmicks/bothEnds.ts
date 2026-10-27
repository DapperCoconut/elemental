import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { WAX, WICK, PLAYER_TINT, FOE_TINT, dist, flame } from '../art';

/**
 * Both Ends — Wickling Dross, a little candle-man who has been lit at both ends since birth.
 *
 * In his alley *everyone* is a candle. Both fighters burn down a point of health a second (two
 * once below half — lit at both ends), never past a fifth of their health, where the wick
 * drowns in its own pool. As each burns, they hit harder: your damage scales with how far *you*
 * have burned, his with how far he has. A candle crown over each head shows the wick shortening
 * and the flame growing.
 *
 * Every burn tick drips a bead of the burner's wax onto the floor. Walk over the *other*
 * fighter's beads to melt them into your own candle — a little health back, at the cost of the
 * heat that health was buying. Dross hunts your beads when he is cooling off; deny him.
 */

const BURN_PER_S = 1;
const BURN_PER_S_HARD = 1.4;
const BOTH_ENDS_AT = 0.5;
const FLOOR_RATIO = 0.2;
const HEAT_GAIN = 0.75;
const BEAD_HEAL = 3;
const BEAD_LIFE_MS = 11000;
const BEAD_PICK_R = 24;
const BEAD_CAP = 14;

type Side = 'player' | 'npc';
interface Bead { x: number; y: number; owner: Side; bornAt: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, rng } = ctx;
  const burn = ctx.hard ? BURN_PER_S_HARD : BURN_PER_S;
  let beads: Bead[] = [];
  const acc: Record<Side, number> = { player: 0, npc: 0 };
  let announced = false;
  const bothEndsSaid: Record<Side, boolean> = { player: false, npc: false };

  const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
  const ratio = (f: Fighter): number => Math.max(0, f.hp / f.maxHp);
  /** How much harder a fighter hits for having burned this far down. */
  const heat = (f: Fighter): number => 1 + HEAT_GAIN * (1 - ratio(f));

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('LIT AT BOTH ENDS', '#ffb46a'); }
      for (const side of ['player', 'npc'] as Side[]) {
        const f = fighterOf(side);
        if (!f.active || f.hp <= 0) continue;
        const r = ratio(f);
        if (r <= FLOOR_RATIO) { acc[side] = 0; continue; }
        const rate = r < BOTH_ENDS_AT ? burn * 2 : burn;
        if (r < BOTH_ENDS_AT && !bothEndsSaid[side]) {
          bothEndsSaid[side] = true;
          ctx.float(f.x, f.y - 60, 'BOTH ENDS!', side === 'player' ? '#9fdcff' : '#ffb08a');
          ctx.sfx('flame-burst');
        }
        acc[side] += rate * dt;
        if (acc[side] >= 1) {
          const n = Math.floor(acc[side]);
          acc[side] -= n;
          // Never burn through the floor.
          // Burn damage is still scaled by the other side's heat, so leave room for it.
          const room = Math.floor((f.hp - f.maxHp * FLOOR_RATIO) / (1 + HEAT_GAIN));
          const dmg = Math.min(n, Math.max(0, room));
          if (dmg > 0) ctx.hit(f, dmg, f.x, f.y);
          if (beads.filter((b) => b.owner === side).length < BEAD_CAP) {
            beads.push({ x: f.x + (rng() - 0.5) * 18, y: f.y + 12 + rng() * 8, owner: side, bornAt: time, seed: rng() * 10 });
          }
        }
      }
      // Melt the other fighter's beads into your own candle.
      for (const b of beads) {
        const taker: Side = b.owner === 'player' ? 'npc' : 'player';
        const f = fighterOf(taker);
        if (f.active && f.hp > 0 && dist(f.x, f.y, b.x, b.y) < BEAD_PICK_R) {
          ctx.heal(f, BEAD_HEAL);
          b.bornAt = -Infinity;
          ctx.sfx('sizzle');
        }
      }
      beads = beads.filter((b) => time - b.bornAt < BEAD_LIFE_MS);
      // Dropping back over half re-arms the warning.
      for (const side of ['player', 'npc'] as Side[]) if (ratio(fighterOf(side)) > BOTH_ENDS_AT + 0.05) bothEndsSaid[side] = false;
    },

    // Your damage is the foe's damage taken, and it rises as *you* burn.
    npcTakenMult() { return heat(ctx.player); },
    playerTakenMult() { return heat(ctx.npc); },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      if (ratio(n) > 0.8) return null;
      let best: Bead | null = null; let bd = 260;
      for (const b of beads) {
        if (b.owner !== 'player') continue;
        const d = dist(n.x, n.y, b.x, b.y);
        if (d < bd) { bd = d; best = b; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      for (const b of beads) {
        const age = (time - b.bornAt) / BEAD_LIFE_MS;
        const tint = b.owner === 'player' ? PLAYER_TINT : FOE_TINT;
        const r = 5.5 * (1 - age * 0.3);
        g.fillStyle(dim(WAX, 0.3), 0.7); g.fillEllipse(b.x + 1, b.y + 2, r * 2.6, r * 1.6);
        g.fillStyle(WAX, 1); g.fillEllipse(b.x, b.y, r * 2.4, r * 1.6);
        g.lineStyle(1.6, tint, 0.85); g.strokeEllipse(b.x, b.y, r * 2.4, r * 1.6);
        g.fillStyle(0xffffff, 0.6); g.fillCircle(b.x - r * 0.4, b.y - r * 0.25, 1.3);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const side of ['player', 'npc'] as Side[]) {
        const f = fighterOf(side);
        if (!f.active) continue;
        const r = ratio(f);
        const tint = side === 'player' ? PLAYER_TINT : FOE_TINT;
        // The candle crown: a taper whose length is the health that's left.
        const baseY = f.y - 36;
        const h = 6 + 26 * r;
        g.fillStyle(dim(WAX, 0.3), 1); g.fillRect(f.x - 4, baseY - h, 8, h);
        g.fillStyle(WAX, 1); g.fillRect(f.x - 3.2, baseY - h, 5.4, h);
        g.fillStyle(lit(WAX, 0.4), 1); g.fillRect(f.x - 2.6, baseY - h, 1.5, h);
        g.fillStyle(tint, 0.9); g.fillRect(f.x - 4.5, baseY - 2, 9, 3);
        g.lineStyle(1.3, WICK, 1); g.lineBetween(f.x, baseY - h, f.x, baseY - h - 4);
        const s = 4 + (1 - r) * 6;
        flame(g, f.x, baseY - h - 4, s, t, side === 'player' ? 1 : 5, 0.05);
        // Lit at both ends: a second flame licking the foot of the crown.
        if (r < BOTH_ENDS_AT && r > FLOOR_RATIO) {
          for (const sx of [-1, 1]) flame(g, f.x + sx * 6, baseY + 2, 3.2, t + sx, side === 'player' ? 2 : 7, 0);
        }
        if (r <= FLOOR_RATIO + 0.005) {
          g.fillStyle(0xffffff, 0.5 + Math.sin(t * 6) * 0.2);
          g.fillCircle(f.x, baseY - h - 6, 2);
        }
      }
    },

    drawHud(g) {
      // Two heat gauges: what your hits are worth, what his are worth.
      const y = ctx.top + 10;
      const bar = (x: number, k: number, tint: number, right: boolean): void => {
        const w = 150;
        g.fillStyle(0x140f0a, 0.6); g.fillRoundedRect(x - 4, y - 4, w + 8, 18, 5);
        g.fillStyle(dim(tint, 0.5), 1); g.fillRect(x, y, w, 10);
        const fill = Math.min(1, (k - 1) / HEAT_GAIN);
        g.fillStyle(tint, 1);
        if (right) g.fillRect(x + w * (1 - fill), y, w * fill, 10);
        else g.fillRect(x, y, w * fill, 10);
        g.fillStyle(0xffffff, 0.7);
        for (let i = 1; i < 4; i++) g.fillRect(x + (w * i) / 4, y, 1, 10);
      };
      bar(24, heat(ctx.player), PLAYER_TINT, false);
      bar(W - 24 - 150, heat(ctx.npc), FOE_TINT, true);
    },
  };
}

export const BOTH_ENDS: GimmickDef = {
  id: 'candlewick-both-ends',
  rules: 'Both of you burn down (never below 20%). The lower you burn, the harder you hit. Melt HIS wax beads to heal.',
  make,
};
