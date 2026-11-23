import type { IsleItemDef, ItemScriptFactory } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { OBS } from '../../../../art/PinnacleArt';
import { relicId } from '../../spec';
import { glassDrop } from './art';
import { B, VEN, VEN_DARK, VEN_LIT, VEN_LIT_CSS, alive, stepOf } from './palette';

/**
 * The Venom Bench's relic: THE UNRATIONED DRAUGHT — the true recipe, out of the alembic, in a vial
 * with no ration mark on it. Fangmire's law was a slow venom held off by a dose you had to EARN BY
 * OBEDIENCE. Undone, it holds off your wounds instead, and you earn the cure by fighting.
 *
 * A third of every hit you take is withheld: you are healed it at once and it goes into the vial as
 * venom, which seeps back into you slowly (3 a second). Every blow you land draws it out of the vial
 * again — cured, never taken. Fight well and most of a burst never lands; sit back and it all does,
 * just later.
 */

export const RELIC_SLIME = relicId(B.id);

const MAX_BANK = 60;

const unrationed: ItemScriptFactory = (ctx) => {
  let bank = 0;
  let acc = 0;
  let curedAt = -9999;
  let curedSum = 0;
  return {
    update(_time, dt) {
      if (!alive(ctx.player) || bank <= 0) return;
      const d = Math.min(bank, 3 * stepOf(dt));
      bank -= d; acc += d;
      if (acc >= 1) { const n = Math.floor(acc); acc -= n; ctx.hit(ctx.player, n, ctx.player.x, ctx.player.y); }
    },
    onHitTaken(amount) {
      if (!alive(ctx.player) || amount <= 0) return;
      const w = Math.min(amount / 3, MAX_BANK - bank);
      if (w <= 0) return;
      bank += w;
      ctx.heal(ctx.player, w);
    },
    onHitDealt(amount) {
      if (bank <= 0 || amount <= 0) return;
      const c = Math.min(bank, amount * 0.6);
      bank -= c;
      curedSum += c;
      const now = ctx.scene.time.now;
      if (curedSum >= 8 && now - curedAt > 1200) {
        ctx.float(ctx.player.x, ctx.player.y - 56, `CURED ${Math.round(curedSum)}`, VEN_LIT_CSS);
        ctx.sfx('heal');
        curedAt = now; curedSum = 0;
      }
    },
    drawAir(g, time) {
      if (!alive(ctx.player)) return;
      const p = ctx.player;
      const x = p.x + 26, y = p.y - 26;
      const k = bank / MAX_BANK;
      if (k > 0) glow(g, x, y, 14, VEN, 0.04 + 0.05 * k, 2);
      g.fillStyle(OBS.glass, 0.9); g.fillRoundedRect(x - 5, y - 10, 10, 20, 3);
      g.fillStyle(VEN_DARK, 1); g.fillRect(x - 4, y - 7, 8, 16);
      g.fillStyle(VEN, 1); g.fillRect(x - 4, y + 9 - 16 * k, 8, 16 * k);
      g.fillStyle(OBS.sheen, 1); g.fillRect(x - 4, y - 13, 8, 4);
      g.lineStyle(1, OBS.edge, 0.7); g.strokeRoundedRect(x - 5, y - 10, 10, 20, 3);
      if (k > 0.05) glassDrop(g, x, y + 12 + ((time / 12) % 14), 1.6, 0.7);
      if (time - curedAt < 500) { g.lineStyle(2, VEN_LIT, 1 - (time - curedAt) / 500); g.strokeCircle(x, y, 10 + (time - curedAt) / 25); }
    },
  };
};

export const PIN_SLIME_ITEMS: IsleItemDef[] = [
  {
    id: RELIC_SLIME, name: 'The Unrationed Draught', emoji: '🧪', kind: 'charm', isle: 'pinnacle',
    flavor: 'The true recipe, drawn off the alembic of the Venom Bench into a vial with no ration mark. Nobody allotted it to you.',
    script: RELIC_SLIME,
    scriptText: [
      'A third of every hit you take is withheld: healed at once, held in the vial as venom (up to 60).',
      'The vial seeps back into you at 3 a second.',
      'Every blow you land draws venom out of the vial — 0.6 per point of damage — cured, never taken.',
    ],
  },
];

export const PIN_SLIME_SCRIPTS: Record<string, ItemScriptFactory> = { [RELIC_SLIME]: unrationed };
