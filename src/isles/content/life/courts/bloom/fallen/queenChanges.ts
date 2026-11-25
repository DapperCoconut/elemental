import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { skep } from '../art';
import { POLLEN, TERRA, TERRA_DARK, TERRA_LIT, TIMBER, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Queen Changes Hands — Apiarist Lubin Hume of the Pollinarium, who in the King's telling let
 * the crown's bees loose on any household that hid honey back from the Tithe: wherever the queen is
 * carried, the swarm goes.
 *
 * One fighter carries the queen in a wicker cage — you, to begin with. The swarm drifts after the
 * bearer, slower than a walk but never resting, and stings whoever is inside it on a steady clock.
 * The queen changes hands when her bearer lands a blow on the other from close by (or dashes
 * through them): press it on Hume and the swarm turns on him — and he will press it back.
 *
 * Three smoker pots stand at the edges. Strike one and it puffs smoke: a swarm that drifts into it
 * goes dozy and stops stinging for a moment. From half, the hive splits, and a second, slower swarm
 * hunts whoever does *not* hold the queen.
 */

const ID = fallenId('bloom', 'queen-changes');
const SWARM_R = 68;
const STING_MS = 500;
const PASS_R = 210;
const PASS_GAP = 1500;
const SMOKE_MS = 3200;
const POT_REARM = 8000;

interface Swarm { x: number; y: number; speed: number; hunts: 'bearer' | 'other'; dozeUntil: number; stingAt: Map<Fighter, number>; seed: number }
interface Pot { x: number; y: number; smokeAt: number; t: StrikeTarget }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  let bearer: Fighter = player;
  let passedAt = -1e9;
  let own = false;
  let turned = false;
  let started = false;
  const swarms: Swarm[] = [];
  const pots: Pot[] = [];
  const other = () => (bearer === player ? npc : player);

  function pass(to: Fighter, time: number): void {
    if (time - passedAt < PASS_GAP || to === bearer) return;
    bearer = to;
    passedAt = time;
    ctx.float(to.x, to.y - 64, to === player ? 'THE QUEEN IS YOURS' : 'QUEEN TO HUME', to === player ? '#ff9a7a' : '#f6dc52');
    ctx.sfx('drone-buzz');
  }

  function addPot(x: number, y: number): void {
    const t = ctx.target({
      x, y, r: 24,
      onStruck: () => {
        const p = pots.find((q) => q.t === t);
        if (!p || tk.now - p.smokeAt < POT_REARM) return;
        p.smokeAt = tk.now;
        ctx.sfx('smoke');
      },
    });
    pots.push({ x, y, smokeAt: -1e9, t });
  }

  return {
    update(time, dtS) {
      const dt = stepDt(dtS);
      if (!started) {
        started = true;
        swarms.push({ x: W / 2, y: top + 30, speed: 138, hunts: 'bearer', dozeUntil: 0, stingAt: new Map(), seed: 0 });
        addPot(70, top + 70); addPot(W - 70, top + 70); addPot(W / 2, H - 50);
      }
      if (!turned && npc.hp < npc.maxHp * 0.5) {
        turned = true;
        swarms.push({ x: W / 2, y: H - 60, speed: 112, hunts: 'other', dozeUntil: 0, stingAt: new Map(), seed: 3.1 });
        ctx.banner('THE HIVE SPLITS', '#f6dc52');
        ctx.sfx('screech');
      }
      // Dashing through the other fighter presses the queen on them.
      if (alive(bearer) && ctx.dashing(bearer) && dist(bearer.x, bearer.y, other().x, other().y) < 60) pass(other(), time);
      for (const s of swarms) {
        const f = s.hunts === 'bearer' ? bearer : other();
        for (const p of pots) {
          if (time - p.smokeAt < SMOKE_MS && dist(s.x, s.y, p.x, p.y) < 110) s.dozeUntil = Math.max(s.dozeUntil, time + 2400);
        }
        if (time < s.dozeUntil || !alive(f)) continue;
        const d = dist(s.x, s.y, f.x, f.y);
        if (d > 4) {
          const step = Math.min(d, s.speed * dt);
          s.x += ((f.x - s.x) / d) * step; s.y += ((f.y - s.y) / d) * step;
        }
        for (const v of [player, npc]) {
          if (!alive(v) || dist(v.x, v.y, s.x, s.y) > SWARM_R || time - (s.stingAt.get(v) ?? -1e9) < STING_MS) continue;
          s.stingAt.set(v, time);
          own = true;
          if (v === player) tk.hitPlayer(4, v.x, v.y); else ctx.hit(npc, 6, v.x, v.y);
          own = false;
        }
      }
    },

    onNpcHurt() {
      if (!own && bearer === player && dist(player.x, player.y, npc.x, npc.y) < PASS_R) pass(npc, tk.now);
    },
    onPlayerHurt() {
      if (!own && bearer === npc && dist(player.x, player.y, npc.x, npc.y) < PASS_R) pass(player, tk.now);
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Holding her: close in to press her back.
      if (bearer === npc) return { x: player.x, y: player.y };
      // Not holding her: keep the swarm off, and stay out of your reach.
      const s = swarms.find((q) => q.hunts === 'other' && dist(q.x, q.y, npc.x, npc.y) < 220);
      if (s) {
        const a = Math.atan2(npc.y - s.y, npc.x - s.x);
        return { x: tk.clampX(npc.x + Math.cos(a) * 160), y: tk.clampY(npc.y + Math.sin(a) * 160) };
      }
      if (dist(player.x, player.y, npc.x, npc.y) < PASS_R + 30) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: tk.clampX(player.x + Math.cos(a) * (PASS_R + 90)), y: tk.clampY(player.y + Math.sin(a) * (PASS_R + 90)) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const p of pots) drawPot(g, p, time);
      for (const s of swarms) {
        shadow(g, s.x, s.y + 10, SWARM_R * 1.6, SWARM_R * 0.5, 0.12);
        g.lineStyle(1.5, POLLEN, time < s.dozeUntil ? 0.15 : 0.35); g.strokeEllipse(s.x, s.y + 6, SWARM_R * 2, SWARM_R * 0.9);
      }
    },

    drawAir(g, time) {
      for (const s of swarms) drawSwarm(g, s, time);
      if (alive(bearer)) drawCage(g, bearer.x, bearer.y - 70, time, time - passedAt < 400);
    },

    drawHud(g, time) {
      // Who holds the queen, and the hand-off clock.
      const x = W / 2, y = top + 16;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 60, y - 12, 120, 24, 6);
      g.fillStyle(bearer === player ? 0xff9a7a : 0x6a6a6e, 1); g.fillCircle(x - 40, y, 7);
      g.fillStyle(bearer === npc ? POLLEN : 0x6a6a6e, 1); g.fillCircle(x + 40, y, 7);
      const k = clamp((time - passedAt) / PASS_GAP, 0, 1);
      g.fillStyle(0x3a3a3c, 1); g.fillRect(x - 26, y - 3, 52, 6);
      g.fillStyle(POLLEN, 1); g.fillRect(x - 26, y - 3, 52 * k, 6);
      drawBee(g, bearer === player ? x - 40 : x + 40, y - 1, 0, time, 1.2);
    },

    destroy() { for (const p of pots) p.t.remove(); },
  };
}

