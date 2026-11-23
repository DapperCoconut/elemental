import type { IsleItemDef, ItemScriptFactory } from '../../../../IslesTypes';
import { relicId } from '../../spec';
import { sleeper } from './art';
import { BRASS, BRASS_DARK, BRASS_LIT, TIDE, TIDE_LIT, TIDE_PALE } from './palette';

/**
 * The Tide Bench's relic: the Slack-Water Hand, the minute-hand of the Tide-Clock, snapped off.
 * The Undertow kept everything the tide took and gave nothing back; the hand does the opposite. A
 * share of every blow you take is *kept under* in a bubble at your shoulder; go long enough
 * without being hit and it surfaces and gives it back as health. Surface a full one and the
 * drowned come back angry — it bursts on your foe as well.
 */

export const RELIC_WATER = relicId('bench-water');

const KEEP = 0.3;
const CAP = 45;
const SURFACE_MS = 2500;
const BURST = 14;

const slackWaterHand: ItemScriptFactory = (ctx) => {
  let held = 0;
  let lastHit = 0;
  let popAt = -9999;
  let popFull = false;
  const live = () => ctx.player.active && ctx.player.hp > 0;
  return {
    onHitTaken(amount) {
      if (amount <= 0 || !live()) return;
      held = Math.min(CAP, held + amount * KEEP);
      lastHit = ctx.scene.time.now;
    },
    update(time) {
      if (held < 1 || !live() || time - lastHit < SURFACE_MS) return;
      const amount = Math.round(held);
      popFull = held >= CAP - 0.5;
      ctx.heal(ctx.player, amount);
      ctx.sfx('bubble');
      if (popFull && ctx.npc.active && ctx.npc.hp > 0) {
        ctx.hit(ctx.npc, BURST, ctx.npc.x, ctx.npc.y);
        ctx.flash(ctx.npc.x, ctx.npc.y, TIDE_PALE);
        ctx.sfx('splash');
      }
      held = 0;
      popAt = time;
    },
    drawAir(g, time) {
      if (!live()) return;
      const p = ctx.player;
      const x = p.x + 24, y = p.y - 38;
      // The hand itself: a little drowned-brass pointer turning at your shoulder.
      const a = time / 900;
      g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(x - 14, y + 14, x - 14 + Math.cos(a) * 10, y + 14 + Math.sin(a) * 10);
      g.lineStyle(1.4, BRASS_LIT, 1); g.lineBetween(x - 14, y + 14, x - 14 + Math.cos(a) * 10, y + 14 + Math.sin(a) * 10);
      g.fillStyle(BRASS, 1); g.fillCircle(x - 14, y + 14, 2.4);
      if (held >= 1) {
        const r = 6 + (held / CAP) * 10;
        sleeper(g, x, y - Math.sin(time / 400) * 2, r, time / 1000, { eyes: held >= CAP - 0.5 ? 1 : 0 });
        // How close it is to surfacing.
        const k = Math.min(1, (time - lastHit) / SURFACE_MS);
        g.lineStyle(2, TIDE_LIT, 0.85);
        g.beginPath(); g.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      const pk = (time - popAt) / 600;
      if (pk >= 0 && pk < 1) {
        g.lineStyle(3 * (1 - pk), popFull ? TIDE_PALE : TIDE, 1 - pk); g.strokeCircle(x, y, 10 + pk * 34);
        for (let i = 0; i < 6; i++) { const b = (i / 6) * Math.PI * 2; g.fillStyle(TIDE_LIT, 1 - pk); g.fillCircle(x + Math.cos(b) * (10 + pk * 26), y + Math.sin(b) * (10 + pk * 26), 2); }
      }
    },
  };
};

export const WATER_RELIC_ITEMS: IsleItemDef[] = [
  {
    id: RELIC_WATER, name: 'The Slack-Water Hand', emoji: '🕰️', kind: 'charm', isle: 'pinnacle', script: RELIC_WATER,
    flavor: 'The Tide-Clock\'s minute-hand, snapped off at the hour of slack water. Whatever the tide takes, it now gives back.',
    scriptText: [
      '30% of every hit you take is kept under in a bubble at your shoulder (up to 45).',
      'Go 2.5s without being hit and it surfaces: you heal what it kept.',
      'A full bubble surfaces angry: it also bursts on your foe for 14.',
    ],
  },
];

export const WATER_RELIC_SCRIPTS: Record<string, ItemScriptFactory> = { [RELIC_WATER]: slackWaterHand };
