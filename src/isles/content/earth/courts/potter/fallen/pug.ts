import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, mixC, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  IRON, IRON_LIT, MARL, MARL_DARK, MARL_DEEP, MARL_LIT, SLIP, SLIP_DARK, SLIP_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT,
} from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * Pugged — Ebba Gorrie, who worked the pug mills after the donkeys were taken.
 *
 * The court's pug mill stands idle: the Regent's men took the donkey that turned it. In the
 * King's telling Ebba is the one who sold them the donkey — and was given the mill, and a
 * crank, and a wage for turning it herself.
 *
 * Here the mills lie on their sides in the yard wall and ride a rail up and down it, lining up on
 * you. The auger turns (the lane is scored on the floor), then a log of pugged clay pushes out
 * across the yard, slower than a walk. Its nose shoves whoever stands in front of it; pinned
 * against the far wall, they are crushed. Its flank is a wall to bodies and shots. Then the wire
 * cuts it off at the mouth and it lies there as cover until it slumps.
 *
 * Strike a mill's crank while it feeds and it surges — far faster than anyone walks — so the
 * clever player waits for Ebba to step into the lane ahead of the nose. Halfway down, the mill in
 * the east wall wakes as well. The bot steps out of a scored lane, and runs to feed a crank when
 * you are standing in front of a nose.
 */

const ID = fallenId('potter', 'pug');
const HALF = 28;
const BODY_R = 20;
const FEED = 165;
const SURGE = 390;
const AIM_MS = 1500;
const CUT_MS = 380;
const LOG_MS = 6500;
const CRUSH = 24;
const CRANK_R = 28;

type Phase = 'idle' | 'aim' | 'feed' | 'cut';
interface Mill { dir: 1 | -1; mouth: number; y: number; phase: Phase; t0: number; nose: number; surge: boolean; awake: boolean; nextAt: number; crushed: Set<Fighter>; tgt: StrikeTarget | null }
interface Log { x0: number; x1: number; y: number; born: number; dieAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const mkMill = (dir: 1 | -1, awake: boolean): Mill => ({
    dir, mouth: dir > 0 ? 34 : W - 34, y: (top + H) / 2, phase: 'idle', t0: 0, nose: 0, surge: false, awake,
    nextAt: 0, crushed: new Set(), tgt: null,
  });
  const mills = [mkMill(1, true), mkMill(-1, false)];
  const logs: Log[] = [];
  let started = false;
  let half = false;
  let now = 0;

  for (const m of mills) {
    m.tgt = ctx.target({
      x: m.mouth - m.dir * 6, y: m.y - 30, r: CRANK_R,
      onStruck: () => {
        if (m.phase !== 'feed' || m.surge) return;
        m.surge = true;
        ctx.float(m.mouth + m.dir * 60, m.y - 50, 'FED HARD', '#ffd27a');
        ctx.sfx('gear-turn');
      },
    });
  }

  const farX = (m: Mill) => (m.dir > 0 ? W - 40 : 40);
  const lo = (m: Mill) => Math.min(m.mouth, m.nose);
  const hi = (m: Mill) => Math.max(m.mouth, m.nose);

  /** Keep a body out of a clay log: shove it ahead of a feeding nose, or out past the nearer flank. */
  function shove(f: Fighter, x0: number, x1: number, y: number, m: Mill | null): void {
    if (!alive(f) || ctx.isAirborne(f)) return;
    if (f.y < y - HALF - BODY_R || f.y > y + HALF + BODY_R || f.x < x0 - BODY_R || f.x > x1 + BODY_R) return;
    if (m) {
      const along = m.dir * (f.x - m.nose);
      if (along > -14) {
        const want = m.nose + m.dir * (BODY_R + 2);
        const lim = m.dir > 0 ? W - 44 : 44;
        if (m.dir * (want - lim) > 0) {
          if (!m.crushed.has(f)) {
            m.crushed.add(f);
            ctx.hit(f, CRUSH, f.x, f.y);
            ctx.stun(f, 700);
            ctx.flash(f.x, f.y, MARL_LIT);
            ctx.float(f.x, f.y - 50, 'PUGGED', '#e6c9a8');
            ctx.sfx('stone-slam');
          }
          cut(m);
          return;
        }
        ctx.nudge(f, want - f.x, 0);
        return;
      }
    }
    const dy = f.y < y ? y - HALF - BODY_R - f.y : y + HALF + BODY_R - f.y;
    ctx.nudge(f, 0, dy);
  }

