import type { IsleItemDef, ItemScriptCtx, ItemScriptFactory } from '../../../../IslesTypes';
import { GLASS, ROSE, ROSE_PALE, SAP, rose, shears } from './art';

/**
 * The Glasshouse's treasures: the Empress's own shears (her artifact), and two charms found in
 * the palace — a hank of grafting twine from the maze's west garden, and a glass cloche from the
 * Nursery bench.
 */

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

// ── art-verdigra: The Gardener's Shears ──────────────────────────────

/**
 * Her shears, which have cut more of Thornwild than any frost. Every 6s they open over you. The
 * next hit you land while they are open *prunes* the foe: 12 extra damage, and for 3s they take
 * 15% more from everything. Every prune plants a rose where you stand; 3s later it blooms, and
 * if you are within 80px of it when it does, it heals you 9. Cut, then go back to the bed.
 */
const gardenersShears: ItemScriptFactory = (ctx) => {
  const EVERY = 6000;
  const BLOOM_MS = 3000;
  const REACH = 80;
  let openAt = 0;
  let open = false;
  let snipAt = 0;
  let roses: { x: number; y: number; at: number; done: boolean; bloomed: boolean }[] = [];
  return {
    update(time) {
      if (openAt === 0) openAt = time + EVERY * 0.5;
      if (!open && time >= openAt) { open = true; ctx.sfx('slash'); }
      for (const r of roses) {
        if (r.done || time < r.at + BLOOM_MS) continue;
        r.done = true;
        const p = ctx.player;
        if (alive(ctx, 'player') && Math.hypot(p.x - r.x, p.y - r.y) <= REACH) {
          r.bloomed = true;
          ctx.heal(p, 9);
          ctx.float(r.x, r.y - 30, 'IN BLOOM +9', '#ff9ab8');
          ctx.sfx('heal');
        } else {
          ctx.float(r.x, r.y - 30, 'WILTED', '#8a7a6a');
        }
      }
      roses = roses.filter((r) => time < r.at + BLOOM_MS + 900);
    },
    onHitDealt() {
      if (!open || !alive(ctx, 'npc')) return;
      open = false;
      const now = ctx.scene.time.now;
      openAt = now + EVERY;
      snipAt = now;
      const n = ctx.npc;
      ctx.hit(n, 12, n.x, n.y);
      ctx.boostDamage(1.15, 3000);
      ctx.float(n.x, n.y - 56, 'PRUNED', '#ff7a9a');
      ctx.flash(n.x, n.y, 0xe8f0f0);
      ctx.sfx('slash');
      roses.push({ x: ctx.player.x, y: ctx.player.y + 12, at: now, done: false, bloomed: false });
    },
    drawGround(g, time) {
      for (const r of roses) {
        const k = Math.min(1, (time - r.at) / BLOOM_MS);
        g.lineStyle(1.5, ROSE_PALE, 0.25 + k * 0.4); g.strokeCircle(r.x, r.y, REACH);
        if (!r.done) {
          g.lineStyle(2, 0x3a7a3a, 1); g.lineBetween(r.x, r.y, r.x, r.y - 6 - k * 10);
          rose(g, r.x, r.y - 8 - k * 10, 2 + k * 5, ROSE, 0.3 + k * 0.7);
        } else {
          const f = Math.min(1, (time - r.at - BLOOM_MS) / 900);
          rose(g, r.x, r.y - 18, r.bloomed ? 7 + f * 3 : 6 * (1 - f * 0.5), r.bloomed ? ROSE_PALE : 0x6a4a3a, r.bloomed ? 1 : 0.4);
        }
      }
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const snap = Math.max(0, 1 - (time - snipAt) / 300);
      const opening = open ? Math.min(1, 0.4 + Math.sin(time / 180) * 0.1 + 0.5) : 0.05 + snap * 0.1;
      shears(g, p.x - 18, p.y - 44, 0, 0.3 * opening, 36, open ? 0.95 : 0.45);
    },
  };
};

// ── charm-graft-twine ────────────────────────────────────────────────

/**
 * Raffia twine, the kind she binds a graft-union with. When a hit lands on you while the foe is
 * within 260px, the twine ties you together for 3s: every hit you deal while tied heals you 3,
 * as if their sap ran into you.
 */
