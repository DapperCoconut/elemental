import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { rivets, tripHammerFrame, tripHammerHead } from '../art';
import {
  CINDER_LIT, HEAT_ORANGE, HEAT_RED, HEAT_WHITE, HEAT_YELLOW, IRON, IRON_DARK, IRON_LIT, IRON_SHEEN, STEAM,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { hurt, onFloor } from './kit';

/**
 * In the Great Hammer's Time — Tamsin Cogwell, Keeper of the Great Trip-Hammer. Every smith on
 * Hammer Row strikes to the Great Hammer's beat; in the King's telling Tamsin keeps the cam greased
 * and the book of who struck out of time — a smith out of time is a smith singing, and singing is short.
 *
 * The trip-hammer stands at the head of the yard and beats steadily. Its beat is the rule:
 * - **On the beat** (the head landing, a short window round it) every blow lands *hard* — on either
 *   fighter. **Off the beat** blows land soft. Strike in time; keep moving when her blows come in time.
 * - **The fall**: every fourth beat (the downbeat, the big pip) the head comes down on hot scale and
 *   sprays it down three lanes at **whoever stands nearer the stithy** — locked one beat ahead.
 * - **Strike the cam** (the drum behind the helve) and the tappet slips: the next beat is a downbeat,
 *   aimed now. Do it while she stands nearer the stithy than you.
 *
 * Past half the Hammer runs in quick time: a faster beat, a tighter window, a fall every third beat.
 * The bot keeps you between her and the stithy before each fall and steps out of the lanes once
 * they are drawn.
 */

const ID = fallenId('forge', 'hammer-time');
const PERIOD = 1100;
const PERIOD_LATE = 820;
const WIN = 140;
const WIN_LATE = 105;
const IN_TIME = 1.6;
const OUT_TIME = 0.75;
const LANE_HALF = 22;
const LANE_SPREAD = 0.32;
const SPRAY_DMG = 12;
const CAM_COOLDOWN = 3000;
const S = 0.8;

interface Armed { angs: number[]; fireBeat: number; at: number; aimed: 'player' | 'npc' }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, top } = ctx;
  const FX = W / 2 + 80, FY = top + 104;
  const stithy: Pt = { x: FX, y: FY - 6 };
  const cam: Pt = { x: FX - 156 * S, y: FY - 50 * S };
  let started = false;
  let late = false;
  let lastBeat = 0;
  let nextBeat = 0;
  let beatN = 0;
  let downOffset = 0;
  let armed: Armed | null = null;
  let firedAt = -1e9;
  let firedAngs: number[] = [];
  let camAt = -1e9;
  let tapFloatAt = -1e9;
  let own = false;
  let now = 0;

  const period = () => (late ? PERIOD_LATE : PERIOD);
  const every = () => (late ? 3 : 4);
  const win = () => (late ? WIN_LATE : WIN);
  const inTime = (t: number) => started && Math.min(t - lastBeat, nextBeat - t) < win();
  const laneHit = (angs: number[], x: number, y: number) => angs.some((a) => {
    const dx = x - stithy.x, dy = y - stithy.y;
    const along = dx * Math.cos(a) + dy * Math.sin(a);
    return along > 0 && Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)) < LANE_HALF + 18;
  });

  function arm(fireBeat: number): void {
    const p = ctx.player, n = ctx.npc;
    const aim: Fighter = !alive(n) || dist(p.x, p.y, stithy.x, stithy.y) <= dist(n.x, n.y, stithy.x, stithy.y) ? p : n;
    const a = Math.atan2(aim.y - stithy.y, aim.x - stithy.x);
    armed = { angs: [a - LANE_SPREAD, a, a + LANE_SPREAD], fireBeat, at: now, aimed: aim === p ? 'player' : 'npc' };
    ctx.sfx('gear-turn');
  }

  function fire(): void {
    if (!armed) return;
    own = true;
    for (const f of [ctx.player, ctx.npc]) {
      if (alive(f) && laneHit(armed.angs, f.x, f.y)) {
        hurt(ctx, f, SPRAY_DMG);
        ctx.float(f.x, f.y - 50, 'SCALED', '#ffc23a');
      }
    }
    own = false;
    firedAt = now;
    firedAngs = armed.angs;
    downOffset = armed.fireBeat % every();
    armed = null;
    ctx.sfx('anvil');
  }

  function beat(): void {
    beatN++;
    if (armed && beatN >= armed.fireBeat) fire();
    else ctx.sfx('hammer-forge');
    if (!armed && (beatN + 1 - downOffset) % every() === 0) arm(beatN + 1);
  }

  const camTarget = ctx.target({
    x: cam.x, y: cam.y, r: 24,
    onStruck: (by) => {
      if (armed || now - camAt < CAM_COOLDOWN) return;
      camAt = now;
      arm(nextBeat - now >= 560 ? beatN + 1 : beatN + 2);
      ctx.float(cam.x, cam.y - 30, by === 'player' ? 'THE TAPPET SLIPS' : 'SHE TRIPS THE CAM', '#ffe2a8');
    },
  });

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      now = time;
      if (!started) { started = true; lastBeat = time; nextBeat = time + period(); }
      if (!late && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        late = true;
        ctx.banner('QUICK TIME', '#ffd890');
      }
      while (time >= nextBeat) {
        lastBeat = nextBeat;
        nextBeat += period();
        beat();
      }
    },

    playerTakenMult() { return inTime(now) ? IN_TIME : OUT_TIME; },
    npcTakenMult() { return inTime(now) ? IN_TIME : OUT_TIME; },

    onNpcHurt(amount) {
      if (own || amount < 2 || !inTime(now) || now - tapFloatAt < 500) return;
      tapFloatAt = now;
      ctx.float(ctx.npc.x, ctx.npc.y - 60, 'IN TIME', '#ffe2a8');
    },

    npcSeek() {
      const p = ctx.player, n = ctx.npc;
      if (armed) {
        if (!laneHit(armed.angs, n.x, n.y)) return onFloor(ctx, p.x + (n.x < p.x ? -150 : 150), p.y + 40);
        const a = armed.angs[1] + Math.PI / 2;
        const l = onFloor(ctx, n.x + Math.cos(a) * 150, n.y + Math.sin(a) * 150);
        const r = onFloor(ctx, n.x - Math.cos(a) * 150, n.y - Math.sin(a) * 150);
        return laneHit(armed.angs, l.x, l.y) ? r : l;
      }
      // Keep you nearer the stithy than her, so the next fall is yours.
      const dP = dist(p.x, p.y, stithy.x, stithy.y), dN = dist(n.x, n.y, stithy.x, stithy.y);
      if (dN < dP + 70) {
        const a = Math.atan2(p.y - stithy.y, p.x - stithy.x);
        return onFloor(ctx, p.x + Math.cos(a) * 150, p.y + Math.sin(a) * 150);
      }
      return onFloor(ctx, p.x + (n.x < p.x ? -120 : 120), p.y + 30);
    },

    drawGround(g, time) {
      // The hammer's bed: iron plates fanned out from the stithy, riveted at the seams.
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * 0.12 + (i / 8) * Math.PI * 0.76;
        const x2 = stithy.x + Math.cos(a) * 330, y2 = stithy.y + Math.sin(a) * 300;
        g.lineStyle(3, IRON_DARK, 0.5); g.lineBetween(stithy.x, stithy.y + 10, x2, y2);
        rivets(g, stithy.x + Math.cos(a) * 60, stithy.y + Math.sin(a) * 56, x2, y2, 6, 1.4, IRON);
      }
      for (const r of [90, 190, 300]) {
        g.lineStyle(2, CINDER_LIT, 0.35);
        g.beginPath(); g.arc(stithy.x, stithy.y, r, Math.PI * 0.1, Math.PI * 0.9); g.strokePath();
      }
      // The beat running out through the plates.
      const since = time - lastBeat;
      if (since < 260) {
        const k = since / 260;
        g.lineStyle(3, inTime(time) ? HEAT_YELLOW : STEAM, 0.5 * (1 - k));
        g.beginPath(); g.arc(stithy.x, stithy.y, 40 + k * 300, Math.PI * 0.05, Math.PI * 0.95); g.strokePath();
      }
      // The fall's lanes, once locked: scale-spray paths heating toward the downbeat.
      if (armed) {
        const fireT = lastBeat + (armed.fireBeat - beatN) * period();
        const k = clamp((time - armed.at) / Math.max(1, fireT - armed.at), 0, 1);
        for (const a of armed.angs) {
          const x2 = stithy.x + Math.cos(a) * 1000, y2 = stithy.y + Math.sin(a) * 1000;
          g.lineStyle(LANE_HALF * 2, HEAT_RED, 0.1 + k * 0.2); g.lineBetween(stithy.x, stithy.y, x2, y2);
          g.lineStyle(2, HEAT_YELLOW, 0.4 + k * 0.5);
          for (const s of [-1, 1]) {
            const ox = -Math.sin(a) * LANE_HALF * s, oy = Math.cos(a) * LANE_HALF * s;
            g.lineBetween(stithy.x + ox, stithy.y + oy, x2 + ox, y2 + oy);
          }
          for (let d = 60; d < 900; d += 70) {
            g.fillStyle(HEAT_ORANGE, 0.3 + k * 0.4); g.fillCircle(stithy.x + Math.cos(a) * d, stithy.y + Math.sin(a) * d, 2.5);
          }
        }
      }
    },

    drawAir(g, time) {
      // The Great Hammer: frame, the cam drum's tappets turning a quarter each beat, the helve and head.
      tripHammerFrame(g, FX, FY, S);
      const phase = clamp((time - lastBeat) / Math.max(1, nextBeat - lastBeat), 0, 1);
      const rot = (beatN + phase) * (Math.PI / 2);
      for (let i = 0; i < 4; i++) {
        const a = rot + i * (Math.PI / 2);
        const tx = cam.x + Math.cos(a) * 24 * S, ty = cam.y + Math.sin(a) * 24 * S;
        g.fillStyle(IRON_LIT, 1); g.fillRect(tx - 4, ty - 4, 8, 8);
        g.fillStyle(IRON_SHEEN, 0.8); g.fillRect(tx - 4, ty - 4, 8, 2);
      }
      if (now - camAt < 500) { g.lineStyle(3, HEAT_YELLOW, 1 - (now - camAt) / 500); g.strokeCircle(cam.x, cam.y, 30); }
      const lift = phase < 0.78 ? phase / 0.78 : 1 - (phase - 0.78) / 0.22;
      tripHammerHead(g, FX, FY, S, lift);
      // The strike: sparks off the stithy, a puff from the engine's pipe.
      const since = time - lastBeat;
      if (since < 220) {
        const k = since / 220;
        for (let i = 0; i < 10; i++) {
          const a = Math.PI + (i / 9) * Math.PI;
          const r = 8 + k * 40;
          g.fillStyle(i % 2 ? HEAT_YELLOW : HEAT_WHITE, 1 - k);
          g.fillCircle(stithy.x + Math.cos(a) * r, stithy.y - 40 + Math.sin(a) * r * 0.6, 1.8);
        }
        glow(g, stithy.x, stithy.y - 40, 30, HEAT_ORANGE, 0.08 * (1 - k), 3);
      }
      const pipeX = cam.x - 30 * S, pipeY = FY - 150 * S;
      const pk = (time - lastBeat) / period();
      for (let i = 0; i < 3; i++) {
        const q = clamp(pk - i * 0.1, 0, 1);
        g.fillStyle(STEAM, 0.3 * (1 - q)); g.fillCircle(pipeX + q * 14, pipeY - q * 40 - i * 6, 5 + q * 10);
      }
      // The fall's spray: scale flying out down the three lanes.
      if (time - firedAt < 320) {
        const k = (time - firedAt) / 320;
        for (const a of firedAngs) {
          for (let i = 0; i < 9; i++) {
            const d = k * 900 - i * 40;
            if (d < 20) continue;
            g.fillStyle(i % 3 ? HEAT_ORANGE : HEAT_WHITE, 1 - k * 0.6);
            g.fillCircle(stithy.x + Math.cos(a) * d + Math.sin(i * 3.1) * 6, stithy.y + Math.sin(a) * d + Math.cos(i * 2.3) * 6, 3);
          }
        }
      }
    },

    drawHud(g, time) {
      // The count: a pip per beat, the downbeat pip large (red once the fall is aimed), and the window.
      const n = every();
      const x0 = W / 2 - (n * 26) / 2, y = top + 14;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x0 - 10, y - 10, n * 26 + 20, 30, 7);
      const cur = (beatN - downOffset + n * 100) % n;
      for (let i = 0; i < n; i++) {
        const x = x0 + i * 26 + 13;
        const down = i === 0;
        const isCur = i === cur;
        const c = down && armed ? HEAT_RED : isCur ? HEAT_YELLOW : IRON;
        g.fillStyle(c, 1); g.fillCircle(x, y + 5, down ? 8 : 5);
        g.lineStyle(1.5, IRON_DARK, 1); g.strokeCircle(x, y + 5, down ? 8 : 5);
      }
      // A flash across the strip while the window is open.
      if (inTime(time)) { g.lineStyle(2, HEAT_WHITE, 0.9); g.strokeRoundedRect(x0 - 10, y - 10, n * 26 + 20, 30, 7); }
      const phase = clamp((time - lastBeat) / Math.max(1, nextBeat - lastBeat), 0, 1);
      g.fillStyle(IRON_DARK, 1); g.fillRect(x0, y + 15, n * 26, 3);
      g.fillStyle(HEAT_ORANGE, 1); g.fillRect(x0, y + 15, n * 26 * phase, 3);
    },

    destroy() { camTarget.remove(); },
  };
}

/** In the Great Hammer's Time: blows on the beat land hard, off it soft; the fall sprays the nearer fighter. */
export const FALLEN_HAMMER_TIME: GimmickDef = {
  id: ID,
  rules: 'The Great Hammer beats time: blows on its beat land hard, off it soft, both ways. Its fall sprays the nearer fighter. Strike the cam to drop it.',
  make,
};
