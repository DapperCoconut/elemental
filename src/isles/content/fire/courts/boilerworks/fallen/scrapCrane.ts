import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, COPPER, COPPER_DARK, COPPER_LIT, FOE_C, HAZARD_YELLOW, IRON, IRON_DARK, IRON_LIT, MINE_C, REDLINE, RIVET,
  clamp, dist, frameClock, hazardStripes, rivets,
} from '../util';

/**
 * Scrap Crane — Craneman Ulric Hoist ran the yard's overhead electromagnet, and in the King's
 * telling he is the man who dropped the scrap bales on the strike line. The crane's bridge rolls
 * across the arena on two wall rails; its magnet head hunts whichever fighter is **marked**.
 *
 * Two pendant pulpits stand on the side walls. Strike either and the crane is re-marked onto
 * your *opponent* — so the whole fight is a tug over who the crane is hunting. Every few seconds
 * the head stops, the shadow of a crushed bale swells under it, and the bale drops on everyone
 * beneath (both sides). Halfway down, the magnet goes live: it snatches shots out of the air near
 * the head, and every shot it eats makes the next bale wider and heavier — feed it while it hangs
 * over the foe.
 */

const ID = fallenId('boilerworks', 'scrap-crane');
const CYCLE_MS = 6200;
const LOWER_MS = 1150;
const LIFT_MS = 650;
const MAX_LOAD = 4;

type Side = 'player' | 'npc';
type Phase = 'hunt' | 'lower' | 'lift';

