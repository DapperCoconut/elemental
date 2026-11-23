import type { IsleItemDef, ItemScriptFactory } from '../../../../IslesTypes';
import { relicId } from '../../spec';
import { BRASS, BRASS_DARK, VOLT, bolt, sparks } from './art';
import { alive } from './util';

/**
 * The Storm Bench's relic: the Meter's needle, snapped off at the stop. For a hundred years it
 * counted current *out* of every house on Voltreach. Carried, it runs the other way: the hurt you
 * take is current paid back into you, and when the needle reaches the end of its sweep the debt is
 * repaid all at once — the next key you press comes back early and a bolt goes the other way, at
 * the one who is hurting you.
 */

export const RELIC_ID = relicId('bench-electricity');
const FULL = 40;

/** Back-Current: damage taken winds a needle; full, the next cast is repaid and arcs into the foe. */
const backCurrent: ItemScriptFactory = (ctx) => {
  let bank = 0;
  let fx = 0;
  let fxTo = { x: 0, y: 0 };
  return {
    onHitTaken(amount) {
      if (amount <= 0 || bank >= FULL) return;
      bank = Math.min(FULL, bank + amount);
      if (bank >= FULL) { ctx.float(ctx.player.x, ctx.player.y - 56, 'THE DRAW, REPAID', '#ffe14a'); ctx.sfx('electric-charge'); }
    },
    onCast(abilityId) {
      if (bank < FULL || !alive(ctx.player)) return;
      bank = 0;
      ctx.refund(abilityId, 3000);
      if (alive(ctx.npc)) {
        ctx.hit(ctx.npc, 16, ctx.npc.x, ctx.npc.y);
        fxTo = { x: ctx.npc.x, y: ctx.npc.y };
      } else fxTo = { x: ctx.player.x, y: ctx.player.y - 80 };
      fx = ctx.scene.time.now;
      ctx.sfx('thunder');
      ctx.flash(fxTo.x, fxTo.y, VOLT);
    },
    drawAir(g, time) {
      if (!alive(ctx.player)) return;
      const p = ctx.player;
      const x = p.x + 26, y = p.y - 30;
      const k = bank / FULL;
      // A little brass gauge at the shoulder; its needle runs backwards from the stop toward zero-and-beyond.
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 9);
      g.fillStyle(0x0e0b14, 1); g.fillCircle(x, y, 7.5);
      g.lineStyle(1, VOLT, 0.5); g.beginPath(); g.arc(x, y, 6, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
      const a = Math.PI * 1.9 - k * Math.PI * 0.8 + (k >= 1 ? Math.sin(time / 30) * 0.05 : 0);
      g.lineStyle(1.6, k >= 1 ? 0xffffff : VOLT, 1); g.lineBetween(x, y, x + Math.cos(a) * 7, y + Math.sin(a) * 7);
      g.fillStyle(BRASS, 1); g.fillCircle(x, y, 1.6);
      if (k >= 1) sparks(g, x, y, 12, Math.floor(time / 60), VOLT, 0.7);
      if (time - fx < 260) bolt(g, x, y, fxTo.x, fxTo.y, Math.floor(time / 40), 2.4, VOLT, 1 - (time - fx) / 260, 2);
    },
  };
};

export const RELIC_ITEMS: IsleItemDef[] = [
  {
    id: RELIC_ID,
    name: 'The Meter\'s Needle',
    emoji: '⚡',
    kind: 'charm',
    isle: 'pinnacle',
    flavor: 'Snapped off at the stop it was pinned against for a hundred years. It still trembles. It runs the other way now.',
    script: RELIC_ID,
    scriptText: [
      'Back-Current: every point of damage you take winds the needle back (40 to fill).',
      'Full, your next ability is repaid — 3s off its cooldown — and a bolt of 16 strikes your foe.',
    ],
  },
];

export const RELIC_SCRIPTS: Record<string, ItemScriptFactory> = { [RELIC_ID]: backCurrent };
