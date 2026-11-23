import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Striker } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { warBanner } from '../art';
import { BANNERET_GILT, GILT, GILT_LIT, RED, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, segDist, stepDt, wrapAngle } from '../util';

/**
 * The Standard — Standard-Bearer Pennon.
 *
 * A war banner stands planted in the yard, its ring of rallying ground marked out in gilt. Hold
 * that ground *alone* and you rally: your blows land a third harder; hold it for five seconds
 * unchallenged and you raise a rallying cry that throws your foe off the ground. Both inside, and
 * the ground is contested — nobody rallies.
 *
 * Strike the banner enough and it topples — in the direction the striker is facing — and wherever
 * the pole lands, it re-plants. The falling pole cracks down on whoever is under it. So knock it
 * over toward yourself and the ground comes to you; knock it across your foe and it lands on him.
 */

const RING = 118;
const POLE = 190;
const FALL_MS = 520;
const LIE_MS = 1100;
const CRY_MS = 5000;

type State = 'planted' | 'falling' | 'lying';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const TOPPLE = ctx.hard ? 38 : 30;
  const RALLY = 1.33;
  let base: Pt = { x: W / 2, y: (top + H) / 2 + 20 };
  let state: State = 'planted';
  let stateAt = 0;
  let fallA = 0;
  let blows = 0;
  let holder: 'player' | 'npc' | null = null;
  let holdSince = 0;
  let cryAt = -9999;
  let lastHolder: 'player' | 'npc' | null = null;
  let hurtAt = -9999;

  const flag = ctx.target({
    x: base.x, y: base.y - 40, r: 22,
    onStruck(by: Striker, amount: number) {
      if (state !== 'planted') return;
      blows += Math.max(3, amount);
      hurtAt = ctx.scene.time.now;
      if (blows >= TOPPLE) topple(by === 'player' ? player : npc, ctx.scene.time.now);
    },
  });

  const inRing = (f: Fighter) => alive(f) && dist(f.x, f.y, base.x, base.y) < RING;
  const tipOf = (): Pt => ({
    x: clamp(base.x + Math.cos(fallA) * POLE, 70, W - 70),
    y: clamp(base.y + Math.sin(fallA) * POLE, top + 70, H - 50),
  });

  function topple(by: Fighter, time: number): void {
    state = 'falling';
    stateAt = time;
    fallA = ctx.facing(by);
    blows = 0;
    holder = null;
    ctx.sfx('clang');
    ctx.banner('THE STANDARD FALLS', '#f4d67e');
  }

  function crack(time: number): void {
    // The pole comes down along its length: whoever is under it takes the shaft.
    const t = tipOf();
    ctx.sfx('stone-slam');
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      if (segDist(f.x, f.y, base.x, base.y, t.x, t.y) < 30) {
        ctx.hit(f, ctx.hard ? 14 : 11, f.x, f.y);
        ctx.stun(f, 450);
        ctx.float(f.x, f.y - 48, 'FLATTENED', '#f4d67e');
      }
    }
    state = 'lying';
    stateAt = time;
  }

  function replant(time: number): void {
    base = tipOf();
    state = 'planted';
    stateAt = time;
    flag.moveTo(base.x, base.y - 40);
    ctx.sfx('stone-rise');
    ctx.flash(base.x, base.y, GILT_LIT);
  }

  return {
    update(time, dtRaw) {
      void stepDt(dtRaw);
      if (state === 'falling' && time - stateAt >= FALL_MS) crack(time);
      if (state === 'lying' && time - stateAt >= LIE_MS) replant(time);
      if (state !== 'planted') { holder = null; return; }

      const pIn = inRing(player), nIn = inRing(npc);
      const now: 'player' | 'npc' | null = pIn && !nIn ? 'player' : nIn && !pIn ? 'npc' : null;
      if (now !== holder) {
        holder = now;
        holdSince = time;
        if (now && now !== lastHolder) {
          const f = now === 'player' ? player : npc;
          ctx.float(f.x, f.y - 54, 'RALLY!', '#f4d67e');
          ctx.sfx('status-buff');
        }
        if (now) lastHolder = now;
      }
      // Five seconds of ground held unchallenged: the rallying cry.
      if (holder && time - holdSince >= CRY_MS && time - cryAt > CRY_MS) {
        cryAt = time;
        holdSince = time;
        const foe = holder === 'player' ? npc : player;
        ctx.sfx('roar');
        ctx.banner(holder === 'player' ? 'YOUR RALLYING CRY' : 'PENNON\'S RALLYING CRY', '#f4d67e');
        if (alive(foe)) {
          const a = Math.atan2(foe.y - base.y, foe.x - base.x);
          const d = dist(foe.x, foe.y, base.x, base.y);
          ctx.nudge(foe, Math.cos(a) * Math.max(60, RING + 60 - d), Math.sin(a) * Math.max(60, RING + 60 - d));
          ctx.hit(foe, 8, foe.x, foe.y);
        }
      }
    },

    playerTakenMult() { return holder === 'npc' ? RALLY : 1; },
    npcTakenMult() { return holder === 'player' ? RALLY : 1; },

    npcSeek() {
      if (state !== 'planted') {
        // Get to where the pole will stand next — unless that is under it.
        const t = tipOf();
        return { x: t.x + 30, y: t.y + 30 };
      }
      // You hold the ground: go and knock the standard over (he faces you, so it falls your way).
      if (inRing(player)) return { x: base.x, y: base.y + 10 };
      // Otherwise take the ground on the side away from you.
      const a = Math.atan2(base.y - player.y, base.x - player.x);
      return { x: base.x + Math.cos(a) * RING * 0.45, y: base.y + Math.sin(a) * RING * 0.45 };
    },

    drawGround(g, time) {
      if (state === 'planted') {
        const pulse = 0.5 + Math.sin(time / 300) * 0.5;
        const c = holder === 'player' ? RED : holder === 'npc' ? GILT : 0xd8cbaa;
        g.fillStyle(c, holder ? 0.12 + pulse * 0.06 : 0.06); g.fillCircle(base.x, base.y, RING);
        // A ring of gilt pegs and rope.
        g.lineStyle(2, GILT, 0.6); g.strokeCircle(base.x, base.y, RING);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          g.fillStyle(TIMBER_DARK, 1); g.fillCircle(base.x + Math.cos(a) * RING, base.y + Math.sin(a) * RING, 3);
        }
        // The cry building: an arc filling round the ring.
        if (holder) {
          const k = clamp((time - holdSince) / CRY_MS, 0, 1);
          g.lineStyle(5, holder === 'player' ? RED : BANNERET_GILT, 0.8);
          g.beginPath(); g.arc(base.x, base.y, RING + 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
      } else {
        // Where it will land: the pole's shadow along the floor.
        const t = tipOf();
        const k = state === 'falling' ? clamp((time - stateAt) / FALL_MS, 0, 1) : 1;
        g.lineStyle(26, 0x000000, 0.12 + k * 0.18); g.lineBetween(base.x, base.y, t.x, t.y);
        g.lineStyle(2, RED, 0.5); g.strokeCircle(t.x, t.y, 22 + (1 - k) * 20);
      }
      if (time - cryAt < 600) {
        const k = (time - cryAt) / 600;
        g.lineStyle(6 * (1 - k), GILT_LIT, 1 - k); g.strokeCircle(base.x, base.y, RING * (0.4 + k * 0.9));
      }
    },

    drawAir(g, time) {
      const wave = time / 220;
      if (state === 'planted') {
        if (holder) glow(g, base.x, base.y - 120, 50, GILT_LIT, 0.05, 3);
        // Light streaming off the banner's gilt for whoever holds it.
        if (holder) {
          for (let i = 0; i < 6; i++) {
            const a = -Math.PI / 2 + (i - 2.5) * 0.35 + Math.sin(time / 700 + i) * 0.05;
            g.lineStyle(3, GILT_LIT, 0.12); g.lineBetween(base.x + 30, base.y - 150, base.x + 30 + Math.cos(a) * 90, base.y - 150 + Math.sin(a) * 90);
          }
        }
        const shake = time - hurtAt < 200 ? Math.sin(time / 15) * 3 : 0;
        warBanner(g, base.x + shake, base.y, 170, holder === 'player' ? RED : 0x2a2632, 'lot', wave, clamp(blows / TOPPLE, 0, 1));
        // How close it is to toppling.
        const k = blows / TOPPLE;
        if (k > 0) { g.fillStyle(0x000000, 0.5); g.fillRect(base.x - 20, base.y + 8, 40, 4); g.fillStyle(GILT, 1); g.fillRect(base.x - 20, base.y + 8, 40 * k, 4); }
        return;
      }
      // Falling, then lying: draw the pole along its angle of fall.
      const k = state === 'falling' ? clamp((time - stateAt) / FALL_MS, 0, 1) : 1;
      const ang = -Math.PI / 2 + wrapAngle(fallA + Math.PI / 2) * k * k;
      const t = { x: base.x + Math.cos(ang) * POLE, y: base.y + Math.sin(ang) * POLE * (0.55 + 0.45 * k) };
      g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(base.x, base.y, t.x, t.y);
      g.fillStyle(GILT, 1); g.fillCircle(t.x, t.y, 5);
      const mx = base.x + (t.x - base.x) * 0.8, my = base.y + (t.y - base.y) * 0.8;
      g.fillStyle(0x2a2632, 1); g.fillEllipse(mx, my, 44, 20);
      g.fillStyle(GILT, 0.8); g.fillCircle(mx, my, 6);
    },

    destroy() { flag.remove(); },
  };
}

export const THE_STANDARD: GimmickDef = {
  id: 'war-standard',
  rules: 'Hold the standard\'s ground alone to rally: +33% damage, and a rallying cry after 5s. Strike it over and it falls the way you face, cracking whoever is under it.',
  make,
};
