import type { IsleItemDef, ItemScriptFactory } from '../../../../IslesTypes';
import { starGlow } from '../../../../art/PinnacleArt';
import { glow } from '../../../../art/IsleArt';
import { BENCHES, relicId } from '../../spec';
import { NOON } from './art';

/**
 * The Noon Bench's relic: THE UNPINNED SUN — the little gold sun from the Seat of Noon's emblem,
 * with the iron pin that held it drawn out. The Endless Noon undone: on you, the sun can set.
 *
 * A tiny sun rides over your shoulder at noon. Every blow you land pushes it lower toward the
 * horizon line at your feet. When it touches the horizon, NIGHTFALL: for four seconds your blows
 * land 30% harder, and the first star of the evening falls on your foe (18, and it heals you 8).
 * Then dawn — the sun climbs back to noon (blows on the way up do not move it) and the day begins again.
 */

const B = BENCHES.find((b) => b.isle === 'light')!;
export const RELIC_LIGHT = relicId(B.id);

const unpinnedSun: ItemScriptFactory = (ctx) => {
  const STEP = 0.08;
  const NIGHT_MS = 4000;
  const DAWN_MS = 3000;
  let height = 1;
  let state: 'day' | 'night' | 'dawn' = 'day';
  let until = 0;
  let gate = 0;
  let starAt = -1;
  let starX = 0, starY = 0;
  const live = () => ctx.player.active && ctx.player.hp > 0;
  const foeLive = () => ctx.npc.active && ctx.npc.hp > 0;

  return {
    update(time) {
      if (state === 'night' && time >= until) { state = 'dawn'; until = time + DAWN_MS; }
      else if (state === 'dawn') {
        height = Math.min(1, 1 - (until - time) / DAWN_MS);
        if (time >= until) { state = 'day'; height = 1; }
      }
      if (starAt > 0 && time >= starAt) {
        starAt = -1;
        if (foeLive() && live()) {
          ctx.hit(ctx.npc, 18, ctx.npc.x, ctx.npc.y);
          ctx.heal(ctx.player, 8);
          ctx.flash(ctx.npc.x, ctx.npc.y, NOON.starCore);
          ctx.sfx('meteor');
        }
      }
    },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (state !== 'day' || amount < 2 || now < gate || !live()) return;
      gate = now + 120;
      height = Math.max(0, height - STEP);
      if (height > 0) return;
      state = 'night';
      until = now + NIGHT_MS;
      ctx.boostDamage(1.3, NIGHT_MS);
      ctx.float(ctx.player.x, ctx.player.y - 56, 'NIGHTFALL', '#c9d8ff');
      ctx.sfx('hush');
      starAt = now + 700;
      starX = ctx.npc.x; starY = ctx.npc.y;
    },
    drawAir(g, time) {
      if (!live()) return;
      const p = ctx.player;
      const t = time / 1000;
      // The horizon at your shoulder, and the sun on its way down to it.
      const hx = p.x - 30, hy = p.y - 20;
      g.lineStyle(1.5, NOON.brass, 0.8); g.lineBetween(hx - 12, hy, hx + 12, hy);
      const sy = hy - 4 - height * 26;
      if (state !== 'night') {
        const dusk = 1 - height;
        glow(g, hx, sy, 10, dusk > 0.6 ? NOON.starDeep : NOON.gold, 0.06 + dusk * 0.06, 2);
        g.fillStyle(dusk > 0.6 ? NOON.starDeep : NOON.gold, 1); g.fillCircle(hx, sy, 4.5);
        g.fillStyle(NOON.starCore, 0.9); g.fillCircle(hx - 1, sy - 1, 2);
      } else {
        // Night: the sun is down, and stars come out round you.
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + t * 0.4;
          const tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 2);
          g.fillStyle(0xe8f0ff, 0.5 + tw * 0.5); g.fillCircle(p.x + Math.cos(a) * 34, p.y - 8 + Math.sin(a) * 18, 1.2 + tw);
        }
        g.fillStyle(0x0a1030, 0.18); g.fillCircle(p.x, p.y, 30);
      }
      // The first star of the evening, falling on the foe.
      if (starAt > 0) {
        const k = 1 - (starAt - time) / 700;
        const x = starX + (ctx.npc.x - starX) * k, y = ctx.npc.y - 320 * (1 - k);
        g.lineStyle(2, 0xe8f0ff, 0.6); g.lineBetween(x + 40 * (1 - k) + 30, y - 60, x, y);
        starGlow(g, x, y, 3, t, 0.8);
      }
    },
  };
};

export const LIGHT_RELIC_ITEMS: IsleItemDef[] = [
  {
    id: RELIC_LIGHT, name: 'The Unpinned Sun', emoji: '🌇', kind: 'charm', isle: 'pinnacle',
    flavor: 'The gold sun from the Seat of Noon, its iron pin drawn out. Twenty-two years at noon, and it would very much like to set.',
    script: RELIC_LIGHT,
    scriptText: [
      'A little sun rides at your shoulder. Every blow you land pushes it toward the horizon.',
      'When it sets: NIGHTFALL — 4s of +30% damage, and the first star falls on your foe (18, heals you 8).',
      'Then it rises again to noon, and the day begins over.',
    ],
  },
];

export const LIGHT_RELIC_SCRIPTS: Record<string, ItemScriptFactory> = { [RELIC_LIGHT]: unpinnedSun };
