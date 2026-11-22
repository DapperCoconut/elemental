import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { eggSac, spiderling } from '../art';
import { BONE, HOURGLASS, SILK_LIT, VENOM } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Brood — Broodkeeper Mab.
 *
 * Mab keeps the brood pens, where the farm's eggs are hung to ripen. Egg sacs hang about her floor
 * on threads from the rafters, swelling, yellowing, twitching as they near their time. A sac that
 * ripens bursts and a handful of spiderlings pour out — and they run at whoever is *nearest*, bite
 * and bite again. They do not know Mab from you.
 *
 * Strike a sac before it hatches and it is only a mess of silk. Mab keeps hanging new ones; she
 * hangs them near you, and keeps herself the far side of you from the ripest. Turn it round:
 * leave the sac that is ripening by her, and stand off.
 */

const MAX_SACS = 6;
const LING_SPEED = 150;
const LING_LIFE = 9000;
const BITE = 5;
const BITE_EVERY = 700;
const BITE_R = 22;

interface Sac { x: number; y: number; bornAt: number; hatchAt: number; target: StrikeTarget; burstAt: number; squashed: boolean }
interface Ling { x: number; y: number; a: number; bornAt: number; biteAt: number; target: StrikeTarget; dead: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const sacs: Sac[] = [];
  const lings: Ling[] = [];
  const RIPEN = ctx.hard ? 6400 : 7600;
  const layEvery = ctx.hard ? 2600 : 3300;
  let nextLay = 0;
  let started = false;

  const ripeness = (s: Sac, time: number) => clamp((time - s.bornAt) / Math.max(1, s.hatchAt - s.bornAt), 0, 1);

  function squash(s: Sac): void {
    if (s.squashed || s.burstAt > 0) return;
    s.squashed = true;
    s.burstAt = ctx.scene.time.now;
    s.target.remove();
    ctx.sfx('slime-splat');
    ctx.float(s.x, s.y - 30, 'SQUASHED', '#e8e2cc');
  }

  function hang(time: number, near: Pt | null): void {
    if (sacs.filter((s) => s.burstAt === 0).length >= MAX_SACS) return;
    for (let tries = 0; tries < 12; tries++) {
      const x = near ? clamp(near.x + (rng() - 0.5) * 320, 60, W - 60) : 80 + rng() * (W - 160);
      const y = near ? clamp(near.y + (rng() - 0.5) * 240, top + 70, H - 50) : top + 80 + rng() * (H - top - 140);
      if (dist(x, y, player.x, player.y) < 90 || dist(x, y, npc.x, npc.y) < 90) continue;
      if (sacs.some((s) => s.burstAt === 0 && dist(s.x, s.y, x, y) < 100)) continue;
      const s: Sac = { x, y, bornAt: time, hatchAt: time + RIPEN * (0.85 + rng() * 0.3), target: null as unknown as StrikeTarget, burstAt: 0, squashed: false };
      s.target = ctx.target({ x, y, r: 18, onStruck: () => squash(s) });
      sacs.push(s);
      ctx.sfx('spore');
      return;
    }
  }