/** One worker bee: striped body, a blur of wings. */
function drawBee(g: G, x: number, y: number, a: number, time: number, s = 1): void {
  const c = Math.cos(a), si = Math.sin(a);
  g.fillStyle(0xffffff, 0.55); const w = Math.sin(time / 18 + x) * 1.5;
  g.fillEllipse(x - si * 2 * s, y - 3 * s + w, 4 * s, 3 * s); g.fillEllipse(x + si * 2 * s, y - 3 * s - w, 4 * s, 3 * s);
  g.fillStyle(0xe8b020, 1); g.fillEllipse(x, y, 5 * s, 3.5 * s);
  g.fillStyle(0x1a1410, 1); g.fillRect(x - c * 0.5 * s - 0.6 * s, y - 1.6 * s, 1.2 * s, 3.2 * s); g.fillCircle(x + c * 2.6 * s, y + si * 2.6 * s, 1.1 * s);
}

/** The swarm: bees on orbits round a drifting centre, tighter and angrier when awake, slow when smoked. */
function drawSwarm(g: G, s: Swarm, time: number): void {
  const dozy = time < s.dozeUntil;
  const sp = dozy ? 0.25 : 1;
  glow(g, s.x, s.y - 20, SWARM_R, POLLEN, dozy ? 0.015 : 0.03, 3);
  for (let i = 0; i < 46; i++) {
    const r = SWARM_R * (0.25 + ((i * 37) % 23) / 30);
    const a = (time / 1000) * sp * (1.4 + (i % 5) * 0.4) * (i % 2 ? 1 : -1) + i * 2.4 + s.seed;
    const x = s.x + Math.cos(a) * r, y = s.y - 22 + Math.sin(a) * r * 0.55 + Math.sin(time / 120 + i) * 3;
    drawBee(g, x, y, a + Math.PI / 2, time, 0.9);
  }
  if (dozy) for (let i = 0; i < 3; i++) { g.lineStyle(1.5, 0xcfd0c8, 0.5); g.strokeCircle(s.x + 18 + i * 8, s.y - 70 - i * 10, 3 + i); }
}