function makeScrapCrane(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const tick = frameClock();
  const midY = (top + H) / 2;
  const railN = top + 12, railS = H - 12;

  let mark: Side = 'player';
  let lockUntil = 0;
  let phase: Phase = 'hunt';
  let phaseAt = ctx.scene.time.now + 2400;
  let hx = W / 2, hy = midY;
  let load = 0;
  let live = false;
  let heaps: { x: number; y: number; r: number; at: number }[] = [];
  let arcSeed = 0;

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
  const baleR = (): number => 66 + load * 13;
  const baleDmg = (): number => 22 + load * 5;

  /** Re-mark the crane onto the striker's opponent. */
  const strike = (by: Side): void => {
    const now = ctx.scene.time.now;
    if (now < lockUntil) return;
    const next: Side = by === 'player' ? 'npc' : 'player';
    lockUntil = now + 1100;
    if (next === mark) return;
    mark = next;
    ctx.sfx('gear-turn');
    const f = fighterOf(next);
    ctx.float(f.x, f.y - 46, next === 'npc' ? 'CRANE ON HOIST' : 'CRANE ON YOU', next === 'npc' ? '#9fe8ff' : '#ffb070');
  };

  const pulpits: { at: Pt; t: StrikeTarget }[] = [
    { x: 46, y: midY }, { x: W - 46, y: midY },
  ].map((at) => ({ at, t: ctx.target({ x: at.x, y: at.y, r: 26, onStruck: (by) => strike(by) }) }));

  return {
    update(time) {
      const dt = tick(time);
      if (!live && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        live = true;
        ctx.banner('THE MAGNET IS LIVE', '#9fe8ff');
        ctx.sfx('electric-charge');
      }
      heaps = heaps.filter((h) => time - h.at < 1800);

      if (phase === 'hunt') {
        const f = fighterOf(mark);
        if (alive(f)) {
          const d = dist(hx, hy, f.x, f.y);
          const step = Math.min(d, (live ? 135 : 112) * dt);
          if (d > 1) { hx += ((f.x - hx) / d) * step; hy += ((f.y - hy) / d) * step; }
        }
        hx = clamp(hx, 60, W - 60); hy = clamp(hy, top + 40, H - 40);
        if (time >= phaseAt) {
          phase = 'lower'; phaseAt = time + LOWER_MS;
          ctx.sfx('magnet-pull');
        }
      } else if (phase === 'lower' && time >= phaseAt) {
        const r = baleR(), dmg = baleDmg();
        ctx.sfx('gravity-slam'); ctx.sfx('clang');
        ctx.scene.cameras.main.shake(180, 0.006 + load * 0.0015);
        ctx.flash(hx, hy, 0xffe0a0);
        for (const f of [ctx.player, ctx.npc]) {
          if (alive(f) && dist(f.x, f.y, hx, hy) < r) ctx.hit(f, dmg, f.x, f.y);
        }
        heaps.push({ x: hx, y: hy, r, at: time });
        load = 0;
        phase = 'lift'; phaseAt = time + LIFT_MS;
      } else if (phase === 'lift' && time >= phaseAt) {
        phase = 'hunt'; phaseAt = time + CYCLE_MS - LOWER_MS - LIFT_MS;
      }

      // Live magnet: shots near the head are yanked up into it and add to the bale.
      if (live && phase !== 'lift') {
        for (const s of ctx.shotsNear(hx, hy, 64)) {
          s.block();
          if (load < MAX_LOAD) {
            load++;
            ctx.sfx('magnet-pull');
            ctx.float(hx, hy - 30, `BALE +${load}`, '#d6ecff');
          }
        }
      }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      // Under a dropping bale: get out from under it, away from the head.
      if (phase === 'lower' && dist(n.x, n.y, hx, hy) < baleR() + 30) {
        const d = Math.max(1, dist(n.x, n.y, hx, hy));
        return { x: clamp(hx + ((n.x - hx) / d) * (baleR() + 70), 60, W - 60), y: clamp(hy + ((n.y - hy) / d) * (baleR() + 70), top + 40, H - 40) };
      }
      // Hunted: go and throw the crane back onto the player.
      if (mark === 'npc' && ctx.scene.time.now >= lockUntil) {
        const p = pulpits.reduce((a, b) => (dist(n.x, n.y, a.at.x, a.at.y) < dist(n.x, n.y, b.at.x, b.at.y) ? a : b));
        return { x: p.at.x + (p.at.x < W / 2 ? 40 : -40), y: p.at.y };
      }
      return null;
    },

    drawGround(g, time) {
      // The two wall rails the bridge rolls on.
      for (const y of [railN, railS]) {
        g.fillStyle(0x000000, 0.35); g.fillRect(0, y - 4, W, 14);
        g.fillStyle(IRON_DARK, 1); g.fillRect(0, y - 6, W, 12);
        g.fillStyle(IRON_LIT, 1); g.fillRect(0, y - 3, W, 3);
        rivets(g, { x: 8, y: y + 3 }, { x: W - 8, y: y + 3 }, 26, 1.3, RIVET);
      }
      hazardStripes(g, { x: 0, y: railN - 6, w: 34, h: 12 }, 0.9, 10);
      hazardStripes(g, { x: W - 34, y: railN - 6, w: 34, h: 12 }, 0.9, 10);
      // Old heaps: dust and twisted scrap where bales came down.
      for (const h of heaps) {
        const k = (time - h.at) / 1800;
        g.fillStyle(0x6a5a48, 0.35 * (1 - k)); g.fillCircle(h.x, h.y, h.r * (1 + k * 0.3));
        for (let i = 0; i < 9; i++) {
          const a = i * 2.39, d = h.r * (0.2 + (i % 4) * 0.18);
          g.fillStyle(i % 3 === 0 ? COPPER_DARK : IRON, 0.8 * (1 - k));
          g.fillTriangle(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, h.x + Math.cos(a + 0.4) * (d + 9), h.y + Math.sin(a + 0.4) * (d + 9),
            h.x + Math.cos(a) * (d + 4), h.y + Math.sin(a) * (d + 4) + 6);
        }
      }
      // The head's shadow; while lowering it swells into the bale's footprint with a closing clock.
      const r = baleR();
      if (phase === 'lower') {
        const k = 1 - clamp((phaseAt - time) / LOWER_MS, 0, 1);
        g.fillStyle(0x000000, 0.18 + k * 0.32); g.fillCircle(hx, hy, r * (0.45 + 0.55 * k));
        g.lineStyle(3, REDLINE, 0.6 + 0.4 * Math.sin(time / 50)); g.strokeCircle(hx, hy, r);
        g.lineStyle(6, HAZARD_YELLOW, 0.85);
        g.beginPath(); g.arc(hx, hy, r + 7, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      } else {
        g.fillStyle(0x000000, 0.22); g.fillEllipse(hx, hy + 6, 70, 34);
      }
      // Pendant pulpits: a steel box on a post, two buttons, a lamp showing who is marked.
      for (const p of pulpits) {
        drawPulpit(g, p.at.x, p.at.y, mark, time < lockUntil, time);
      }
    },

    drawAir(g, time) {
      // The bridge girder across the arena at the head's x: two flanged beams with lattice.
      const bx = hx;
      g.fillStyle(IRON_DARK, 0.5); g.fillRect(bx - 22, railN - 8, 44, railS - railN + 16);
      g.lineStyle(3, IRON_LIT, 0.55);
      g.lineBetween(bx - 20, railN, bx - 20, railS); g.lineBetween(bx + 20, railN, bx + 20, railS);
      g.lineStyle(2, IRON, 0.5);
      for (let y = railN; y < railS - 30; y += 34) {
        g.lineBetween(bx - 20, y, bx + 20, y + 34); g.lineBetween(bx + 20, y, bx - 20, y + 34);
      }
      for (const y of [railN, railS]) {
        g.fillStyle(IRON, 1); g.fillRect(bx - 30, y - 9, 60, 18);
        g.fillStyle(0x15171a, 1); g.fillCircle(bx - 18, y, 6); g.fillCircle(bx + 18, y, 6);
        g.fillStyle(BRASS, 1); g.fillCircle(bx - 18, y, 2); g.fillCircle(bx + 18, y, 2);
      }
      // Trolley over the head, cable down to the magnet.
      const drop = phase === 'lower' ? clamp(1 - (phaseAt - time) / LOWER_MS, 0, 1) : 0;
      const liftH = 74 * (1 - drop);
      g.fillStyle(IRON, 1); g.fillRect(bx - 26, hy - liftH - 22, 52, 18);
      rivets(g, { x: bx - 22, y: hy - liftH - 13 }, { x: bx + 22, y: hy - liftH - 13 }, 11, 1.2, RIVET);
      g.lineStyle(2, 0x111111, 1); g.lineBetween(bx - 4, hy - liftH - 4, hx - 4, hy - liftH + 4); g.lineBetween(bx + 4, hy - liftH - 4, hx + 4, hy - liftH + 4);
      // The bale slung under the magnet: a crushed cube of scrap, bigger with load.
      const bs = 26 + load * 6;
      const by = hy - liftH + 28 + bs / 2;
      if (phase !== 'lift') {
        g.fillStyle(dim(IRON, 0.2), 1); g.fillRect(hx - bs / 2, by - bs / 2, bs, bs);
        g.fillStyle(COPPER_DARK, 1); g.fillRect(hx - bs / 2 + 3, by - bs / 2 + 5, bs * 0.4, bs * 0.25);
        g.fillStyle(0x4a6a8a, 1); g.fillRect(hx + 2, by - 2, bs * 0.35, bs * 0.3);
        g.fillStyle(0x8a2a1a, 1); g.fillRect(hx - bs / 2 + 4, by + bs * 0.15, bs * 0.3, bs * 0.2);
        g.lineStyle(2, IRON_LIT, 0.9); g.strokeRect(hx - bs / 2, by - bs / 2, bs, bs);
        g.lineStyle(1.5, BRASS, 0.8); g.lineBetween(hx - bs / 2, by, hx + bs / 2, by); g.lineBetween(hx, by - bs / 2, hx, by + bs / 2);
      }
      // The electromagnet: a copper-wound disc; live, it throws blue arcs.
      const my = hy - liftH + 14;
      g.fillStyle(0x000000, 0.4); g.fillEllipse(hx + 2, my + 6, 64, 20);
      g.fillStyle(IRON_DARK, 1); g.fillEllipse(hx, my, 60, 22);
      g.fillStyle(COPPER_DARK, 1); g.fillEllipse(hx, my - 4, 52, 16);
      g.fillStyle(COPPER, 1); g.fillEllipse(hx, my - 6, 44, 12);
      g.lineStyle(1, COPPER_LIT, 0.8);
      for (let i = -3; i <= 3; i++) g.lineBetween(hx + i * 6, my - 11, hx + i * 6, my - 1);
      if (live) {
        arcSeed = Math.floor(time / 70);
        g.lineStyle(2, MINE_C, 0.85);
        for (let a = 0; a < 3; a++) {
          const s = Math.sin(arcSeed * 3.1 + a * 7) * 0.5 + 0.5;
          const ang = a * 2.1 + s * 1.4;
          const ex = hx + Math.cos(ang) * 64, ey = my + Math.sin(ang) * 40;
          g.beginPath(); g.moveTo(hx, my);
          g.lineTo(hx + (ex - hx) * 0.4 + 8 * s, my + (ey - my) * 0.4 - 6); g.lineTo(ex, ey); g.strokePath();
        }
        g.lineStyle(1, lit(MINE_C, 0.5), 0.25); g.strokeCircle(hx, hy, 64);
      }
    },

    drawHud(g) {
      // Top-left: which side the crane hunts (two lamps) and the bale's load pips.
      const x = 18, y = top + 12;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 6, y - 6, 118, 40, 6);
      g.fillStyle(mark === 'player' ? REDLINE : 0x3a1a1a, 1); g.fillCircle(x + 12, y + 14, 9);
      g.fillStyle(mark === 'npc' ? MINE_C : 0x1a2a32, 1); g.fillCircle(x + 38, y + 14, 9);
      g.lineStyle(2, BRASS, 1); g.strokeCircle(x + 12, y + 14, 10); g.strokeCircle(x + 38, y + 14, 10);
      for (let i = 0; i < MAX_LOAD; i++) {
        g.fillStyle(i < load ? FOE_C : 0x333333, 1); g.fillRect(x + 58 + i * 13, y + 8, 10, 12);
        g.lineStyle(1, IRON_LIT, 1); g.strokeRect(x + 58 + i * 13, y + 8, 10, 12);
      }
    },

    destroy() { for (const p of pulpits) p.t.remove(); },
  };
}

