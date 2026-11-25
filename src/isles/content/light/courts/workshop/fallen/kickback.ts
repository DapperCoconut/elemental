import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, lit, mixC, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  HEAT_WHITE, IRON, IRON_DARK, IRON_LIT, MOLTEN, MOLTEN_DARK, MOLTEN_LIT, QUENCH, QUENCH_DEEP, QUENCH_LIT, RIVET, ROUGE,
  SIDE_NPC, SIDE_PLAYER, STEAM,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { arrowHead, coil, hpRatio, rivet, unit } from './kit';

/**
 * Kickback — Springwright Mungo Tamp, who proved every spring the Magnum Opus wears, and in the
 * King's telling proved them on men strapped into his harnesses.
 *
 * Both fighters fight in a proof harness: **every cast kicks the caster back**, straight away from
 * where they aimed (a basic swing a little, an ability a full stride). The arrow behind each fighter
 * shows where the next kick lands, and turns red when that is somewhere bad. In the middle of the
 * deck is the quench tank — kicked (or walked) into it you are **dunked**, a blow and a long stun;
 * the furnace grates in two corners burn; a kick that slams you into a wall knocks the wind out.
 *
 * So you aim with your back in mind: cast away from the tank, use a kick as a free dodge, and get
 * him between you and the water — his casts come at you, so they throw him back into it. Past half
 * the springs are wound tight and every kick goes half as far again.
 */

const ID = fallenId('workshop', 'kickback');
const KICK_MS = 0.14;
const KICK_CLICK = 34;
const KICK_ABILITY = 72;
const KICK_NPC = 58;

interface Kick { f: Fighter; ux: number; uy: number; total: number; left: number; lost: number }
interface Pit { x: number; y: number; r: number }
interface Splash { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const tank: Pit = { x: W / 2, y: top + (H - top) / 2 + 20, r: 66 };
  const grates: Pit[] = [{ x: 150, y: top + 110, r: 44 }, { x: W - 150, y: H - 90, r: 44 }];
  const kicks: Kick[] = [];
  const splashes: Splash[] = [];
  const lastKick = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const dunkImmune = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const burn = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let tight = false;

  const mult = (): number => (tight ? 1.5 : 1);
  /** Which way a fighter's next kick goes: the stranger away from her aim, the foe away from her. */
  const kickDir = (f: Fighter): { x: number; y: number } => {
    if (f === player) { const a = ctx.facing(player) + Math.PI; return { x: Math.cos(a), y: Math.sin(a) }; }
    return unit(player.x, player.y, npc.x, npc.y);
  };
  const bad = (p: Pt): boolean =>
    dist(p.x, p.y, tank.x, tank.y) < tank.r || grates.some((gr) => dist(p.x, p.y, gr.x, gr.y) < gr.r) ||
    p.x < 40 || p.x > W - 40 || p.y < top || p.y > H - 40;