const graftTwine: ItemScriptFactory = (ctx) => {
  const TIE_MS = 3000;
  const RANGE = 260;
  let until = 0;
  return {
    onHitTaken() {
      const p = ctx.player, n = ctx.npc;
      if (!alive(ctx, 'npc') || Math.hypot(n.x - p.x, n.y - p.y) > RANGE) return;
      const now = ctx.scene.time.now;
      if (now >= until) { ctx.float(p.x, p.y - 56, 'GRAFTED', '#d8c878'); ctx.sfx('whip'); }
      until = now + TIE_MS;
    },
    onHitDealt() {
      if (ctx.scene.time.now >= until || !alive(ctx, 'player')) return;
      ctx.heal(ctx.player, 3);
      ctx.float(ctx.player.x, ctx.player.y - 40, '+3', '#c8e878');
    },
    drawAir(g, time) {
      if (time >= until || !alive(ctx, 'npc') || !alive(ctx, 'player')) return;
      const p = ctx.player, n = ctx.npc;
      const k = (until - time) / TIE_MS;
      // A twist of twine sagging between you, with a bud swelling at the middle.
      g.lineStyle(3, 0xc8a868, 0.4 + k * 0.5);
      g.beginPath();
      for (let i = 0; i <= 16; i++) {
        const f = i / 16;
        const x = p.x + (n.x - p.x) * f, y = p.y + (n.y - p.y) * f + Math.sin(f * Math.PI) * 22 + Math.sin(time / 90 + f * 12) * 2;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
      const mx = (p.x + n.x) / 2, my = (p.y + n.y) / 2 + 22;
      g.fillStyle(SAP, 0.8); g.fillCircle(mx, my, 3 + Math.sin(time / 150) * 1);
    },
  };
};

// ── charm-cloche ─────────────────────────────────────────────────────

/**
 * A bell cloche off the Nursery bench. Stand still for 1.2s and it lowers over you: under the
 * glass you regrow 2 health a second, and the first hit that lands on you shatters it — and is
 * healed straight back (up to 20). Moving lifts it.
 */
const cloche: ItemScriptFactory = (ctx) => {
  const SETTLE_MS = 1200;
  let lx = 0, ly = 0;
  let stillSince = 0;
  let on = false;
  let lowered = 0;
  let shatterAt = 0;
  let acc = 0;
  return {
    update(time, dt) {
      const p = ctx.player;
      if (!alive(ctx, 'player')) { on = false; return; }
      if (Math.hypot(p.x - lx, p.y - ly) > 3) { lx = p.x; ly = p.y; stillSince = time; if (on) { on = false; ctx.sfx('crystal-chime'); } }
      if (!on && time - stillSince >= SETTLE_MS) { on = true; lowered = time; ctx.sfx('crystal-chime'); }
      if (on) {
        acc += dt * 2;
        if (acc >= 1) { const n = Math.floor(acc); acc -= n; ctx.heal(p, n); }
      }
    },
    onHitTaken(amount) {
      if (!on) return;
      on = false;
      stillSince = ctx.scene.time.now;
      shatterAt = ctx.scene.time.now;
      const back = Math.min(20, Math.round(amount));
      ctx.heal(ctx.player, back);
      ctx.float(ctx.player.x, ctx.player.y - 60, `CLOCHE +${back}`, '#c8f8f0');
      ctx.sfx('crystal-shatter');
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (on) {
        const k = Math.min(1, (time - lowered) / 260);
        const y = p.y - 20 - (1 - k) * 50;
        g.fillStyle(GLASS, 0.12); g.fillEllipse(p.x, y, 64, 80);
        g.lineStyle(2, GLASS, 0.55); g.strokeEllipse(p.x, y, 64, 80);
        g.fillStyle(0xffffff, 0.5); g.fillEllipse(p.x - 16, y - 18, 7, 18);
        g.fillStyle(0x2a3a34, 1); g.fillCircle(p.x, y - 40, 4);
      } else if (time - shatterAt < 450) {
        const k = (time - shatterAt) / 450;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          g.fillStyle(GLASS, 0.8 * (1 - k));
          g.fillTriangle(p.x + Math.cos(a) * (20 + k * 40), p.y - 20 + Math.sin(a) * (20 + k * 40),
            p.x + Math.cos(a + 0.2) * (26 + k * 40), p.y - 20 + Math.sin(a + 0.2) * (26 + k * 40),
            p.x + Math.cos(a) * (30 + k * 46), p.y - 16 + Math.sin(a) * (30 + k * 46));
        }
      }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const GLASSHOUSE_ITEMS: IsleItemDef[] = [
  {
    id: 'art-verdigra', name: "The Gardener's Shears", emoji: '✂️', kind: 'artifact', isle: 'life',
    flavor: 'Green bronze, a rose worked into the pivot. They have cut more of Thornwild than any frost, and they are still sharp.',
    script: 'art-verdigra', effect: { maxHp: 20 },
    scriptText: [
      'Every 6s the shears open. Your next hit prunes: +12 damage, and the foe takes +15% for 3s.',
      'Each prune plants a rose where you stand. Be within 80px when it blooms 3s later to heal 9.',
    ],
  },
  {
    id: 'charm-graft-twine', name: 'Graft Twine', emoji: '🧶', kind: 'charm', isle: 'life', sell: 170,
    flavor: 'A hank of raffia from the west garden of the maze. It has been tied round a great many wrists.',
    script: 'charm-graft-twine',
    scriptText: ['Hit within 260px of the foe: you are tied for 3s. Every hit you deal while tied heals you 3.'],
  },
  {
    id: 'charm-cloche', name: 'Bell Cloche', emoji: '🔔', kind: 'charm', isle: 'life', sell: 190,
    flavor: 'Off the Nursery bench. It kept a seedling warm through four frosts, and the seedling was a person.',
    script: 'charm-cloche', effect: { regenPerSecond: 0.2 },
    scriptText: ['Stand still 1.2s: a cloche lowers (2 HP/s). The first hit under it shatters it and is healed back (max 20).'],
  },
];

export const GLASSHOUSE_SCRIPTS: Record<string, ItemScriptFactory> = {
  'art-verdigra': gardenersShears,
  'charm-graft-twine': graftTwine,
  'charm-cloche': cloche,
};