  function cut(m: Mill): void {
    if (m.phase !== 'feed') return;
    m.phase = 'cut';
    m.t0 = now;
    ctx.sfx('slash');
  }

  function blockShots(x0: number, x1: number, y: number): void {
    for (let x = x0 + 14; x < x1; x += 34) for (const s of ctx.shotsNear(x, y, HALF + 4)) s.block();
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      now = time;
      if (!started) { started = true; mills[0].nextAt = time + 1600; }
      if (!half && npc.hp < npc.maxHp * 0.5) {
        half = true;
        mills[1].awake = true;
        mills[1].nextAt = time + 2200;
        ctx.banner('The east mill wakes. Ebba feeds both.', '#ffd27a');
        ctx.sfx('engine');
      }
      for (const m of mills) {
        if (!m.awake) continue;
        if (m.phase === 'idle') {
          // Ride the rail toward the player's line.
          const want = clamp(player.y, top + 50, H - 50);
          m.y += clamp(want - m.y, -150 * dt, 150 * dt);
          if (time >= m.nextAt) { m.phase = 'aim'; m.t0 = time; m.crushed.clear(); ctx.sfx('gear-turn'); }
        } else if (m.phase === 'aim') {
          if (time - m.t0 >= AIM_MS) { m.phase = 'feed'; m.t0 = time; m.nose = m.mouth; m.surge = false; ctx.sfx('engine'); }
        } else if (m.phase === 'feed') {
          m.nose += m.dir * (m.surge ? SURGE : FEED) * dt;
          if (m.dir * (m.nose - farX(m)) >= 0) { m.nose = farX(m); cut(m); }
          for (const f of [player, npc]) shove(f, lo(m), hi(m), m.y, m);
          blockShots(lo(m), hi(m), m.y);
        } else if (time - m.t0 >= CUT_MS) {
          logs.push({ x0: lo(m), x1: hi(m), y: m.y, born: time, dieAt: time + LOG_MS });
          m.phase = 'idle';
          m.nextAt = time + (half ? 2600 : 1500);
        }
        m.tgt?.moveTo(m.mouth - m.dir * 6, m.y - 30);
      }
      for (let i = logs.length - 1; i >= 0; i--) {
        const l = logs[i];
        if (time > l.dieAt) { logs.splice(i, 1); continue; }
        if (l.dieAt - time < 700) continue; // slumping: no longer a wall
        for (const f of [player, npc]) shove(f, l.x0, l.x1, l.y, null);
        blockShots(l.x0, l.x1, l.y);
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      for (const m of mills) {
        if (m.phase !== 'aim' && m.phase !== 'feed') continue;
        const inLane = Math.abs(npc.y - m.y) < HALF + BODY_R + 30;
        const ahead = m.phase === 'aim' || m.dir * (npc.x - m.nose) > -20;
        if (inLane && ahead) {
          let s = npc.y < m.y ? -1 : 1;
          if (m.y + s * (HALF + 90) < top + 40 || m.y + s * (HALF + 90) > H - 40) s = -s;
          return { x: npc.x, y: m.y + s * (HALF + 90) };
        }
      }
      for (const m of mills) {
        if (m.phase !== 'feed' || m.surge) continue;
        if (Math.abs(player.y - m.y) < HALF + BODY_R && m.dir * (player.x - m.nose) > 0) {
          const s = npc.y < m.y ? -1 : 1;
          return { x: m.mouth + m.dir * 110, y: clamp(m.y + s * (HALF + 60), top + 40, H - 40) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      for (const m of mills) {
        if (m.phase !== 'aim') continue;
        // The lane scored into the floor, chevrons running out from the mouth.
        const k = clamp((time - m.t0) / AIM_MS, 0, 1);
        const x0 = Math.min(m.mouth, farX(m)), x1 = Math.max(m.mouth, farX(m));
        g.fillStyle(MARL_DEEP, 0.1 + k * 0.14); g.fillRect(x0, m.y - HALF, x1 - x0, HALF * 2);
        g.lineStyle(2, MARL_DEEP, 0.5 + k * 0.4); g.lineBetween(x0, m.y - HALF, x1, m.y - HALF); g.lineBetween(x0, m.y + HALF, x1, m.y + HALF);
        g.lineStyle(1, MARL_LIT, 0.4 + k * 0.4); g.lineBetween(x0, m.y - HALF + 2, x1, m.y - HALF + 2); g.lineBetween(x0, m.y + HALF + 2, x1, m.y + HALF + 2);
        for (let i = 0; i < 12; i++) {
          const ph = ((time / 900) + i / 12) % 1;
          const cx = m.mouth + m.dir * ph * Math.abs(farX(m) - m.mouth);
          g.lineStyle(3, mixC(MARL_DARK, 0xffd27a, k), 0.25 + k * 0.5);
          g.lineBetween(cx - m.dir * 10, m.y - 12, cx, m.y); g.lineBetween(cx, m.y, cx - m.dir * 10, m.y + 12);
        }
      }
      for (const l of logs) {
        const slump = clamp((l.dieAt - now) / 700, 0, 1);
        drawPug(g, l.x0, l.x1, l.y, slump, 0, 0, 0, l.born);
      }
      for (const m of mills) {
        if (m.phase !== 'feed' && m.phase !== 'cut') continue;
        drawPug(g, lo(m), hi(m), m.y, 1, m.dir, m.phase === 'cut' ? clamp((time - m.t0) / CUT_MS, 0, 1) : 0, m.mouth + m.dir * 4, m.t0);
      }
    },

    drawAir(g, time) {
      for (const m of mills) drawMill(g, m, time);
    },

    destroy() { for (const m of mills) m.tgt?.remove(); },
  };
}

/**
 * A log of pugged clay lying across the yard: a shadow, the round body, a lit back, the auger's
 * spiral lamination showing through the skin. `nose` (±1) rounds the leading end; flat cut ends
 * carry the wire's striations; `slump` 1→0 flattens it into a puddle as it falls.
 */
function drawPug(g: G, x0: number, x1: number, y: number, slump: number, nose: number, wire: number, wireX: number, seed: number): void {
  const h = HALF * (0.35 + 0.65 * slump);
  const len = x1 - x0;
  if (len < 4) return;
  g.fillStyle(0x000000, 0.22); g.fillRoundedRect(x0 + 4, y - h + 8, len, h * 2, Math.min(h, 14));
  g.fillStyle(MARL_DARK, 1); g.fillRoundedRect(x0, y - h, len, h * 2, Math.min(h, 12));
  g.fillStyle(MARL, 1); g.fillRoundedRect(x0, y - h, len, h * 1.6, Math.min(h, 12));
  g.fillStyle(MARL_LIT, 0.75); g.fillRect(x0 + 6, y - h + 4, len - 12, h * 0.35);
  // Spiral lamination: arcs every hand-span, the way the auger leaves it.
  g.lineStyle(1, MARL_DEEP, 0.45 * slump);
  for (let x = x0 + 14 + (seed % 9); x < x1 - 10; x += 22) {
    g.beginPath(); g.arc(x, y, h * 0.85, -Math.PI * 0.4, Math.PI * 0.4, false); g.strokePath();
  }
  // Wet skin: a few beads of slip.
  for (let x = x0 + 30; x < x1 - 20; x += 57) { g.fillStyle(SLIP_LIT, 0.5 * slump); g.fillEllipse(x, y - h * 0.4, 6, 3); }
  // Ends.
  for (const [ex, round] of [[x0, nose < 0], [x1, nose > 0]] as [number, boolean][]) {
    if (round) {
      g.fillStyle(MARL, 1); g.fillEllipse(ex, y - h * 0.15, 18, h * 1.7);
      g.fillStyle(MARL_LIT, 0.6); g.fillEllipse(ex + (ex === x1 ? 3 : -3), y - h * 0.5, 7, h * 0.6);
    } else {
      g.fillStyle(SLIP, 1); g.fillRect(ex - 2, y - h, 4, h * 2);
      g.lineStyle(0.6, SLIP_DARK, 0.8);
      for (let k = -2; k <= 2; k++) g.lineBetween(ex - 2, y + k * h * 0.35, ex + 2, y + k * h * 0.35 + 1);
    }
  }
  // The cutting wire coming down at the mouth.
  if (wire > 0) {
    const wy = y - HALF - 20 + wire * (HALF * 2 + 20);
    g.lineStyle(1, 0x9c9890, 1); g.lineBetween(wireX - 10, y - HALF - 24, wireX - 6, wy); g.lineBetween(wireX + 10, y - HALF - 24, wireX + 6, wy);
    g.lineStyle(1.5, 0xe6e2da, 1); g.lineBetween(wireX - 6, wy, wireX + 6, wy);
  }
}

/** The mill in the wall: a barrel of iron-hooped staves on its side, a hopper, a crank wheel turning, the auger in the mouth. */
function drawMill(g: G, m: Mill, time: number): void {
  const x = m.mouth - m.dir * 18, y = m.y;
  const spin = m.phase === 'feed' ? time / (m.surge ? 60 : 160) : m.phase === 'aim' ? time / 260 : 0;
  const a = m.awake ? 1 : 0.55;
  // The rail it rides.
  g.fillStyle(IRON, 0.8 * a); g.fillRect(x - 6, y - 70, 4, 140);
  // Barrel.
  g.fillStyle(TIMBER_DARK, a); g.fillRoundedRect(x - 22, y - HALF - 8, 44, HALF * 2 + 16, 10);
  for (let k = -2; k <= 2; k++) { g.fillStyle(k % 2 ? TIMBER : TIMBER_LIT, a); g.fillRect(x - 20, y + k * 11 - 4, 40, 8); }
  for (const dx of [-14, 0, 14]) { g.fillStyle(IRON, a); g.fillRect(x + dx - 2, y - HALF - 8, 4, HALF * 2 + 16); g.fillStyle(IRON_LIT, a * 0.7); g.fillRect(x + dx - 2, y - HALF - 8, 1.5, HALF * 2 + 16); }
  // Hopper, heaped with clay.
  g.fillStyle(TIMBER, a); g.fillTriangle(x - 18, y - HALF - 8, x + 18, y - HALF - 8, x, y - HALF + 6);
  g.fillStyle(MARL, a); g.fillEllipse(x, y - HALF - 12, 30, 12);
  g.fillStyle(MARL_LIT, a); g.fillEllipse(x - 4, y - HALF - 15, 12, 5);
  // Mouth with the auger turning in it.
  const mx = m.mouth;
  g.fillStyle(IRON, a); g.fillEllipse(mx, y, 14, HALF * 2 + 6);
  g.fillStyle(MARL_DEEP, a); g.fillEllipse(mx, y, 9, HALF * 2 - 2);
  g.lineStyle(2, IRON_LIT, a);
  for (let k = 0; k < 3; k++) {
    const ph = spin + k * (Math.PI * 2 / 3);
    g.lineBetween(mx, y, mx + Math.cos(ph) * 3, y + Math.sin(ph) * (HALF - 2));
  }
  // The crank wheel on top, its handle going round.
  const cx = x, cy = y - HALF - 26;
  g.lineStyle(3, IRON, a); g.strokeCircle(cx, cy, 13);
  g.lineStyle(1.5, IRON_LIT, a); g.lineBetween(cx - 12, cy, cx + 12, cy); g.lineBetween(cx, cy - 12, cx, cy + 12);
  const hx = cx + Math.cos(spin) * 13, hy = cy + Math.sin(spin) * 13;
  g.fillStyle(TIMBER_LIT, a); g.fillRoundedRect(hx - 3, hy - 7, 6, 10, 2);
  if (m.surge) glow(g, cx, cy, 26, 0xffd27a, 0.1, 3);
  if (m.phase === 'aim') glow(g, mx, y, 30, MARL_LIT, 0.08, 3);
}

export const FALLEN_PUG: GimmickDef = {
  id: ID,
  rules: 'A pug mill lines up on you and pushes a clay log across the yard: its nose shoves, the far wall crushes. Strike the crank while it feeds to surge it.',
  make,
};
