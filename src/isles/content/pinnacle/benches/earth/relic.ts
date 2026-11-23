import type { IsleItemDef, ItemScriptFactory } from '../../../../IslesTypes';
import { dim, glow } from '../../../../art/IsleArt';
import { OBS } from '../../../../art/PinnacleArt';
import { BENCHES, relicId } from '../../spec';
import { OCHRE, OCHRE_LIT, STRATA } from './art';
import { alive, clamp } from './util';

/**
 * The Stone Bench's relic: the Honest Weight. The Stone Tithe weighed the poor and always found
 * them short; this weighs the fight and tips back toward whoever is losing it.
 */

const B = BENCHES.find((x) => x.isle === 'earth')!;
const ID = relicId(B.id);

/**
 * A little balance rides at your shoulder. Damage you take loads your pan; half of what you deal
 * lightens it. When your pan is 70 heavier, the scale tips back — Restitution: the foe is struck
 * for 24 and you are healed 12 (at most every 6s).
 */
const honestWeight: ItemScriptFactory = (ctx) => {
  const OWED = 70;
  let owed = 0;
  let shown = 0;
  let lastPay = -99999;
  let payFx = -99999;
  return {
    onHitTaken(a) { owed = Math.min(OWED * 2, owed + a); },
    onHitDealt(a) { owed = Math.max(-30, owed - a * 0.5); },
    update(time, dt) {
      shown += (owed - shown) * clamp(dt * 6, 0, 1);
      if (owed < OWED || time - lastPay < 6000 || !alive(ctx.player) || !alive(ctx.npc)) return;
      lastPay = time;
      payFx = time;
      owed -= OWED;
      ctx.hit(ctx.npc, 24, ctx.npc.x, ctx.npc.y - 20);
      ctx.heal(ctx.player, 12);
      ctx.float(ctx.player.x, ctx.player.y - 56, 'RESTITUTION', '#e8c27e');
      ctx.flash(ctx.npc.x, ctx.npc.y, OCHRE_LIT);
      ctx.sfx('gravity-slam');
    },
    drawAir(g, time) {
      if (!alive(ctx.player)) return;
      const p = ctx.player;
      const x = p.x + 26, y = p.y - 40;
      const tilt = clamp(shown / OWED, -0.5, 1) * 0.5;
      const ca = Math.cos(tilt), sa = Math.sin(tilt);
      g.fillStyle(OBS.glass, 1); g.fillRect(x - 1.5, y, 3, 14);
      g.lineStyle(2, OBS.edge, 0.9); g.lineBetween(x - ca * 12, y - sa * 12, x + ca * 12, y + sa * 12);
      // Left pan: what you are owed (stone); right: the crown it answers to.
      const lx = x - ca * 12, ly = y - sa * 12 + 7, rx = x + ca * 12, ry = y + sa * 12 + 7;
      g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(x - ca * 12, y - sa * 12, lx, ly); g.lineBetween(x + ca * 12, y + sa * 12, rx, ry);
      g.fillStyle(OBS.facet, 1); g.fillEllipse(lx, ly, 10, 3); g.fillEllipse(rx, ry, 10, 3);
      const stones = clamp(Math.round(shown / 18), 0, 4);
      for (let i = 0; i < stones; i++) { g.fillStyle(STRATA[i], 1); g.fillRect(lx - 4 + (i % 2) * 4, ly - 3 - Math.floor(i / 2) * 3, 4, 3); }
      g.fillStyle(OBS.sheen, 1); g.fillTriangle(rx - 4, ry - 1, rx + 4, ry - 1, rx, ry - 6);
      g.fillStyle(dim(OCHRE, 0.2), 1); g.fillCircle(x, y, 2);
      const k = (time - payFx) / 600;
      if (k >= 0 && k < 1) {
        glow(g,ctx.npc.x, ctx.npc.y - 20, 30 + k * 30, OCHRE_LIT, 0.08 * (1 - k), 3);
        g.lineStyle(3 * (1 - k), OCHRE_LIT, 1 - k); g.strokeCircle(ctx.npc.x, ctx.npc.y, 20 + k * 40);
      }
    },
  };
};

export const EARTH_BENCH_ITEMS: IsleItemDef[] = [
  {
    id: ID, name: 'The Honest Weight', emoji: '⚖️', kind: 'charm', isle: 'pinnacle',
    flavor: 'The last tithe-stone Undermason Quoyne cut, and the only one cut true. Set it in the pan and the crown goes up.',
    script: ID,
    scriptText: [
      'A little balance rides at your shoulder. Damage you take loads your pan; half of what you deal lightens it.',
      'When your pan is 70 heavier, the scale tips back — Restitution: the foe takes 24 and you heal 12 (every 6s at most).',
    ],
  },
];

export const EARTH_BENCH_SCRIPTS: Record<string, ItemScriptFactory> = { [ID]: honestWeight };
