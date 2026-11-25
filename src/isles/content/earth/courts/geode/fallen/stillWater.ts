import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, mixC, type G } from '../../../../../art/IsleArt';
import { crystalPoint } from '../art';
import { AMETHYST, AMETHYST_DARK, AMETHYST_LIT, FLAG, FLAG_DARK, GRIT_LIT, POOL, POOL_DEEP, POOL_LIT, QUARTZ_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Still Water — Sidony Tolliver, keeper of the crystal pool, who in the King's telling kept the
 * water so still that the Prince could read a household's face in it from the Cutting-House.
 *
 * The south of the yard is the pool's shallows: ankle-deep, clear to the amethyst bed, and still
 * as glass. Anyone standing on the bank is mirrored in it — the reflection lies across the
 * waterline, as far out as you stand back. And the water keeps what it shows: **strike a
 * reflection and the one it mirrors takes the blow.** Shots pass through, so a blow aimed at the
 * pool lands on the bank.
 *
 * Wade in and you cast no reflection — but the shallows drag at your feet. So: stand on the bank
 * and be reachable through the water, or stand in it and be slow. Sidony wades out to wherever
 * your reflection lies and fights it; turn it round on her when she climbs out. Halfway, the
 * water remembers: reflections show where their owner stood a moment ago, and cut deeper.
 */

const ID = fallenId('geode', 'still-water');
const SHORE_DOWN = 214;
const REF_R = 24;
const WADE = 0.76;
const LAG_MS = 900;
const COOLDOWN_MS = 220;
const OFF = -600;

interface Trace { t: number; x: number; y: number }
interface Mirror { f: Fighter; side: 'player' | 'npc'; trail: Trace[]; at: Pt | null; target: StrikeTarget; struckAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const shore = top + SHORE_DOWN;
  let halved = false;
  const ripples: { x: number; y: number; at: number }[] = [];

  const onBank = (y: number) => y < shore - 4;

  function mirror(f: Fighter, side: 'player' | 'npc'): Mirror {
    const m: Omit<Mirror, 'target'> = { f, side, trail: [], at: null, struckAt: -9999 };
    const target = ctx.target({
      x: OFF, y: OFF, r: REF_R, passThrough: true,
      onStruck: (by, amount) => {
        const time = ctx.scene.time.now;
        if (by === side || !m.at || !alive(f) || time - m.struckAt < COOLDOWN_MS) return;
        m.struckAt = time;
        ripples.push({ x: m.at.x, y: m.at.y, at: time });
        ctx.hit(f, Math.max(1, amount * (halved ? 1.25 : 1)), f.x, f.y);
        ctx.sfx('splash');
        ctx.flash(m.at.x, m.at.y, POOL_LIT);
      },
    });
    return Object.assign(m, { target });
  }

  const pm = mirror(player, 'player');
  const nm = mirror(npc, 'npc');

  /** Where a fighter stood `LAG_MS` ago (or now, before the turn). */
  function source(m: Mirror, time: number): Pt {
    if (!halved || !m.trail.length) return { x: m.f.x, y: m.f.y };
    const want = time - LAG_MS;
    for (let i = m.trail.length - 1; i >= 0; i--) if (m.trail[i].t <= want) return m.trail[i];
    return m.trail[0];
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!halved && alive(npc) && npc.hp < npc.maxHp * 0.5) {
        halved = true;
        ctx.banner('THE WATER REMEMBERS', '#a8d0f0');
        ctx.sfx('time-warp');
      }
      for (const m of [pm, nm]) {
        m.trail.push({ t: time, x: m.f.x, y: m.f.y });
        while (m.trail.length && m.trail[0].t < time - LAG_MS - 400) m.trail.shift();
        const s = source(m, time);
        if (alive(m.f) && onBank(s.y)) {
          m.at = { x: s.x, y: clamp(2 * shore - s.y, shore + 10, H - 16) };
          m.target.moveTo(m.at.x, m.at.y);
        } else {
          m.at = null;
          m.target.moveTo(OFF, OFF);
        }
      }
      for (let i = ripples.length - 1; i >= 0; i--) if (time - ripples[i].at > 900) ripples.splice(i, 1);
    },

    playerSpeedMult: () => (player.y > shore ? WADE : 1),
    npcSpeedMult: () => (npc.y > shore ? WADE : 1),

    destroy() { pm.target.remove(); nm.target.remove(); },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // The player stands on the bank: wade out to their reflection and fight that.
      if (pm.at) {
        const a = Math.atan2(npc.y - pm.at.y, npc.x - pm.at.x);
        const p = { x: pm.at.x + Math.cos(a) * 42, y: pm.at.y + Math.sin(a) * 42 };
        if (dist(npc.x, npc.y, pm.at.x, pm.at.y) > 52) return { x: clamp(p.x, 60, W - 60), y: clamp(p.y, shore + 20, H - 40) };
        return null;
      }
      // The player is in the water: keep her own reflection out of their reach by wading too,
      // unless she is already in.
      if (nm.at && dist(player.x, player.y, nm.at.x, nm.at.y) < 220) {
        return { x: clamp(npc.x, 60, W - 60), y: clamp(shore + 80, top + 50, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      drawPool(g, W, H, shore, time);
      for (const r of ripples) {
        const k = (time - r.at) / 900;
        for (let i = 0; i < 3; i++) {
          const kk = clamp(k - i * 0.15, 0, 1);
          if (kk <= 0) continue;
          g.lineStyle(1.5, POOL_LIT, 0.7 * (1 - kk)); g.strokeEllipse(r.x, r.y, 20 + kk * 90, 8 + kk * 32);
        }
      }
      for (const m of [pm, nm]) {
        if (!m.at) continue;
        drawReflection(g, m, time, halved);
      }
      // Wading wakes.
      for (const f of [player, npc]) {
        if (!alive(f) || f.y <= shore) continue;
        const ph = (time / 500) % 1;
        g.lineStyle(1.2, POOL_LIT, 0.55 * (1 - ph)); g.strokeEllipse(f.x, f.y + 4, 30 + ph * 26, 10 + ph * 8);
      }
    },

    drawHud(g) {
      // Two small mirrors: lit while that side is reflected.
      const y = top + 16;
      const one = (x: number, m: Mirror, tag: number) => {
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 26, y - 13, 52, 26, 7);
        g.fillStyle(tag, 1); g.fillCircle(x - 16, y, 4);
        g.fillStyle(m.at ? POOL_LIT : POOL_DEEP, m.at ? 0.95 : 0.6); g.fillEllipse(x + 6, y, 26, 16);
        g.lineStyle(2, m.at ? QUARTZ_LIT : 0x5a6470, 1); g.strokeEllipse(x + 6, y, 26, 16);
        if (m.at) { g.fillStyle(dim(POOL_DEEP, 0.2), 0.9); g.fillEllipse(x + 6, y + 2, 6, 9); g.fillCircle(x + 6, y - 4, 3); }
      };
      one(W / 2 - 40, pm, 0xd8ccb0);
      one(W / 2 + 40, nm, 0xffa040);
    },
  };
}