/** A pendant pulpit: post, steel box with a hazard band, two push buttons and a mark lamp. */
function drawPulpit(g: G, x: number, y: number, mark: Side, locked: boolean, time: number): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x + 3, y + 24, 46, 14);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 4, y, 8, 24);
  g.fillStyle(IRON, 1); g.fillRoundedRect(x - 20, y - 26, 40, 34, 5);
  hazardStripes(g, { x: x - 18, y: y + 1, w: 36, h: 6 }, 0.9, 8);
  g.fillStyle(0x1a1a1a, 1); g.fillRect(x - 14, y - 20, 28, 16);
  g.fillStyle(locked ? 0x553311 : 0x2ac24a, 1); g.fillCircle(x - 7, y - 12, 4.5);
  g.fillStyle(locked ? 0x441111 : REDLINE, 1); g.fillCircle(x + 7, y - 12, 4.5);
  const lampC = mark === 'player' ? REDLINE : MINE_C;
  const pulse = 0.5 + 0.5 * Math.sin(time / 160);
  g.fillStyle(lampC, 0.25 * pulse); g.fillCircle(x, y - 32, 12);
  g.fillStyle(lampC, 1); g.fillCircle(x, y - 31, 5);
  g.lineStyle(1.5, BRASS, 1); g.strokeCircle(x, y - 31, 6);
  rivets(g, { x: x - 16, y: y - 23 }, { x: x + 16, y: y - 23 }, 8, 1, RIVET);
}

export const SCRAP_CRANE: GimmickDef = {
  id: ID,
  rules: 'The crane hunts the marked fighter and drops bales on all below. Strike a wall pulpit to mark your foe. Late on, shots near the magnet load the bale.',
  make: makeScrapCrane,
};
