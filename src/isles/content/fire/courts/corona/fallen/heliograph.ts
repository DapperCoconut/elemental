import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, BRASS_DARK, BRASS_LIT, GLASS_CRACK, GLASS_DEEP, GLASS_GLINT, IRON, PLASMA_LIT, SUN, SUN_CORE, SUN_DEEP, SUN_RIM,
} from '../palette';
import { awayFrom, inPlay, segDist } from './geom';

/**
 * Heliograph — Signaller Wren's fight (the informer).
 *
 * In the King's telling, Wren is the court's signaller: a brass heliograph on a tripod that
 * flashes coded messages up to the palace, and the palace answers with a **sunlance** — the
 * captive sun's light dropped on whatever address she sent. She marks where you stand; a
 * reticle sits on the glass with a ring of code-pips that light one flash at a time, and when
 * the message is complete the lance falls there. Up to three messages are in flight at once.
 *
 * The exploit is the tripod itself. **Strike the heliograph** and the message garbles: every
 * reticle with time left on it re-addresses to *Wren* and follows her until it locks. Then she
 * has to fold the tripod and carry it to another corner, and it can't be garbled again until
 * it stands.
 *
 * Halfway the code changes: the lance no longer drops from the sky — it is fired *from the
 * mirror* through the address and on to the wall, a lane you read from the tripod outward.
 */

const ID = fallenId('corona', 'heliograph');
const LANCE_R = 62;
const LANE_HALF = 18;
const PIP_MS = 400;
const MARK_EVERY = 1700;
const LANCE_DMG = 24;
const LANE_DMG = 22;
const CARRY_MS = 1600;

interface Mark { x: number; y: number; code: number[]; startAt: number; strikeAt: number; garbled: boolean; root: Pt }
interface Scorch { x: number; y: number; born: number; root: Pt | null }

