import type { IsleItemDef, ItemScriptCtx, ItemScriptFactory } from '../../../IslesTypes';
import { OBS, starGlow } from '../../../art/PinnacleArt';

/**
 * The Crownless Hall's treasure: the King's own artifact, the Unshelled Star — the little star he
 * kept in a shell of six plates on the arm of the throne, the way a man keeps a pocket-watch. Wear
 * it and the shell sits over your head. It only shows its light where it is broken.
 */

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

// ── art-obsidian-king: the Unshelled Star ────────────────────────────

/**
 * Six plates of black glass shell a small star that rides over your head. A hit of 3 or more
 * cracks one plate off: each cracked plate lets the light through — +6% damage for 8s — and grows
 * back when its 8s are up. Lose all six at once and the star UNSHELLS: a burst of starlight that
 * hits the foe for 34 and stuns them 0.7s if they are within 300px (17, no stun, if further),
 * heals you 14, and the shell closes again at once. Take the hits; make them count.
 */
const unshelledStar: ItemScriptFactory = (ctx) => {
  const PLATES = 6;
  const REGROW_MS = 8000;
  const MIN_HIT = 3;
  const REACH = 300;
  /** When each plate cracked (0 = whole). */
  const cracked: number[] = new Array(PLATES).fill(0);
  let novaAt = -10000;
  let novaX = 0, novaY = 0;
  const broken = (time: number): number => cracked.filter((c) => c > 0 && time - c < REGROW_MS).length;
  return {
    update(time) {
      for (let i = 0; i < PLATES; i++) if (cracked[i] > 0 && time - cracked[i] >= REGROW_MS) cracked[i] = 0;
    },
    onHitTaken(amount) {
      if (amount < MIN_HIT || !alive(ctx, 'player')) return;
      const now = ctx.scene.time.now;
      const i = cracked.findIndex((c) => c === 0);
      if (i < 0) return;
      cracked[i] = now;
      ctx.boostDamage(1.06, REGROW_MS);
      const p = ctx.player;
      if (broken(now) < PLATES) {
        ctx.float(p.x, p.y - 74, `${broken(now)}/6`, '#ffe9b0');
        ctx.sfx('crystal-shatter');
        return;
      }
      // Unshelled.
      novaAt = now; novaX = p.x; novaY = p.y;
      cracked.fill(0);
      ctx.heal(p, 14);
      ctx.flash(p.x, p.y, OBS.starCore);
      ctx.sfx('explosion-large');
      ctx.float(p.x, p.y - 80, 'UNSHELLED', '#fffbea');
      if (alive(ctx, 'npc')) {
        const n = ctx.npc;
        const near = Math.hypot(n.x - p.x, n.y - p.y) <= REACH;
        ctx.hit(n, near ? 34 : 17, n.x, n.y);
        if (near) ctx.stun(n, 700);
        ctx.flash(n.x, n.y, OBS.star);
      }
    },
    drawGround(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const b = broken(time);
      // At four plates and more, the reach of the burst is drawn round you.
      if (b >= 4) {
        g.lineStyle(1.5, OBS.star, 0.12 + (b - 4) * 0.12 + Math.sin(time / 160) * 0.04);
        g.strokeCircle(p.x, p.y, REACH);
      }
      const k = (time - novaAt) / 600;
      if (k >= 0 && k < 1) {
        g.fillStyle(OBS.star, 0.18 * (1 - k)); g.fillCircle(novaX, novaY, REACH * k);
        g.lineStyle(4 * (1 - k) + 1, OBS.starCore, 0.8 * (1 - k)); g.strokeCircle(novaX, novaY, REACH * k);
      }
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const x = p.x, y = p.y - 58 + Math.sin(time / 420) * 2;
      const b = broken(time);
      starGlow(g, x, y, 3.2, time / 1000, 0.25 + b * 0.12);
      // The plates: six kite-shards in a ring, turning; a gap where each one has cracked off.
      const spin = time / 2400;
      for (let i = 0; i < PLATES; i++) {
        const a0 = spin + (i / PLATES) * Math.PI * 2;
        if (cracked[i] > 0 && time - cracked[i] < REGROW_MS) {
          // A ray of light through the gap, and the plate regrowing from a sliver.
          const f = (time - cracked[i]) / REGROW_MS;
          const am = a0 + Math.PI / PLATES;
          g.fillStyle(OBS.star, 0.35);
          g.fillTriangle(x, y, x + Math.cos(am - 0.12) * 22, y + Math.sin(am - 0.12) * 22, x + Math.cos(am + 0.12) * 22, y + Math.sin(am + 0.12) * 22);
          g.lineStyle(1, OBS.edge, 0.2 + f * 0.5);
          g.lineBetween(x + Math.cos(a0) * 9, y + Math.sin(a0) * 9, x + Math.cos(a0 + (Math.PI * 2 / PLATES) * f) * 9, y + Math.sin(a0 + (Math.PI * 2 / PLATES) * f) * 9);
          continue;
        }
        const a1 = a0 + (Math.PI * 2) / PLATES - 0.08;
        const am = (a0 + a1) / 2;
        g.fillStyle(i % 2 ? OBS.facet : OBS.glass, 1);
        g.fillTriangle(x + Math.cos(a0) * 6, y + Math.sin(a0) * 6, x + Math.cos(a1) * 6, y + Math.sin(a1) * 6, x + Math.cos(am) * 12, y + Math.sin(am) * 12);
        g.lineStyle(1, OBS.edge, 0.7);
        g.lineBetween(x + Math.cos(a1) * 6, y + Math.sin(a1) * 6, x + Math.cos(am) * 12, y + Math.sin(am) * 12);
      }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const SUMMIT_ITEMS: IsleItemDef[] = [
  {
    id: 'art-obsidian-king', name: 'The Unshelled Star', emoji: '🌟', kind: 'artifact', isle: 'pinnacle',
    flavor: 'He kept it on the arm of the throne, in a shell of six plates, the way a man keeps a pocket-watch. It is warm. It has never been warm for anyone before.',
    script: 'art-obsidian-king', effect: { maxHp: 30 },
    scriptText: [
      'A star rides over you in a shell of six plates. A hit of 3+ cracks one: +6% damage for 8s, then it regrows.',
      'Lose all six at once and it UNSHELLS: 34 damage + 0.7s stun within 300px (17 beyond), heal 14, shell restored.',
    ],
  },
];

export const SUMMIT_SCRIPTS: Record<string, ItemScriptFactory> = {
  'art-obsidian-king': unshelledStar,
};
