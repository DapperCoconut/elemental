import type { IsleItemDef, ItemScriptFactory } from '../../../../IslesTypes';
import { relicId } from '../../spec';
import { GALE, GALE_CSS, GALE_LIT, breathBottle } from './art';
import { BENCH } from './councilors';

/**
 * The Gale Bench's relic: the last bottle off the Breath-Meter's rack, the debt-tag torn off. The
 * Breath-Tax counted every breath and took it; this bottle gives back what was taken from you.
 *
 * Damage you take is metered into the bottle as owed breath (it fills, pale, at your hip). At 40
 * owed, the cork blows: the breath comes back as a gale — you heal 10, the foe within 280px takes
 * 14 and is hurled away from you, and you run 25% faster for 3s. Land three blows inside 1.5s and
 * you uncork it early, at whatever it holds (half value, at least 10 owed).
 */
export const RELIC_AIR = relicId(BENCH.id);

const FULL = 40;

const uncorked: ItemScriptFactory = (ctx) => {
  let owed = 0;
  let blownAt = -9999;
  let blowX = 0, blowY = 0;
  const recent: number[] = [];

  const blow = (frac: number): void => {
    const p = ctx.player, n = ctx.npc;
    if (!p.active || p.hp <= 0) return;
    const now = ctx.scene.time.now;
    owed = 0;
    blownAt = now;
    blowX = p.x; blowY = p.y;
    ctx.heal(p, Math.round(10 * frac));
    ctx.boostSpeed(1.25, Math.round(3000 * frac));
    ctx.sfx('gust');
    ctx.float(p.x, p.y - 56, frac >= 1 ? 'BREATH RETURNED' : 'UNCORKED', GALE_CSS);
    ctx.flash(p.x, p.y, GALE_LIT);
    if (n.active && n.hp > 0) {
      const d = Math.hypot(n.x - p.x, n.y - p.y) || 1;
      if (d < 280) {
        ctx.hit(n, Math.round(14 * frac), n.x, n.y);
        ctx.nudge(n, ((n.x - p.x) / d) * 150 * frac, ((n.y - p.y) / d) * 150 * frac);
      }
    }
  };

  return {
    onHitTaken(amount) {
      if (amount <= 0) return;
      owed = Math.min(FULL, owed + amount);
      if (owed >= FULL) blow(1);
    },
    onHitDealt(amount) {
      if (amount < 1) return;
      const now = ctx.scene.time.now;
      recent.push(now);
      while (recent.length && now - recent[0] > 1500) recent.shift();
      if (recent.length >= 3 && owed >= 10) { recent.length = 0; blow(0.5 + 0.5 * (owed / FULL) * 0.5); }
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (!p.active || p.hp <= 0) return;
      // The bottle rides at the hip, filling as the breath you are owed builds up in it.
      const k = owed / FULL;
      const bx = p.x - 24, by = p.y + 4;
      if (k > 0.8) { g.fillStyle(GALE, 0.08 + 0.06 * Math.sin(time / 80)); g.fillCircle(bx, by - 10, 18); }
      breathBottle(g, bx, by, 0.7, time / 1000, k, 2);
      // The burst: rings of returned breath rolling out from where it blew.
      const since = time - blownAt;
      if (since < 600) {
        const f = since / 600;
        for (let i = 0; i < 3; i++) {
          g.lineStyle(4 - i, GALE_LIT, 0.8 * (1 - f));
          g.strokeCircle(blowX, blowY, 30 + f * 260 - i * 26);
        }
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + f;
          g.lineStyle(2, GALE, 0.7 * (1 - f));
          g.lineBetween(blowX + Math.cos(a) * (40 + f * 200), blowY + Math.sin(a) * (40 + f * 200), blowX + Math.cos(a) * (70 + f * 230), blowY + Math.sin(a) * (70 + f * 230));
        }
      }
    },
  };
};

export const AIR_ITEMS: IsleItemDef[] = [
  {
    id: RELIC_AIR, name: 'The Uncorked Breath', emoji: '🫙', kind: 'charm', isle: 'pinnacle',
    flavor: 'The last bottle off the Breath-Meter\'s rack. Somebody\'s breath is still in it. The debt-tag has been torn off.',
    script: RELIC_AIR,
    scriptText: [
      'Damage you take fills the bottle with owed breath. At 40, the cork blows: heal 10, +25% speed for 3s,',
      'and a gale throws the foe away from you for 14 (within 280px). Land 3 hits in 1.5s to uncork it early (half value).',
    ],
  },
];

export const AIR_SCRIPTS: Record<string, ItemScriptFactory> = { [RELIC_AIR]: uncorked };