  function kick(f: Fighter, len: number): void {
    if (!alive(f)) return;
    const d = kickDir(f);
    kicks.push({ f, ux: d.x, uy: d.y, total: len * mult(), left: len * mult(), lost: 0 });
    lastKick.set(f, ctx.scene.time.now);
    ctx.sfx('boing');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!tight && hpRatio(npc) < 0.5) { tight = true; ctx.banner('THE SPRINGS ARE WOUND TIGHT'); ctx.sfx('gear-turn'); }
      for (let i = kicks.length - 1; i >= 0; i--) {
        const k = kicks[i];
        const step = Math.min(k.left, (k.total * dt) / KICK_MS);
        const bx = k.f.x, by = k.f.y;
        ctx.nudge(k.f, k.ux * step, k.uy * step);
        k.lost += Math.max(0, step - dist(bx, by, k.f.x, k.f.y));
        k.left -= step;
        if (k.left <= 0.01) {
          // Kicked into a wall: slammed.
          if (k.total >= 30 && k.lost > k.total * 0.5 && alive(k.f)) {
            ctx.hit(k.f, 8, k.f.x, k.f.y); ctx.stun(k.f, 300); ctx.sfx('stone-slam');
          }
          kicks.splice(i, 1);
        }
      }
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        // The quench tank: dunked, then hauled out onto the rim.
        if (dist(f.x, f.y, tank.x, tank.y) < tank.r - 6 && time >= (dunkImmune.get(f) ?? 0)) {
          dunkImmune.set(f, time + 1800);
          ctx.hit(f, 12, f.x, f.y);
          ctx.stun(f, 900);
          splashes.push({ x: f.x, y: f.y, at: time });
          const u = unit(tank.x, tank.y, f.x, f.y);
          ctx.nudge(f, tank.x + u.x * (tank.r + 30) - f.x, tank.y + u.y * (tank.r + 30) - f.y);
          for (let i = kicks.length - 1; i >= 0; i--) if (kicks[i].f === f) kicks.splice(i, 1);
          ctx.sfx('splash');
        }
        // The furnace grates.
        if (grates.some((gr) => dist(f.x, f.y, gr.x, gr.y) < gr.r) && time - (burn.get(f) ?? 0) >= 500) {
          burn.set(f, time);
          ctx.hit(f, 5, f.x, f.y);
          ctx.sfx('sizzle');
        }
      }
      while (splashes.length && time - splashes[0].at > 900) splashes.shift();
    },

    onPlayerCast(_id, slot) {
      const now = ctx.scene.time.now;
      if (slot === 'click') { if (now - (lastKick.get(player) ?? 0) < 220) return; kick(player, KICK_CLICK); }
      else kick(player, KICK_ABILITY);
    },
    onNpcCast() {
      if (ctx.scene.time.now - (lastKick.get(npc) ?? 0) < 380) return;
      kick(npc, KICK_NPC);
    },

    npcSeek() {
      // Stand at fighting range from the stranger with nothing bad behind his back.
      const len = KICK_NPC * mult() * 1.6;
      let best: Pt | null = null, bs = Infinity;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const p = { x: player.x + Math.cos(a) * 210, y: player.y + Math.sin(a) * 210 };
        if (bad(p)) continue;
        const back = { x: p.x + Math.cos(a) * len, y: p.y + Math.sin(a) * len };
        const mid = { x: p.x + Math.cos(a) * len * 0.5, y: p.y + Math.sin(a) * len * 0.5 };
        const s = (bad(back) || bad(mid) ? 1000 : 0) + dist(npc.x, npc.y, p.x, p.y) * 0.4 + (dist(p.x, p.y, tank.x, tank.y) < tank.r + 70 ? 200 : 0);
        if (s < bs) { bs = s; best = p; }
      }
      return best ? { x: clamp(best.x, 50, W - 50), y: clamp(best.y, top + 40, H - 40) } : null;
    },

    drawGround(g, time) {
      for (const gr of grates) drawGrate(g, gr, time);
      drawTank(g, tank, time);
      // Each fighter's next kick, painted on the deck behind them.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const d = kickDir(f);
        const len = (f === player ? KICK_ABILITY : KICK_NPC) * mult();
        const ex = f.x + d.x * len, ey = f.y + d.y * len;
        const danger = bad({ x: ex, y: ey }) || bad({ x: f.x + d.x * len * 0.5, y: f.y + d.y * len * 0.5 });
        const c = danger ? ROUGE : f === player ? SIDE_PLAYER : SIDE_NPC;
        const a = Math.atan2(d.y, d.x);
        g.lineStyle(danger ? 3 : 2, c, danger ? 0.7 + 0.3 * Math.sin(time / 90) : 0.4);
        for (let s = 22; s < len - 8; s += 12) g.lineBetween(f.x + d.x * s, f.y + d.y * s, f.x + d.x * (s + 6), f.y + d.y * (s + 6));
        arrowHead(g, ex, ey, a, 10, c, danger ? 0.9 : 0.5);
      }
    },

    drawAir(g, time) {
      // The harness spring on each fighter's back, compressing as a kick goes off.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const d = kickDir(f);
        const live = kicks.find((k) => k.f === f);
        const squash = live ? 0.4 + 0.6 * (1 - live.left / live.total) : 1;
        const sx = f.x + d.x * 14, sy = f.y - 14 + d.y * 14;
        const ex = sx + d.x * 22 * squash, ey = sy + d.y * 22 * squash;
        coil(g, sx, sy, ex, ey, 4, 5, IRON_LIT, 0.95);
        g.fillStyle(IRON_DARK, 1); g.fillCircle(ex, ey, 4.5);
        g.fillStyle(f === player ? SIDE_PLAYER : SIDE_NPC, 1); g.fillCircle(ex, ey, 2.5);
      }
      for (const s of splashes) {
        const k = clamp((time - s.at) / 900, 0, 1);
        g.lineStyle(3, QUENCH_LIT, 1 - k); g.strokeEllipse(s.x, s.y, 30 + k * 90, 14 + k * 40);
        for (let i = 0; i < 10; i++) {
          const a = i * 0.63 + s.x;
          const r = 10 + k * 46;
          g.fillStyle(QUENCH_LIT, 1 - k); g.fillCircle(s.x + Math.cos(a) * r, s.y - Math.sin(k * Math.PI) * 40 + Math.sin(a) * r * 0.4, 3 * (1 - k) + 1);
        }
        g.fillStyle(STEAM, 0.5 * (1 - k)); g.fillCircle(s.x, s.y - 20 - k * 50, 18 + k * 30);
      }
      // Steam off the tank, always.
      for (let i = 0; i < 5; i++) {
        const ph = ((time / 1600) + i / 5) % 1;
        g.fillStyle(STEAM, 0.18 * (1 - ph)); g.fillCircle(tank.x - 40 + i * 20 + Math.sin(time / 500 + i) * 6, tank.y - 10 - ph * 70, 10 + ph * 16);
      }
    },
  };
}