  function hatch(s: Sac, time: number): void {
    s.burstAt = time;
    s.target.remove();
    ctx.sfx('status-poison');
    ctx.float(s.x, s.y - 34, 'HATCHED', '#9ad04a');
    const n = ctx.hard ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng();
      const l: Ling = { x: s.x + Math.cos(a) * 10, y: s.y + Math.sin(a) * 10, a, bornAt: time, biteAt: 0, target: null as unknown as Ling['target'], dead: 0, seed: rng() * 10 };
      l.target = ctx.target({ x: l.x, y: l.y, r: 11, passThrough: true, onStruck: () => { if (!l.dead) { l.dead = ctx.scene.time.now; l.target.remove(); ctx.sfx('slime-splat'); } } });
      lings.push(l);
    }
  }

  const nearest = (x: number, y: number): Fighter | null => {
    const fs = [player, npc].filter(alive);
    if (!fs.length) return null;
    return fs.reduce((b, f) => (dist(f.x, f.y, x, y) < dist(b.x, b.y, x, y) ? f : b));
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextLay = time + layEvery;
        for (let i = 0; i < 3; i++) hang(time - i * 1500, null);
      }
      if (time >= nextLay) {
        nextLay = time + layEvery;
        // Mab hangs them near you.
        hang(time, alive(player) ? { x: player.x, y: player.y } : null);
      }
      for (const s of sacs) if (s.burstAt === 0 && time >= s.hatchAt) hatch(s, time);
      for (let i = sacs.length - 1; i >= 0; i--) if (sacs[i].burstAt > 0 && time - sacs[i].burstAt > 1200) sacs.splice(i, 1);

      for (let i = lings.length - 1; i >= 0; i--) {
        const l = lings[i];
        if (l.dead) { if (time - l.dead > 400) lings.splice(i, 1); continue; }
        if (time - l.bornAt > LING_LIFE) { l.dead = time; l.target.remove(); continue; }
        const f = nearest(l.x, l.y);
        if (!f) continue;
        const d = dist(l.x, l.y, f.x, f.y);
        const want = Math.atan2(f.y - l.y, f.x - l.x) + Math.sin(time / 180 + l.seed) * 0.5;
        l.a = want;
        if (d > BITE_R - 4) {
          l.x = clamp(l.x + Math.cos(l.a) * LING_SPEED * dt, 30, W - 30);
          l.y = clamp(l.y + Math.sin(l.a) * LING_SPEED * dt, top + 20, H - 20);
          l.target.moveTo(l.x, l.y);
        }
        if (d < BITE_R && time >= l.biteAt) {
          l.biteAt = time + BITE_EVERY;
          ctx.hit(f, ctx.hard && f === player ? BITE + 1 : BITE, f.x, f.y);
          ctx.sfx('hit-light');
        }
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Keep you between her and the ripest sac, and keep clear of any brood that is loose.
      let ripest: Sac | null = null;
      let best = -1;
      const now = ctx.scene.time.now;
      for (const s of sacs) { if (s.burstAt) continue; const r = ripeness(s, now); if (r > best) { best = r; ripest = s; } }
      let x: number, y: number;
      if (ripest && best > 0.4) {
        const a = Math.atan2(player.y - ripest.y, player.x - ripest.x);
        x = player.x + Math.cos(a) * 210; y = player.y + Math.sin(a) * 170;
      } else {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x) + 0.4;
        x = player.x + Math.cos(a) * 220; y = player.y + Math.sin(a) * 180;
      }
      for (const l of lings) { if (!l.dead && dist(l.x, l.y, x, y) < 120) { x += (x - l.x) * 0.8; y += (y - l.y) * 0.8; } }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const s of sacs) {
        if (s.burstAt > 0) {
          // The burst husk on the floor: torn silk and wet.
          const k = clamp((time - s.burstAt) / 1200, 0, 1);
          g.fillStyle(s.squashed ? BONE : VENOM, 0.4 * (1 - k)); g.fillEllipse(s.x, s.y + 20, 44, 14);
          g.lineStyle(1, SILK_LIT, 0.6 * (1 - k));
          for (let i = 0; i < 6; i++) { const a = i * 1.05; g.lineBetween(s.x, s.y + 18, s.x + Math.cos(a) * 24, s.y + 18 + Math.sin(a) * 8); }
          continue;
        }
        // A shadow that darkens, and a ring that closes as it ripens.
        const r = ripeness(s, time);
        g.fillStyle(0x000000, 0.12 + r * 0.12); g.fillEllipse(s.x, s.y + 24, 40, 12);
        g.lineStyle(2, r > 0.75 ? HOURGLASS : VENOM, 0.25 + r * 0.5);
        g.beginPath(); g.arc(s.x, s.y + 24, 26, -Math.PI / 2, -Math.PI / 2 + (1 - r) * Math.PI * 2, false); g.strokePath();
      }
      for (const l of lings) { if (!l.dead) { g.fillStyle(0x000000, 0.2); g.fillEllipse(l.x, l.y + 6, 18, 6); } }
    },

    drawAir(g, time) {
      for (const s of sacs) {
        if (s.burstAt > 0) {
          const k = clamp((time - s.burstAt) / 400, 0, 1);
          if (k < 1) { g.lineStyle(2, s.squashed ? BONE : VENOM, 1 - k); g.strokeCircle(s.x, s.y, 16 + k * 30); }
          continue;
        }
        eggSac(g, s.x, s.y, 14, ripeness(s, time), time / 1000, Math.max(30, s.y - top - 10));
      }
      for (const l of lings) {
        if (l.dead) {
          const k = clamp((ctx.scene.time.now - l.dead) / 400, 0, 1);
          g.fillStyle(VENOM, 0.6 * (1 - k)); g.fillCircle(l.x, l.y, 6 + k * 6);
          continue;
        }
        spiderling(g, l.x, l.y, l.a, time / 1000 + l.seed);
      }
    },
  };
}

export const BROOD: GimmickDef = {
  id: 'web-brood',
  rules: 'Egg sacs ripen and hatch spiderlings that bite whoever is nearest. Strike a sac before it hatches. Mab hangs new ones near you.',
  make,
};
