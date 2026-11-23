import type { IsleItemDef, ItemScriptFactory } from '../../../../IslesTypes';
import { OBS } from '../../../../art/PinnacleArt';
import { glow } from '../../../../art/IsleArt';
import { relicId } from '../../spec';
import { lotBall } from './art';
import { FELT_GLOW, IVORY } from './palette';

/**
 * The Lot Bench's relic: the Honest Drum — the drum of the Draw with its false bottom knocked
 * out, shrunk to a charm. The Lot undone: it draws a number for you, and every number can win.
 *
 * Every 8 s it draws a ball from 1 to 6 and hangs it over your head. Land exactly that many
 * blows before the next draw and the last one is a JACKPOT: 30 damage to your foe, and you are
 * healed 15. One blow too many and the ball goes dark — bust — until the next draw. A fast kit
 * must count; a slow one must hope for low numbers.
 */

export const RELIC_FATE = relicId('bench-fate');
const PERIOD = 8000;

const honestDrum: ItemScriptFactory = (ctx) => {
  let drawnAt = -1;
  let n = 1;
  let hits = 0;
  let bust = false;
  let won = false;
  let flashAt = -9999;
  const live = () => ctx.player.active && ctx.player.hp > 0;

  const draw = (time: number): void => {
    drawnAt = time;
    n = 1 + Math.floor(ctx.rng() * 6);
    hits = 0; bust = false; won = false;
    ctx.sfx('dice');
  };

  return {
    update(time) {
      if (!live()) return;
      if (drawnAt < 0 || time - drawnAt >= PERIOD) draw(time);
    },
    onHitDealt(amount) {
      if (amount < 1 || bust || won || drawnAt < 0 || !live()) return;
      hits++;
      if (hits === n) {
        won = true;
        flashAt = ctx.scene.time.now;
        const foe = ctx.npc;
        if (foe.active && foe.hp > 0) ctx.hit(foe, 30, foe.x, foe.y - 20);
        ctx.heal(ctx.player, 15);
        ctx.float(ctx.player.x, ctx.player.y - 70, 'JACKPOT', '#7af2aa');
        ctx.sfx('jackpot');
      } else if (hits > n) {
        bust = true;
      }
    },
    drawAir(g, time) {
      if (!live() || drawnAt < 0) return;
      const p = ctx.player;
      const x = p.x - 30, y = p.y - 48 + Math.sin(time / 300) * 2;
      const color = bust ? OBS.facet : won ? IVORY : FELT_GLOW;
      if (time - flashAt < 500) glow(g, x, y, 30, FELT_GLOW, 0.08 * (1 - (time - flashAt) / 500), 3);
      lotBall(g, x, y, 9, color, n);
      // Tally marks: one per blow landed this draw.
      for (let i = 0; i < Math.min(hits, 6); i++) { g.fillStyle(i < n && !bust ? FELT_GLOW : OBS.seam, 1); g.fillRect(x - 10 + i * 4, y + 13, 2.5, 5); }
      // The draw's clock, a thin ring closing round the ball.
      const k = Math.min(1, (time - drawnAt) / PERIOD);
      g.lineStyle(1.2, IVORY, 0.5); g.beginPath(); g.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + (1 - k) * Math.PI * 2, false); g.strokePath();
    },
  };
};

export const FATE_RELIC_ITEMS: IsleItemDef[] = [
  {
    id: RELIC_FATE, name: 'The Honest Drum', emoji: '🎱', kind: 'charm', isle: 'pinnacle', script: RELIC_FATE,
    flavor: 'The drum of the Draw, shrunk to a charm and its false bottom knocked out. Every ball in it is yours.',
    scriptText: [
      'Every 8s a ball from 1 to 6 is drawn over your head.',
      'Land exactly that many blows before the next draw: the last is a JACKPOT — 30 damage, heal 15.',
      'One blow too many and you go bust until the next draw.',
    ],
  },
];

export const FATE_RELIC_SCRIPTS: Record<string, ItemScriptFactory> = { [RELIC_FATE]: honestDrum };
