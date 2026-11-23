import type { IsleItemDef, ItemScriptFactory } from '../../../../IslesTypes';
import { brandSigil, dim, glow } from '../../../../art/IsleArt';
import { OBS } from '../../../../art/PinnacleArt';
import { BENCHES, relicId } from '../../spec';
import { EMB, heatColor } from './art';

const B = BENCHES.find((b) => b.isle === 'fire')!;
const RELIC = relicId(B.id);

/**
 * The Turned Iron — the Ember Bench's relic. The smallest die off the First Brand's rack, the one
 * they used on children. The Brand marked the ruled; this one has been turned round.
 *
 * It heats from what you deal (1 per point) and what you take (half that). White-hot, the next
 * blow you land STAMPS the foe: a burst of bonus damage, and for a while they are BRANDED and take
 * more from you. Then it cools to nothing and starts again.
 */
const turnedIron: ItemScriptFactory = (ctx) => {
  const FULL = 120;
  const BRAND_MS = 5000;
  let heat = 0;
  let brandedUntil = 0;
  let stampAt = -9999;
  const live = () => ctx.player.active && ctx.player.hp > 0;
  return {
    onHitDealt(amount) {
      if (!live() || amount <= 0) return;
      const now = ctx.scene.time.now;
      if (heat >= FULL && ctx.npc.active && ctx.npc.hp > 0) {
        heat = 0;
        stampAt = now;
        brandedUntil = now + BRAND_MS;
        ctx.hit(ctx.npc, 20, ctx.npc.x, ctx.npc.y);
        ctx.boostDamage(1.2, BRAND_MS);
        ctx.float(ctx.npc.x, ctx.npc.y - 56, 'BRANDED', '#ffb35a');
        ctx.flash(ctx.npc.x, ctx.npc.y, EMB.core);
        ctx.sfx('sizzle');
        return;
      }
      heat = Math.min(FULL, heat + amount);
    },
    onHitTaken(amount) {
      if (!live() || amount <= 0) return;
      heat = Math.min(FULL, heat + amount * 0.5);
    },
    drawAir(g, time) {
      if (!live()) return;
      const p = ctx.player;
      const k = heat / FULL;
      const x = p.x + 24, y = p.y - 30;
      // The little iron at your shoulder, head glowing with its heat.
      g.lineStyle(2, OBS.sheen, 1); g.lineBetween(x, y, x + 9, y - 14);
      g.fillStyle(OBS.glass, 1); g.fillCircle(x, y, 6);
      if (k > 0.05) glow(g, x, y, 12, heatColor(k), 0.05 + k * 0.06, 2);
      brandSigil(g, x, y, 3.4, heatColor(k), 1);
      if (k >= 1 && Math.floor(time / 120) % 2) { g.lineStyle(1.5, EMB.core, 0.9); g.strokeCircle(x, y, 9); }
      // The brand on the foe while it holds.
      if (time < brandedUntil && ctx.npc.active) {
        const n = ctx.npc;
        const left = (brandedUntil - time) / BRAND_MS;
        brandSigil(g, n.x, n.y - 44, 7, heatColor(0.5 + left * 0.5), 0.5 + left * 0.5);
        if (time - stampAt < 400) { const s = (time - stampAt) / 400; g.lineStyle(3 * (1 - s), EMB.core, 1 - s); g.strokeCircle(n.x, n.y, 20 + s * 40); }
        g.lineStyle(1, dim(EMB.ember, 0.2), 0.6); g.strokeCircle(n.x, n.y - 44, 11);
      }
    },
  };
};

export const BENCH_FIRE_ITEMS: IsleItemDef[] = [
  {
    id: RELIC, name: 'The Turned Iron', emoji: '🔥', kind: 'charm', isle: 'pinnacle',
    flavor: 'The smallest die off the First Brand\'s rack — the one for children. Someone has bent the shaft round. It points the other way now.',
    script: RELIC,
    scriptText: [
      'Heats from damage you deal, and half of what you take.',
      'White-hot, your next hit stamps the foe: +20 damage, and they are BRANDED — they take 20% more from you for 5s.',
    ],
  },
];

export const BENCH_FIRE_SCRIPTS: Record<string, ItemScriptFactory> = { [RELIC]: turnedIron };