/** The pool: quartz flags of the bank, a wet lip, then clear water over a bed of amethyst points. */
function drawPool(g: G, W: number, H: number, shore: number, time: number): void {
  // Bank flags: a polished apron so the reflections read as coming off something.
  for (let x = 0; x < W; x += 64) {
    g.fillStyle((x / 64) % 2 ? FLAG : mixC(FLAG, GRIT_LIT, 0.5), 0.5); g.fillRect(x + 2, shore - 30, 60, 26);
    g.lineStyle(1, FLAG_DARK, 0.6); g.strokeRect(x + 2, shore - 30, 60, 26);
  }
  // The water.
  g.fillStyle(POOL_DEEP, 0.55); g.fillRect(0, shore, W, H - shore);
  g.fillStyle(POOL, 0.35); g.fillRect(0, shore, W, Math.min(70, H - shore));
  // The amethyst bed under it, seen through the water.
  for (let i = 0; i < 26; i++) {
    const x = ((i * 137) % W) + 18;
    const y = shore + 40 + ((i * 71) % Math.max(40, H - shore - 60));
    crystalPoint(g, x, y, 8 + (i % 3) * 3, 18 + (i % 4) * 7, ((i % 5) - 2) * 0.3, i % 4 ? AMETHYST_DARK : AMETHYST, 0.45);
  }
  // Light lying on the surface, slow as oil.
  for (let i = 0; i < 9; i++) {
    const y = shore + 26 + i * ((H - shore) / 9);
    const x = ((i * 211 + time / 60) % (W + 200)) - 100;
    g.lineStyle(1.2, POOL_LIT, 0.22); g.lineBetween(x, y, x + 70 + (i % 3) * 30, y);
  }
  // The lip: a wet dark band, a bright meniscus line.
  g.fillStyle(dim(FLAG_DARK, 0.3), 0.6); g.fillRect(0, shore - 4, W, 6);
  g.lineStyle(2, QUARTZ_LIT, 0.65); g.lineBetween(0, shore + 2, W, shore + 2);
}

/** A reflection: the fighter drawn upside down in the water as a wavering dark-and-glint figure. */
function drawReflection(g: G, m: Mirror, time: number, lag: boolean): void {
  if (!m.at) return;
  const { x, y } = m.at;
  const tint = m.side === 'player' ? 0xd8ccb0 : 0xffa040;
  const wob = (k: number) => Math.sin(time / 140 + k * 1.7) * 2.2;
  glow(g, x, y + 10, 34, mixC(POOL_LIT, tint, 0.3), 0.05, 3);
  // Feet at the top (the waterline side), head toward the deep.
  g.fillStyle(dim(POOL_DEEP, 0.3), 0.7);
  g.fillEllipse(x + wob(0), y - 10, 26, 12);
  g.fillEllipse(x + wob(1), y + 6, 30, 22);
  g.fillCircle(x + wob(2), y + 26, 11);
  g.lineStyle(1.5, lit(tint, 0.3), 0.55);
  for (let i = 0; i < 4; i++) {
    const yy = y - 12 + i * 12;
    g.lineBetween(x - 14 + wob(i), yy, x + 14 + wob(i + 0.5), yy);
  }
  g.fillStyle(lit(tint, 0.4), 0.8); g.fillCircle(x - 4 + wob(2), y + 26, 1.8); g.fillCircle(x + 4 + wob(2), y + 26, 1.8);
  // The strike ring: a thin bright border so the target is plain.
  g.lineStyle(1.5, m.side === 'player' ? QUARTZ_LIT : AMETHYST_LIT, 0.6 + Math.sin(time / 200) * 0.2);
  g.strokeEllipse(x, y + 6, REF_R * 2.3, REF_R * 1.7);
  if (lag) {
    // Remembered water: the figure trails rings back toward the bank.
    g.lineStyle(1, POOL_LIT, 0.35); g.strokeEllipse(x, y + 6, REF_R * 3, REF_R * 2.2);
  }
}

export const FALLEN_STILL_WATER: GimmickDef = {
  id: ID,
  rules: 'On the bank you are mirrored in the pool: strike a reflection and its owner takes the blow. Wade in to hide it, slowly. At half, the water lags.',
  make,
};
