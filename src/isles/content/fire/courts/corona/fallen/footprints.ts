import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS_LIT, GLASS_CRACK, GLASS_DEEP, GLASS_GLINT, GLASS_SAND, GLASS_SAND_DARK, GLASS_SHEEN, IRON, SUN_CORE, SUN_DEEP,
  SUN_RIM,
} from '../palette';
import { inPlay } from './geom';

/**
 * Footprints in the Glass — Runner Ottoline's fight (the rebel who never ran).
 *
 * The plateau is sand fused into glass, and today it is hot enough to fuse again: every step
 * either fighter takes leaves a ribbon of **molten glass** behind them. Walking on the
 * *other* fighter's ribbon burns (a tick every third of a second) and drags at your feet. A
 * ribbon cools and is gone in a few seconds. A **dash** leaves no ribbon and crosses any —
 * that is the way out of a ring.
 *
 * So the floor is a drawing both of you are making. Ottoline runs rings round you to pen you
 * in; you can lay your own walls across her line of approach and make her wade through them.
 *
 * Halfway the glass runs hot: ribbons last longer, and your **own** older glass burns you too
 * — the fresh stretch at your heels is safe, the loop you made a moment ago is not.
 */

const ID = fallenId('corona', 'footprints');
const STEP = 16;
const TOUCH = 24;
const TICK_MS = 300;
const BURN = 7;
const OWN_ARMS_S = 1.2;

interface Drop { x: number; y: number; born: number; strand: number }
interface Trail { owner: Fighter; drops: Drop[]; last: Pt | null; strand: number; burnAt: number; burning: boolean }