/** The quench tank, sunk in the deck: a riveted iron rim, dark water that never stops steaming. */
function drawTank(g: G, t: Pit, time: number): void {
  g.fillStyle(IRON_DARK, 1); g.fillCircle(t.x, t.y + 3, t.r + 10);
  g.fillStyle(IRON, 1); g.fillCircle(t.x, t.y, t.r + 8);
  g.lineStyle(3, IRON_LIT, 0.5); g.beginPath(); g.arc(t.x, t.y, t.r + 6, Math.PI * 1.1, Math.PI * 1.7, false); g.strokePath();
  g.fillStyle(QUENCH_DEEP, 1); g.fillCircle(t.x, t.y, t.r);
  g.fillStyle(QUENCH, 1); g.fillCircle(t.x - 6, t.y - 6, t.r * 0.8);
  for (let i = 0; i < 3; i++) {
    const ph = ((time / 1400) + i / 3) % 1;
    g.lineStyle(1.5, QUENCH_LIT, 0.4 * (1 - ph)); g.strokeEllipse(t.x + (i - 1) * 18, t.y + (i % 2) * 10, 10 + ph * 50, 5 + ph * 24);
  }
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; rivet(g, t.x + Math.cos(a) * (t.r + 4), t.y + Math.sin(a) * (t.r + 4), RIVET, 1.8); }
  // A tongs rack on the rim.
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(t.x + t.r - 4, t.y - t.r + 10, t.x + t.r + 16, t.y - t.r - 12);
  g.lineBetween(t.x + t.r + 4, t.y - t.r + 14, t.x + t.r + 22, t.y - t.r - 6);
}

/** A furnace grate: iron bars over a bed of coals breathing orange to white. */
function drawGrate(g: G, gr: Pit, time: number): void {
  const breath = 0.5 + 0.5 * Math.sin(time / 380 + gr.x);
  glow(g, gr.x, gr.y, gr.r + 18, MOLTEN, 0.05 + 0.04 * breath, 3);
  g.fillStyle(MOLTEN_DARK, 1); g.fillCircle(gr.x, gr.y, gr.r);
  g.fillStyle(mixC(MOLTEN, MOLTEN_LIT, breath), 1); g.fillCircle(gr.x, gr.y, gr.r - 8);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4 + gr.y, r = (i % 3) * 10 + 6;
    g.fillStyle(i % 2 ? HEAT_WHITE : MOLTEN_LIT, 0.6 * breath + 0.2); g.fillCircle(gr.x + Math.cos(a) * r, gr.y + Math.sin(a) * r, 4);
  }
  g.lineStyle(5, IRON_DARK, 1);
  for (let i = -3; i <= 3; i++) {
    const off = i * 12, h = Math.sqrt(Math.max(0, gr.r * gr.r - off * off));
    g.lineBetween(gr.x + off, gr.y - h, gr.x + off, gr.y + h);
  }
  g.lineStyle(2, lit(IRON, 0.1), 1);
  for (let i = -3; i <= 3; i++) { const off = i * 12, h = Math.sqrt(Math.max(0, gr.r * gr.r - off * off)); g.lineBetween(gr.x + off - 1, gr.y - h, gr.x + off - 1, gr.y + h); }
  g.lineStyle(4, IRON, 1); g.strokeCircle(gr.x, gr.y, gr.r);
}

export const KICKBACK: GimmickDef = {
  id: ID,
  rules: 'Every cast kicks you back from your aim (see the arrow). Kicked into the quench you\'re dunked; into a wall, slammed. Put him by the water.',
  make,
};
