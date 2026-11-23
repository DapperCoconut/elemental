import type { IsleItemDef, ItemScriptFactory } from '../../../../IslesTypes';
import { relicId } from '../../spec';
import { GREEN, greenLeaf } from './art';

/**
 * The Thorn Bench's relic: the sapling the Pruning kept under glass, taken out of its jar. The
 * law it undoes is the Pruning's own — *what is cut does not grow back.* This one does, and
 * thicker: every time you are cut, it puts out a leaf and throws a thorn back at whoever cut you.
 * At five leaves it flowers, mends you and sharpens your hand, and starts again from one.
 */

const RELIC_ID = relicId('bench-life');

const PRUNE_MIN = 6;
const PRUNE_CD = 600;
const THORN = 5;
const BLOOM_AT = 5;
const BLOOM_HEAL = 18;
const BLOOM_MULT = 1.25;
const BLOOM_MS = 4000;

const unjarred: ItemScriptFactory = (ctx) => {
  let leaves = 1;
  let lastCut = -9999;
  let bloomAt = -9999;
  let thornAt = -9999;
  const live = () => ctx.player.active && ctx.player.hp > 0;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (!live() || amount < PRUNE_MIN || now - lastCut < PRUNE_CD) return;
      lastCut = now;
      leaves++;
      // A thorn back at whoever cut it.
      if (ctx.npc.active && ctx.npc.hp > 0) {
        ctx.hit(ctx.npc, THORN, ctx.npc.x, ctx.npc.y - 20);
        thornAt = now;
      }
      ctx.sfx('thorn');
      if (leaves >= BLOOM_AT) {
        leaves = 1;
        bloomAt = now;
        ctx.heal(ctx.player, BLOOM_HEAL);
        ctx.boostDamage(BLOOM_MULT, BLOOM_MS);
        ctx.float(ctx.player.x, ctx.player.y - 64, 'IT FLOWERS', '#d8ffd0');
        ctx.flash(ctx.player.x, ctx.player.y, GREEN.glow);
        ctx.sfx('heal');
      }
    },
    drawAir(g, time) {
      if (!live()) return;
      const p = ctx.player;
      const x = p.x + 24, y = p.y - 26;
      // A sapling riding at your shoulder in a pinch of soil, one leaf pair per cut.
      g.fillStyle(0x1a120e, 1); g.fillEllipse(x, y, 14, 5);
      const h = 10 + leaves * 3;
      const sway = Math.sin(time / 500) * 1.5;
      g.lineStyle(1.8, GREEN.vine, 1); g.lineBetween(x, y, x + sway, y - h);
      for (let i = 0; i < leaves; i++) {
        const ly = y - 5 - i * 3;
        const s = i % 2 ? 1 : -1;
        greenLeaf(g, x + sway * (i / leaves), ly, -Math.PI / 2 + s * 1.0, 6);
      }
      g.fillStyle(GREEN.bud, 1); g.fillCircle(x + sway, y - h - 1, 1.6);
      const bk = (time - bloomAt) / 900;
      if (bk >= 0 && bk < 1) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + bk * 2;
          g.fillStyle(GREEN.petal, 1 - bk); g.fillCircle(x + Math.cos(a) * (6 + bk * 30), y - h + Math.sin(a) * (6 + bk * 30), 3);
        }
        g.lineStyle(2, GREEN.glow, 1 - bk); g.strokeCircle(p.x, p.y - 6, 24 + bk * 30);
      }
      const tk = (time - thornAt) / 260;
      if (tk >= 0 && tk < 1 && ctx.npc.active) {
        const tx = x + (ctx.npc.x - x) * tk, ty = y - h + (ctx.npc.y - 20 - (y - h)) * tk;
        const a = Math.atan2(ctx.npc.y - y, ctx.npc.x - x);
        g.fillStyle(GREEN.vineDark, 1);
        g.fillTriangle(tx + Math.cos(a) * 8, ty + Math.sin(a) * 8, tx + Math.cos(a + 2.6) * 4, ty + Math.sin(a + 2.6) * 4, tx + Math.cos(a - 2.6) * 4, ty + Math.sin(a - 2.6) * 4);
      }
    },
  };
};

export const BENCH_LIFE_ITEMS: IsleItemDef[] = [
  {
    id: RELIC_ID,
    name: 'The Unjarred Sapling',
    emoji: '🌱',
    kind: 'charm',
    isle: 'pinnacle',
    flavor: 'Kept under glass by law, so it would never grow. The glass is gone. It is growing.',
    script: RELIC_ID,
    scriptText: [
      'Every time you are cut (6+ damage, at most every 0.6s) it puts out a leaf and throws a thorn back for 5.',
      'At five leaves it flowers: you heal 18 and deal 25% more for 4s, and it starts again from one.',
    ],
  },
];

export const BENCH_LIFE_SCRIPTS: Record<string, ItemScriptFactory> = { [RELIC_ID]: unjarred };