export const FOOTPRINTS: GimmickDef = {
  id: ID,
  rules: 'Both of you leave molten glass. Hers burns and drags you; dash to cross. Past half, your own older glass burns you too.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    const mine: Trail = { owner: ctx.player, drops: [], last: null, strand: 0, burnAt: 0, burning: false };
    const hers: Trail = { owner: ctx.npc, drops: [], last: null, strand: 0, burnAt: 0, burning: false };
    let half = false;
    let lasso = ctx.rng() * Math.PI * 2;
    let lassoDir = 1;

    const life = (): number => (half ? 7000 : 5500);

    const lay = (t: Trail, time: number): void => {
      const f = t.owner;
      if (!inPlay(f) || ctx.dashing(f) || ctx.isAirborne(f)) { t.last = null; return; }
      if (!t.last) {
        t.strand++;
        t.drops.push({ x: f.x, y: f.y, born: time, strand: t.strand });
        t.last = { x: f.x, y: f.y };
        return;
      }
      const d = Math.hypot(f.x - t.last.x, f.y - t.last.y);
      if (d < STEP) return;
      if (d > 60) t.strand++;
      t.drops.push({ x: f.x, y: f.y, born: time, strand: t.strand });
      t.last = { x: f.x, y: f.y };
    };

    /** Is `f` standing in glass that burns them — the rival's, or (past half) their own older stretch? */
    const scorched = (f: Fighter, own: Trail, rival: Trail, time: number): boolean => {
      for (const p of rival.drops) {
        if (time - p.born > 250 && Math.hypot(f.x - p.x, f.y - p.y) < TOUCH) return true;
      }
      if (!half) return false;
      const n = own.drops.length;
      for (let i = 0; i < n - 3; i++) {
        const p = own.drops[i];
        if (time - p.born > OWN_ARMS_S * 1000 && Math.hypot(f.x - p.x, f.y - p.y) < TOUCH) return true;
      }
      return false;
    };

    const burnTick = (t: Trail, rival: Trail, time: number): void => {
      const f = t.owner;
      t.burning = inPlay(f) && !ctx.dashing(f) && !ctx.isAirborne(f) && scorched(f, t, rival, time);
      if (t.burning && time >= t.burnAt) {
        t.burnAt = time + TICK_MS;
        ctx.hit(f, BURN, f.x, f.y);
        ctx.sfx('sizzle');
      }
    };

    /** Is the straight walk from a to b clear of the player's glass? */
    const clear = (a: Pt, b: Pt, time: number): boolean => {
      for (let i = 0; i < mine.drops.length; i += 2) {
        const p = mine.drops[i];
        if (time - p.born < 250) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const len2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
        if (Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)) < TOUCH + 6) return false;
      }
      return true;
    };

    const ribbon = (g: Phaser.GameObjects.Graphics, t: Trail, edge: number, core: number, time: number): void => {
      const L = life();
      for (let i = 1; i < t.drops.length; i++) {
        const a = t.drops[i - 1], b = t.drops[i];
        if (a.strand !== b.strand) continue;
        const age = (time - b.born) / L;
        const fade = age > 0.8 ? (1 - age) / 0.2 : 1;
        const w = 18 - age * 8;
        g.lineStyle(w + 4, GLASS_SAND_DARK, 0.35 * fade); g.lineBetween(a.x, a.y + 2, b.x, b.y + 2);
        g.lineStyle(w, edge, 0.85 * fade); g.lineBetween(a.x, a.y, b.x, b.y);
        const hot = Math.max(0, 1 - (time - b.born) / 700);
        g.lineStyle(w * 0.45, hot > 0 ? SUN_CORE : core, (0.6 + 0.4 * hot) * fade); g.lineBetween(a.x, a.y, b.x, b.y);
        if (half && t.owner === ctx.player && time - b.born > OWN_ARMS_S * 1000 && i < t.drops.length - 3) {
          // Past half your own older glass is live: an ember seam pulses along it.
          g.lineStyle(2, SUN_DEEP, (0.5 + 0.4 * Math.sin(time / 90 + i)) * fade); g.lineBetween(a.x, a.y - 3, b.x, b.y - 3);
        }
        if (i % 3 === 0 && age > 0.3) {
          // Cooling cracks across the ribbon, and a glint where it set.
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          g.lineStyle(1, GLASS_CRACK, 0.7 * fade);
          g.lineBetween(b.x + nx * w * 0.5, b.y + ny * w * 0.5, b.x - nx * w * 0.2 + dx / len * 4, b.y - ny * w * 0.2 + dy / len * 4);
          g.fillStyle(GLASS_GLINT, 0.6 * fade); g.fillCircle(b.x - nx * 3, b.y - ny * 3, 1.6);
        }
        if (i % 5 === 0) {
          g.fillStyle(GLASS_SAND, 0.7 * fade);
          g.fillCircle(a.x + ((i * 7) % 11) - 5, a.y + ((i * 13) % 9) - 4, 1.4);
        }
      }
    };

    return {
      update(time) {
        if (!half && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          half = true;
          ctx.banner('THE GLASS RUNS HOT — YOUR OWN OLD STEPS BURN', '#ffb070');
          ctx.sfx('inferno');
        }
        lay(mine, time); lay(hers, time);
        const L = life();
        for (const t of [mine, hers]) while (t.drops.length && time - t.drops[0].born > L) t.drops.shift();
        burnTick(mine, hers, time);
        burnTick(hers, mine, time);
      },

      playerSpeedMult() { return mine.burning ? 0.72 : 1; },
      npcSpeedMult() { return hers.burning ? 0.72 : 1; },

      npcSeek() {
        // Ottoline runs a ring round you; if your glass lies across the way, she circles the other way.
        const time = ctx.scene.time.now;
        const me: Pt = { x: ctx.npc.x, y: ctx.npc.y };
        const P = ctx.player;
        lasso = Math.atan2(me.y - P.y, me.x - P.x) + lassoDir * 0.9;
        for (let tries = 0; tries < 2; tries++) {
          const pt = {
            x: Math.max(60, Math.min(W - 60, P.x + Math.cos(lasso) * 160)),
            y: Math.max(top + 50, Math.min(H - 50, P.y + Math.sin(lasso) * 160)),
          };
          if (clear(me, pt, time)) return pt;
          lassoDir = -lassoDir;
          lasso = Math.atan2(me.y - P.y, me.x - P.x) + lassoDir * 0.9;
        }
        return null;
      },

      drawGround(g, time) {
        ribbon(g, hers, GLASS_DEEP, GLASS_SHEEN, time);
        ribbon(g, mine, SUN_RIM, BRASS_LIT, time);
      },

      drawAir(g, time) {
        // Heat-shimmer off the freshest glass: little wisps rising and thinning.
        for (const t of [mine, hers]) {
          for (let i = Math.max(0, t.drops.length - 10); i < t.drops.length; i++) {
            const p = t.drops[i];
            const age = (time - p.born) / 900;
            if (age > 1) continue;
            g.fillStyle(GLASS_GLINT, 0.18 * (1 - age)); g.fillCircle(p.x + Math.sin(time / 120 + i) * 4, p.y - 6 - age * 26, 4 + age * 4);
          }
          // Sparks at the feet of whoever is wading through hot glass.
          if (t.burning) {
            const f = t.owner;
            for (let s = 0; s < 5; s++) {
              const a = time / 70 + s * 1.3;
              g.fillStyle(s % 2 ? SUN_RIM : SUN_CORE, 0.9);
              g.fillCircle(f.x + Math.cos(a) * 14, f.y + 10 - Math.abs(Math.sin(a * 1.7)) * 16, 2);
            }
          }
        }
      },

      drawHud(g, time) {
        // Two glass panes: yours (amber) and hers (bottle-teal). A flame over a pane means it burns you.
        const y = 104;
        const panes: [number, number, number, boolean][] = [
          [W / 2 - 40, SUN_RIM, BRASS_LIT, half],
          [W / 2 + 40, GLASS_DEEP, GLASS_SHEEN, true],
        ];
        for (const [x, edge, core, burns] of panes) {
          g.fillStyle(0x000000, 0.55); g.fillRect(x - 18, y - 4, 36, 18);
          g.fillStyle(edge, 1); g.fillRect(x - 15, y - 1, 30, 12);
          g.fillStyle(core, 1); g.fillRect(x - 11, y + 2, 22, 5);
          g.fillStyle(GLASS_GLINT, 0.8); g.fillRect(x - 12, y, 4, 2);
          if (burns) {
            const fl = Math.sin(time / 80 + x) * 2;
            g.fillStyle(SUN_RIM, 1); g.fillTriangle(x - 5, y - 4, x + 5, y - 4, x, y - 14 + fl);
            g.fillStyle(SUN_CORE, 1); g.fillTriangle(x - 2, y - 4, x + 2, y - 4, x, y - 9 + fl);
          } else {
            g.fillStyle(IRON, 1); g.fillRect(x - 4, y - 8, 8, 3);
          }
        }
      },
    };
  },
};
