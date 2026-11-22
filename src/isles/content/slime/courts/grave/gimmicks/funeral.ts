import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { coffin, mourner } from '../art';
import { BONE, IRON, LAMP, LAMP_HOT, PETAL, PETAL_LIT, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Funeral — Mourner Dirge.
 *
 * Dirge keens for hire, and on Fangmire there is always work. Every so often a procession comes
 * through the yard: a mute in front with a lantern on a pole, six bearers with the coffin on
 * their shoulders, two veiled mourners behind. Candles are set out along its way a moment before,
 * so you can see the line it will walk. It does not stop for anybody. Touch it and you are shoved
 * hard aside — the bearers are big, and grief is heavier than it looks.
 *
 * Behind the coffin Dirge's mourners strew red petals, and the wake heals whoever stands in it.
 * The coffin itself is solid oak and catches any shot that meets it: walk beside a funeral and it
 * is cover. Dirge uses it for both, and so can you.
 */

const LEAD = 70;      // leader ahead of the coffin's centre
const TAIL = 92;      // mourners behind it
const HALF_W = 26;
const SHOVE = 120;
const SHOVE_DMG = 9;
const PETAL_LIFE = 7000;
const PETAL_R = 24;
const HEAL_PER_S = 6;

interface Procession {
  /** Start and end of its walk (off the edges). */
  ax: number; ay: number; bx: number; by: number;
  ang: number; len: number;
  warnAt: number; startAt: number;
  /** Distance walked along the line (coffin centre). */
  s: number;
  done: boolean;
  lastPetal: number;
}
interface Petal { x: number; y: number; at: number; rot: number; lit: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const period = ctx.hard ? 7200 : 9000;
  const warnMs = 1700;
  const pace = ctx.hard ? 104 : 86;
  let proc: Procession | null = null;
  let nextAt = 0;
  let started = false;
  const petals: Petal[] = [];
  const shovedAt = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const healAcc = new Map<Fighter, number>([[player, 0], [npc, 0]]);

  const coffinPos = (p: Procession): Pt => ({ x: p.ax + Math.cos(p.ang) * p.s, y: p.ay + Math.sin(p.ang) * p.s });

  function begin(time: number): void {
    // Across the yard near the player, horizontal or vertical, from either side.
    const horiz = rng() < 0.6;
    const rev = rng() < 0.5;
    if (horiz) {
      const y = clamp(player.y + (rng() - 0.5) * 120, top + 70, H - 60);
      const [ax, bx] = rev ? [W + 140, -140] : [-140, W + 140];
      proc = { ax, ay: y, bx, by: y, ang: rev ? Math.PI : 0, len: W + 280, warnAt: time, startAt: time + warnMs, s: 0, done: false, lastPetal: 0 };
    } else {
      const x = clamp(player.x + (rng() - 0.5) * 160, 80, W - 80);
      const [ay, by] = rev ? [H + 140, top - 40] : [top - 40, H + 140];
      proc = { ax: x, ay, bx: x, by, ang: rev ? -Math.PI / 2 : Math.PI / 2, len: H - top + 180, warnAt: time, startAt: time + warnMs, s: 0, done: false, lastPetal: 0 };
    }
    ctx.banner('A FUNERAL PASSES', '#f07a96');
    ctx.sfx('holy-chord');
  }

  /** Where a fighter stands relative to the procession: along (from coffin) and across. */
  function rel(p: Procession, f: Fighter): { along: number; across: number } {
    const c = coffinPos(p);
    const dx = f.x - c.x, dy = f.y - c.y;
    return { along: dx * Math.cos(p.ang) + dy * Math.sin(p.ang), across: -dx * Math.sin(p.ang) + dy * Math.cos(p.ang) };
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextAt = time + 2600; }
      if (!proc && time >= nextAt) begin(time);
      const p = proc;
      if (p && time >= p.startAt) {
        p.s += pace * dt;
        const c = coffinPos(p);
        // The coffin is oak: shots stop on it.
        for (const sh of ctx.shotsNear(c.x, c.y, 34)) sh.block();
        // The bearers shove aside anyone in the way.
        for (const f of [player, npc]) {
          if (!alive(f) || ctx.isAirborne(f) || time - (shovedAt.get(f) ?? 0) < 900) continue;
          const r = rel(p, f);
          if (r.along > -TAIL && r.along < LEAD + 10 && Math.abs(r.across) < HALF_W + 20) {
            shovedAt.set(f, time);
            const side = r.across >= 0 ? 1 : -1;
            const nx = -Math.sin(p.ang) * side, ny = Math.cos(p.ang) * side;
            ctx.nudge(f, nx * SHOVE + Math.cos(p.ang) * 30, ny * SHOVE + Math.sin(p.ang) * 30);
            ctx.hit(f, SHOVE_DMG, f.x, f.y);
            ctx.stun(f, 260);
            ctx.float(f.x, f.y - 46, 'MAKE WAY', '#f07a96');
            ctx.sfx('hit-heavy');
          }
        }
        // Petals strewn behind the mourners.
        if (time - p.lastPetal > 120) {
          p.lastPetal = time;
          const tx = c.x - Math.cos(p.ang) * (TAIL + 8), ty = c.y - Math.sin(p.ang) * (TAIL + 8);
          if (tx > 20 && tx < W - 20 && ty > top + 10 && ty < H - 10) {
            petals.push({ x: tx + (rng() - 0.5) * 36 * Math.abs(Math.sin(p.ang) || 1), y: ty + (rng() - 0.5) * 36 * Math.abs(Math.cos(p.ang) || 1), at: time, rot: rng() * 6, lit: rng() < 0.4 });
          }
        }
        if (p.s > p.len + TAIL + 40) { p.done = true; proc = null; nextAt = time + period - warnMs; }
      }
      for (let i = petals.length - 1; i >= 0; i--) if (time - petals[i].at > PETAL_LIFE) petals.splice(i, 1);
      // The wake heals.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const on = petals.some((pe) => dist(pe.x, pe.y, f.x, f.y) < PETAL_R);
        if (!on) continue;
        const acc = (healAcc.get(f) ?? 0) + HEAL_PER_S * dt;
        if (acc >= 2) { ctx.heal(f, 2); healAcc.set(f, acc - 2); } else healAcc.set(f, acc);
      }
    },

    npcSeek(): Pt | null {
      const hurt = npc.hp / Math.max(1, npc.maxHp) < 0.8;
      if (hurt && petals.length) {
        let best: Petal | null = null, bd = Infinity;
        for (const pe of petals) { const d = dist(pe.x, pe.y, npc.x, npc.y); if (d < bd) { bd = d; best = pe; } }
        if (best) return { x: best.x, y: best.y };
      }
      const p = proc;
      if (p && ctx.scene.time.now >= p.startAt) {
        // Cover: the far side of the coffin from the player, keeping pace with it.
        const r = rel(p, player);
        const side = r.across >= 0 ? -1 : 1;
        const c = coffinPos(p);
        const off = HALF_W + 60;
        return {
          x: clamp(c.x - Math.sin(p.ang) * side * off + Math.cos(p.ang) * 20, 60, W - 60),
          y: clamp(c.y + Math.cos(p.ang) * side * off + Math.sin(p.ang) * 20, top + 50, H - 40),
        };
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 150, 60, W - 60), y: clamp(player.y + Math.sin(a) * 150, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The wake: red petals fading.
      for (const pe of petals) {
        const k = 1 - (time - pe.at) / PETAL_LIFE;
        g.fillStyle(pe.lit ? PETAL_LIT : PETAL, 0.85 * k);
        g.fillEllipse(pe.x, pe.y, 7, 4);
        g.fillStyle(PETAL, 0.4 * k); g.fillEllipse(pe.x + Math.cos(pe.rot) * 4, pe.y + Math.sin(pe.rot) * 2, 5, 3);
      }
      const p = proc;
      if (!p) return;
      // The way: candles set out along it, lit one by one during the warning.
      const k = clamp((time - p.warnAt) / warnMs, 0, 1);
      const steps = Math.floor(p.len / 70);
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const x = p.ax + (p.bx - p.ax) * t, y = p.ay + (p.by - p.ay) * t;
        if (x < 10 || x > W - 10 || y < top || y > H) continue;
        for (const side of [-1, 1]) {
          const cx = x - Math.sin(p.ang) * side * (HALF_W + 14), cy = y + Math.cos(p.ang) * side * (HALF_W + 14);
          g.fillStyle(BONE, 0.9); g.fillRect(cx - 1.5, cy - 8, 3, 8);
          const litNow = time >= p.startAt || t < k * 1.1;
          if (litNow) { g.fillStyle(LAMP, 0.9); g.fillCircle(cx, cy - 10, 2); g.fillStyle(LAMP, 0.08); g.fillCircle(cx, cy - 8, 10); }
        }
      }
      if (time < p.startAt) {
        g.lineStyle(2, PETAL, 0.12 + k * 0.2);
        g.lineBetween(p.ax, p.ay, p.bx, p.by);
      }
    },

    drawAir(g, time) {
      const p = proc;
      if (!p || time < p.startAt) return;
      const c = coffinPos(p);
      const ca = Math.cos(p.ang), sa = Math.sin(p.ang);
      const at = (along: number, across: number): Pt => ({ x: c.x + ca * along - sa * across, y: c.y + sa * along + ca * across });
      // The mute ahead, with his lantern on a pole.
      const lead = at(LEAD, 0);
      mourner(g, lead.x, lead.y + 10, 1.1, time, 0);
      g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(lead.x + 6, lead.y + 6, lead.x + 10, lead.y - 46);
      g.lineStyle(1, IRON, 1); g.lineBetween(lead.x + 10, lead.y - 46, lead.x + 16, lead.y - 44);
      g.fillStyle(LAMP, 0.95); g.fillRect(lead.x + 13, lead.y - 44, 7, 9);
      g.fillStyle(LAMP_HOT, 1); g.fillRect(lead.x + 15.5, lead.y - 41, 2, 3);
      glow(g, lead.x + 16, lead.y - 40, 22, LAMP, 0.05, 3);
      // Six bearers, three a side, and the coffin on their shoulders.
      for (const along of [-34, 0, 34]) for (const side of [-1, 1]) {
        const b = at(along, side * 16);
        mourner(g, b.x, b.y + 12, 1, time, along * 0.1 + side, true);
      }
      coffin(g, c.x, c.y - 22, 108, 34, p.ang, 0, true);
      // Two veiled mourners behind, strewing.
      for (const side of [-1, 1]) {
        const m = at(-TAIL + 10, side * 14);
        mourner(g, m.x, m.y + 10, 0.95, time, side * 3);
        const ph = (time / 400 + (side > 0 ? 0.5 : 0)) % 1;
        g.fillStyle(PETAL_LIT, 1 - ph); g.fillEllipse(m.x - ca * 14 * ph + side * 6, m.y - 18 + ph * 22, 5, 3);
      }
    },

    destroy() { petals.length = 0; proc = null; },
  };
}

export const FUNERAL: GimmickDef = {
  id: 'grave-funeral',
  rules: 'A funeral crosses the yard along a line of candles. Touch it and you are shoved hard aside; its coffin stops shots. The petals strewn behind it heal whoever stands in them.',
  make,
};