/** The queen's cage: a wicker box with a cork, the long-bodied queen inside, carried overhead. */
function drawCage(g: G, x: number, y: number, time: number, fresh: boolean): void {
  const bob = Math.sin(time / 260) * 2;
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x - 12, y - 9 + bob, 24, 18, 4);
  g.lineStyle(1, TIMBER, 1);
  for (let i = 0; i < 5; i++) g.lineBetween(x - 10 + i * 5, y - 8 + bob, x - 10 + i * 5, y + 8 + bob);
  g.lineBetween(x - 12, y + bob, x + 12, y + bob);
  g.fillStyle(0xc9a456, 1); g.fillRect(x + 12, y - 4 + bob, 5, 8);
  g.fillStyle(0xd89a18, 1); g.fillEllipse(x, y + bob, 12, 5);
  g.fillStyle(0x1a1410, 1); g.fillRect(x - 2, y - 2 + bob, 1.5, 4); g.fillRect(x + 2, y - 2 + bob, 1.5, 4);
  if (fresh) glow(g, x, y + bob, 26, POLLEN, 0.08, 3);
}

/** A smoker pot: a terracotta brazier on a skep stand, lit when struck and smoking hard. */
function drawPot(g: G, p: Pot, time: number): void {
  skep(g, p.x - 34, p.y + 10);
  shadow(g, p.x, p.y + 4, 40, 12);
  g.fillStyle(TERRA_DARK, 1); g.fillEllipse(p.x, p.y, 34, 12);
  g.fillStyle(TERRA, 1); g.fillRect(p.x - 15, p.y - 22, 30, 22);
  g.fillStyle(TERRA_LIT, 1); g.fillRect(p.x - 13, p.y - 21, 5, 18);
  g.fillStyle(0x3a2a1a, 1); g.fillEllipse(p.x, p.y - 22, 30, 9);
  const k = (time - p.smokeAt) / SMOKE_MS;
  if (k >= 0 && k < 1) {
    g.fillStyle(0xff8a3a, 0.8); g.fillEllipse(p.x, p.y - 22, 20, 6);
    for (let i = 0; i < 12; i++) {
      const ph = (time / 1400 + i / 12) % 1;
      const r = 14 + ph * 46;
      g.fillStyle(0xcfd0c8, 0.32 * (1 - ph) * (1 - k * 0.6));
      g.fillCircle(p.x + Math.sin(i * 2.3 + time / 700) * ph * 70, p.y - 30 - ph * 60, r);
    }
  } else if (k >= 1 && time - p.smokeAt < POT_REARM) {
    g.fillStyle(0x6a5a4a, 0.5); g.fillCircle(p.x, p.y - 34 - Math.sin(time / 400) * 4, 5);
  } else {
    g.lineStyle(1, 0xcfd0c8, 0.4); g.lineBetween(p.x, p.y - 26, p.x + Math.sin(time / 300) * 4, p.y - 40);
  }
}

export const FALLEN_QUEEN_CHANGES: GimmickDef = {
  id: ID,
  rules: 'The swarm follows whoever holds the queen. Hit the other up close to press her on them. Strike smoker pots to doze it. At half, two swarms.',
  make,
};