export const HELIOGRAPH: GimmickDef = {
  id: ID,
  rules: 'Wren marks you; the sunlance falls when the code-pips fill. Strike her heliograph to readdress every mark to her.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    const sites: Pt[] = [
      { x: 140, y: top + 96 }, { x: W - 140, y: top + 96 }, { x: W - 140, y: H - 70 }, { x: 140, y: H - 70 },
    ];
    let site = 0;
    /** The heliograph's mirror sits this far above its feet. */
    const mirrorAt = (i: number): Pt => ({ x: sites[i].x, y: sites[i].y - 38 });

    const marks: Mark[] = [];
    const scorches: Scorch[] = [];
    let nextMarkAt = ctx.scene.time.now + 1800;
    let sent = 0;
    let carrying = false;
    let hopAt = 0;
    let pendingGarble = false;
    let half = false;
    let lastPipAt = -9999;

    const tripod = ctx.target({
      x: sites[0].x, y: sites[0].y - 20, r: 24,
      onStruck(by) {
        if (by !== 'player' || carrying) return;
        const now = ctx.scene.time.now;
        let any = false;
        for (const m of marks) if (m.strikeAt - now > 650) { m.garbled = true; any = true; }
        if (!any) pendingGarble = true;
        carrying = true;
        hopAt = now + CARRY_MS;
        ctx.banner('GARBLED — THE ADDRESS IS WREN', '#ffd54a');
        ctx.sfx('glitch');
        ctx.flash(tripod.x, tripod.y, SUN_CORE);
      },
    });

    const laneEnd = (root: Pt, to: Pt): Pt => {
      const dx = to.x - root.x, dy = to.y - root.y;
      const len = Math.hypot(dx, dy) || 1;
      return { x: root.x + (dx / len) * 1400, y: root.y + (dy / len) * 1400 };
    };

    const sendMark = (time: number): void => {
      const n = [3, 4, 5, 4][sent % 4];
      sent++;
      const code: number[] = [];
      for (let i = 0; i < n; i++) code.push(ctx.rng() < 0.45 ? 1 : 0);
      const toWren = pendingGarble;
      pendingGarble = false;
      const f = toWren ? ctx.npc : ctx.player;
      marks.push({
        x: f.x, y: f.y, code, startAt: time, strikeAt: time + n * PIP_MS, garbled: toWren,
        root: mirrorAt(site),
      });
      ctx.sfx('trap-set');
    };

    const strike = (m: Mark, time: number): void => {
      ctx.sfx(half ? 'beam-fire' : 'light-beam');
      if (!half) {
        for (const f of [ctx.player, ctx.npc]) {
          if (!inPlay(f) || ctx.isAirborne(f)) continue;
          if (Math.hypot(f.x - m.x, f.y - m.y) < LANCE_R + 16) {
            ctx.hit(f, LANCE_DMG, f.x, f.y);
            ctx.sfx('status-burn');
          }
        }
        scorches.push({ x: m.x, y: m.y, born: time, root: null });
      } else {
        const end = laneEnd(m.root, m);
        for (const f of [ctx.player, ctx.npc]) {
          if (!inPlay(f) || ctx.isAirborne(f)) continue;
          if (segDist(f.x, f.y, m.root, end) < LANE_HALF + 14) {
            ctx.hit(f, LANE_DMG, f.x, f.y);
            ctx.sfx('status-burn');
          }
        }
        scorches.push({ x: end.x, y: end.y, born: time, root: m.root });
      }
    };

    return {
      update(time, dt) {
        if (!half && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          half = true;
          ctx.banner('THE CODE CHANGES — THE LANCE FIRES FROM THE MIRROR', '#ffe2a8');
          ctx.sfx('boss-phase');
        }
        if (carrying && time >= hopAt) {
          carrying = false;
          // She carries it to the corner farthest from you.
          let best = site, bestD = -1;
          for (let i = 0; i < sites.length; i++) {
            if (i === site) continue;
            const d = Math.hypot(sites[i].x - ctx.player.x, sites[i].y - ctx.player.y);
            if (d > bestD) { bestD = d; best = i; }
          }
          site = best;
          tripod.moveTo(sites[site].x, sites[site].y - 20);
          ctx.sfx('clang');
        }
        if (time >= nextMarkAt && marks.length < 3 && !carrying) {
          sendMark(time);
          nextMarkAt = time + MARK_EVERY;
        }
        for (let i = marks.length - 1; i >= 0; i--) {
          const m = marks[i];
          const lit = Math.floor((time - m.startAt) / PIP_MS);
          if (lit >= 0 && Math.floor((time - dt * 1000 - m.startAt) / PIP_MS) < lit) {
            lastPipAt = time;
            ctx.sfx('clock-tick');
          }
          // A garbled address chases Wren until the last flashes lock it.
          if (m.garbled && m.strikeAt - time > 450) {
            const k = Math.min(1, dt * 6);
            m.x += (ctx.npc.x - m.x) * k;
            m.y += (ctx.npc.y - m.y) * k;
          }
          if (time >= m.strikeAt) {
            strike(m, time);
            marks.splice(i, 1);
          }
        }
        for (let i = scorches.length - 1; i >= 0; i--) if (time - scorches[i].born > 4200) scorches.splice(i, 1);
      },

      npcSeek() {
        const now = ctx.scene.time.now;
        const me = { x: ctx.npc.x, y: ctx.npc.y };
        for (const m of marks) {
          if (m.strikeAt - now > 1500) continue;
          if (!half && Math.hypot(me.x - m.x, me.y - m.y) < LANCE_R + 50) return awayFrom(me, m, 140);
          if (half) {
            const end = laneEnd(m.root, m);
            if (segDist(me.x, me.y, m.root, end) < LANE_HALF + 50) {
              const dx = end.x - m.root.x, dy = end.y - m.root.y;
              const len = Math.hypot(dx, dy) || 1;
              let nx = -dy / len, ny = dx / len;
              if ((me.x - m.root.x) * nx + (me.y - m.root.y) * ny < 0) { nx = -nx; ny = -ny; }
              return { x: me.x + nx * 120, y: me.y + ny * 120 };
            }
          }
        }
        return null;
      },

      drawGround(g, time) {
        // Old strikes: fused glass with a crazed rim, cooling from gold to bottle-dark.
        for (const s of scorches) {
          const k = 1 - (time - s.born) / 4200;
          if (s.root) {
            g.lineStyle(LANE_HALF * 2, GLASS_DEEP, 0.4 * k); g.lineBetween(s.root.x, s.root.y, s.x, s.y);
            g.lineStyle(3, SUN_RIM, 0.5 * k * k); g.lineBetween(s.root.x, s.root.y, s.x, s.y);
            continue;
          }
          g.fillStyle(GLASS_DEEP, 0.45 * k); g.fillCircle(s.x, s.y, LANCE_R * 0.8);
          g.fillStyle(SUN_DEEP, 0.4 * k * k); g.fillCircle(s.x, s.y, LANCE_R * 0.45);
          g.lineStyle(1.5, GLASS_CRACK, 0.7 * k);
          for (let c = 0; c < 9; c++) {
            const a = c * 0.7 + s.x * 0.01;
            const r0 = LANCE_R * 0.3, r1 = LANCE_R * (0.75 + ((c * 37) % 5) * 0.05);
            g.lineBetween(s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0, s.x + Math.cos(a + 0.12) * r1, s.y + Math.sin(a + 0.12) * r1);
          }
          g.fillStyle(GLASS_GLINT, 0.5 * k); g.fillCircle(s.x - 10, s.y - 8, 3);
        }
        // Reticles: the address the palace will answer.
        for (const m of marks) {
          const p = Math.min(1, (time - m.startAt) / (m.strikeAt - m.startAt));
          const hot = m.garbled ? PLASMA_LIT : SUN;
          if (half) {
            const end = laneEnd(m.root, m);
            g.lineStyle(LANE_HALF * 2, hot, 0.05 + p * 0.16); g.lineBetween(m.root.x, m.root.y, end.x, end.y);
            // A dashed sight-line, the dashes marching outward like a sent signal.
            const dx = end.x - m.root.x, dy = end.y - m.root.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len, uy = dy / len;
            g.lineStyle(2, SUN_CORE, 0.35 + p * 0.5);
            for (let d = (time / 6) % 28; d < 1100; d += 28) {
              g.lineBetween(m.root.x + ux * d, m.root.y + uy * d, m.root.x + ux * (d + 12), m.root.y + uy * (d + 12));
            }
          }
          const r = half ? 30 : LANCE_R;
          g.fillStyle(hot, 0.06 + p * 0.2); g.fillCircle(m.x, m.y, r);
          g.lineStyle(2, hot, 0.5 + p * 0.4); g.strokeCircle(m.x, m.y, r);
          g.lineStyle(1, SUN_CORE, 0.6); g.strokeCircle(m.x, m.y, r * (1 - p) + 4);
          // Four sight ticks and a pinhole.
          for (let q = 0; q < 4; q++) {
            const a = q * Math.PI / 2 + Math.PI / 4;
            g.lineBetween(m.x + Math.cos(a) * (r - 10), m.y + Math.sin(a) * (r - 10), m.x + Math.cos(a) * (r + 6), m.y + Math.sin(a) * (r + 6));
          }
          g.fillStyle(SUN_CORE, 0.9); g.fillCircle(m.x, m.y, 2.5);
          // The code-pips round the ring: dots and dashes, lit as they are flashed.
          const lit = Math.floor((time - m.startAt) / PIP_MS);
          const n = m.code.length;
          for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.32;
            const px = m.x + Math.cos(a) * (r + 14), py = m.y + Math.sin(a) * (r + 14);
            g.fillStyle(0x000000, 0.55); g.fillCircle(px, py, 6);
            g.fillStyle(i < lit ? SUN_CORE : BRASS_DARK, 1);
            if (m.code[i]) g.fillRect(px - 4.5, py - 1.5, 9, 3); else g.fillCircle(px, py, 2.4);
          }
        }
        // The tripod's three feet on the glass.
        const s = sites[site];
        g.fillStyle(0x000000, 0.3); g.fillEllipse(s.x, s.y + 2, 54, 14);
        if (!carrying) for (const fx of [-18, 0, 18]) { g.fillStyle(IRON, 1); g.fillCircle(s.x + fx, s.y + (fx === 0 ? -5 : 2), 3); }
      },

      drawAir(g, time) {
        const s = sites[site];
        const mp = mirrorAt(site);
        if (carrying) {
          // Folded for carrying: legs strapped together, mirror face-down on top.
          const k = (time % 400) / 400;
          g.lineStyle(4, BRASS_DARK, 0.8); g.lineBetween(s.x - 22, s.y - 6, s.x + 22, s.y - 14);
          g.lineStyle(2, BRASS, 0.8); g.lineBetween(s.x - 22, s.y - 10, s.x + 22, s.y - 18);
          g.fillStyle(IRON, 0.9); g.fillEllipse(s.x, s.y - 20, 26, 9);
          g.lineStyle(2, SUN_RIM, 0.5 + k * 0.4); g.strokeEllipse(s.x, s.y - 20, 26, 9);
        } else {
          // Three brass legs, a clamp, the sighting vane and the mirror in its fork.
          g.lineStyle(3, BRASS_DARK, 1);
          g.lineBetween(s.x - 18, s.y + 2, mp.x, mp.y + 12);
          g.lineBetween(s.x + 18, s.y + 2, mp.x, mp.y + 12);
          g.lineBetween(s.x, s.y - 5, mp.x, mp.y + 12);
          g.fillStyle(BRASS, 1); g.fillRect(mp.x - 5, mp.y + 8, 10, 6);
          g.lineStyle(2, BRASS, 1); g.strokeCircle(mp.x, mp.y, 14);
          g.lineBetween(mp.x - 14, mp.y, mp.x - 14, mp.y + 10); g.lineBetween(mp.x + 14, mp.y, mp.x + 14, mp.y + 10);
          const flashing = time - lastPipAt < 130;
          g.fillStyle(flashing ? SUN_CORE : GLASS_DEEP, 1); g.fillCircle(mp.x, mp.y, 11);
          g.fillStyle(GLASS_GLINT, flashing ? 1 : 0.5); g.fillCircle(mp.x - 4, mp.y - 4, 3);
          // Shutter slats: open on a flash, shut between.
          if (!flashing) {
            g.fillStyle(BRASS_DARK, 0.9);
            for (let sl = -1; sl <= 1; sl++) g.fillRect(mp.x - 10, mp.y + sl * 6 - 1.5, 20, 3);
          }
          // Sighting vane: a pin and a ring, pointed at the palace.
          g.lineStyle(1.5, BRASS_LIT, 1); g.lineBetween(mp.x + 14, mp.y - 4, mp.x + 24, mp.y - 16);
          g.strokeCircle(mp.x + 25, mp.y - 18, 3);
          if (flashing) {
            // The flash leaves for the palace: a ray to the top of the room.
            g.lineStyle(3, SUN_CORE, 0.7); g.lineBetween(mp.x, mp.y, mp.x + (W / 2 - mp.x) * 0.35, top);
            g.fillStyle(SUN, 0.25); g.fillCircle(mp.x, mp.y, 24);
          }
        }
        // The lance itself, for a quarter-second after it falls.
        for (const sc of scorches) {
          const age = time - sc.born;
          if (age > 260) continue;
          const k = 1 - age / 260;
          if (sc.root) {
            g.lineStyle(LANE_HALF * 2 + 8, SUN, 0.45 * k); g.lineBetween(sc.root.x, sc.root.y, sc.x, sc.y);
            g.lineStyle(6, SUN_CORE, k); g.lineBetween(sc.root.x, sc.root.y, sc.x, sc.y);
          } else {
            g.fillStyle(SUN, 0.35 * k);
            g.fillPoints([{ x: sc.x - 10, y: top }, { x: sc.x + 10, y: top }, { x: sc.x + LANCE_R, y: sc.y }, { x: sc.x - LANCE_R, y: sc.y }], true);
            g.fillStyle(SUN_CORE, 0.8 * k); g.fillRect(sc.x - 5, top, 10, sc.y - top);
            g.fillStyle(SUN_CORE, 0.6 * k); g.fillCircle(sc.x, sc.y, LANCE_R * 0.7);
          }
        }
      },

      drawHud(g, time) {
        // The signal tape: one brass plate per message in flight, its code lit as it is flashed.
        const x0 = W / 2 - 150;
        let y = 104;
        for (const m of marks) {
          const lit = Math.floor((time - m.startAt) / PIP_MS);
          g.fillStyle(0x000000, 0.55); g.fillRect(x0 - 4, y - 4, 128, 16);
          g.fillStyle(m.garbled ? PLASMA_LIT : BRASS_DARK, 1); g.fillRect(x0 - 2, y - 2, 6, 12);
          for (let i = 0; i < m.code.length; i++) {
            g.fillStyle(i < lit ? SUN_CORE : BRASS_DARK, 1);
            const px = x0 + 14 + i * 21;
            if (m.code[i]) g.fillRect(px, y + 2, 14, 4); else g.fillCircle(px + 7, y + 4, 3);
          }
          y += 18;
        }
        // The garble lamp: lit while the tripod stands and can be struck.
        const lx = W / 2 + 140, ly = 112;
        g.fillStyle(0x000000, 0.55); g.fillCircle(lx, ly, 11);
        g.fillStyle(carrying ? IRON : SUN, 1); g.fillCircle(lx, ly, 7);
        g.lineStyle(2, BRASS, 1); g.strokeCircle(lx, ly, 11);
        if (!carrying) { g.fillStyle(SUN_CORE, 0.8); g.fillCircle(lx - 2, ly - 2, 2); }
      },

      destroy() {
        tripod.remove();
      },
    };
  },
};
