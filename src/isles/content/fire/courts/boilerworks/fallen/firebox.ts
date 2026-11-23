import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, COPPER, COPPER_DARK, HOT, HOT_LIT, IRON, IRON_DARK, IRON_LIT, REDLINE, RIVET, SOOT, STEAM,
  clamp, dist, frameClock, rivets, valveWheel,
} from '../util';

/**
 * Into the Firebox — Stoker-Royal Abner Flue tends the Great Boiler's firebox, and in the King's
 * telling he is the man who fed it the unbranded. The firebox door fills the north wall.
 *
 * It breathes. **Draught:** the door swings open and the fire drinks the room's air, dragging both
 * fighters toward its mouth, where the heat burns. **Shut:** the door bangs closed and the floor
 * marks where it will belch. **Belch:** fire lanes fan out of the mouth across the room. A damper
 * wheel hangs beside the door: strike it while the draught is drawing and the door slams on a full
 * throat — a **backdraft** that bursts round the mouth, catching whoever the draught has dragged
 * close. Past half, the draught drinks harder and the belch fans wider, alternating its gaps.
 */

const ID = fallenId('boilerworks', 'firebox');
const DRAUGHT_MS = 4200;
const SHUT_MS = 1250;
const BELCH_MS = 420;
const REST_MS = 2600;
const BURN_R = 112;
const BACKDRAFT_R = 175;
const LANE_HALF = 34;

type Phase = 'rest' | 'draught' | 'shut' | 'belch';

function makeFirebox(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const tick = frameClock();
  const mouth: Pt = { x: W / 2, y: top + 4 };
  const damperAt: Pt = { x: W / 2 + 150, y: top + 40 };

  let phase: Phase = 'rest';
  let phaseEnd = ctx.scene.time.now + 2200;
  let lanes: number[] = [];
  let fierce = false;
  let alt = false;
  let nextBurn = 0;
  let backdraftAt = -9999;
  let wheelSpin = 0;

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const pullStr = (): number => (fierce ? 125 : 100);

  /** Distance from a point to the lane ray leaving the mouth at angle `a`. */
  const laneDist = (x: number, y: number, a: number): number => {
    const dx = x - mouth.x, dy = y - mouth.y;
    const along = dx * Math.cos(a) + dy * Math.sin(a);
    if (along < 0) return Infinity;
    return Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
  };

  const backdraft = (time: number): void => {
    phase = 'rest'; phaseEnd = time + REST_MS;
    backdraftAt = time;
    ctx.tk.pull(mouth.x, mouth.y, 0, 0); // the door is shut: the draught stops with it
    ctx.sfx('explosion-medium'); ctx.sfx('flame-burst');
    ctx.scene.cameras.main.shake(260, 0.01);
    ctx.flash(mouth.x, mouth.y + 40, HOT_LIT);
    ctx.banner('BACKDRAFT', '#ffb070');
    for (const f of [ctx.player, ctx.npc]) {
      if (alive(f) && dist(f.x, f.y, mouth.x, mouth.y) < BACKDRAFT_R) ctx.hit(f, 28, f.x, f.y);
    }
  };

  const damper: StrikeTarget = ctx.target({
    x: damperAt.x, y: damperAt.y, r: 24,
    onStruck: () => {
      wheelSpin += 1.2;
      if (phase === 'draught') backdraft(ctx.scene.time.now);
    },
  });

  const pickLanes = (): number[] => {
    const base = Math.PI / 2;
    if (!fierce) {
      const j = (rng() - 0.5) * 0.3;
      return [-0.62, 0, 0.62].map((o) => base + o + j);
    }
    alt = !alt;
    return (alt ? [-0.78, -0.26, 0.26, 0.78] : [-0.92, -0.46, 0, 0.46, 0.92]).map((o) => base + o);
  };

  return {
    update(time) {
      const dt = tick(time);
      wheelSpin *= Math.pow(0.2, dt);
      if (!fierce && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        fierce = true;
        ctx.banner('THE FIRE IS HUNGRY', '#ff9a5a');
        ctx.sfx('inferno');
      }
      if (time < phaseEnd) {
        if (phase === 'draught') {
          // The npc is dragged by hand; the player through the toolkit's pull (started on open).
          const n = ctx.npc;
          if (alive(n)) {
            const d = Math.max(1, dist(n.x, n.y, mouth.x, mouth.y));
            if (d > 40) ctx.nudge(n, ((mouth.x - n.x) / d) * pullStr() * dt, ((mouth.y - n.y) / d) * pullStr() * dt);
          }
          if (time >= nextBurn) {
            nextBurn = time + 450;
            for (const f of [ctx.player, ctx.npc]) {
              if (alive(f) && dist(f.x, f.y, mouth.x, mouth.y) < BURN_R) { ctx.hit(f, 7, f.x, f.y); ctx.sfx('status-burn'); }
            }
          }
        }
        return;
      }
      if (phase === 'rest') {
        phase = 'draught'; phaseEnd = time + DRAUGHT_MS;
        ctx.tk.pull(mouth.x, mouth.y, pullStr(), DRAUGHT_MS);
        ctx.sfx('gust');
      } else if (phase === 'draught') {
        phase = 'shut'; phaseEnd = time + SHUT_MS;
        lanes = pickLanes();
        ctx.sfx('clang');
      } else if (phase === 'shut') {
        phase = 'belch'; phaseEnd = time + BELCH_MS;
        ctx.sfx('fireball');
        for (const f of [ctx.player, ctx.npc]) {
          if (alive(f) && lanes.some((a) => laneDist(f.x, f.y, a) < LANE_HALF + 12)) ctx.hit(f, 21, f.x, f.y);
        }
      } else {
        phase = 'rest'; phaseEnd = time + REST_MS;
        lanes = [];
      }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      if (phase === 'draught') return { x: clamp(n.x, 80, W - 80), y: H - 50 };
      if (phase === 'shut' || phase === 'belch') {
        // Find the gap between lanes at its own distance from the mouth.
        const d = Math.max(140, dist(n.x, n.y, mouth.x, mouth.y));
        let best: Pt | null = null, bestD = Infinity;
        for (let a = 0.3; a < Math.PI - 0.3; a += 0.06) {
          const p = { x: mouth.x + Math.cos(a) * d, y: mouth.y + Math.sin(a) * d };
          if (p.x < 50 || p.x > W - 50 || p.y > H - 40) continue;
          if (lanes.some((la) => laneDist(p.x, p.y, la) < LANE_HALF + 34)) continue;
          const dd = dist(n.x, n.y, p.x, p.y);
          if (dd < bestD) { bestD = dd; best = p; }
        }
        return best;
      }
      return null;
    },

    drawGround(g, time) {
      // Heat-scorched floor fanning out of the mouth.
      g.fillStyle(SOOT, 0.35); g.fillEllipse(mouth.x, mouth.y + 30, 360, 140);
      const open = phase === 'draught';
      if (open) {
        const k = clamp(1 - (phaseEnd - time) / DRAUGHT_MS, 0, 1);
        g.fillStyle(HOT, 0.1 + 0.08 * Math.sin(time / 80)); g.fillCircle(mouth.x, mouth.y, BURN_R);
        g.lineStyle(2, REDLINE, 0.7); g.strokeCircle(mouth.x, mouth.y, BURN_R);
        // Ash and sparks streaming in along the draught.
        for (let i = 0; i < 22; i++) {
          const a = 0.25 + (i / 22) * (Math.PI - 0.5);
          const ph = ((time / 900) + i * 0.37) % 1;
          const d = 460 * (1 - ph);
          g.fillStyle(i % 3 ? 0x8a8070 : HOT_LIT, 0.5 * ph + 0.1);
          g.fillCircle(mouth.x + Math.cos(a) * d, mouth.y + Math.sin(a) * d, 1.5 + ph * 2);
        }
        g.lineStyle(1, STEAM, 0.12 + 0.1 * k);
        for (let i = 0; i < 7; i++) {
          const a = 0.4 + i * 0.39;
          g.lineBetween(mouth.x + Math.cos(a) * 420, mouth.y + Math.sin(a) * 420, mouth.x + Math.cos(a) * 140, mouth.y + Math.sin(a) * 140);
        }
      }
      // Belch telegraphs while shut; fire while belching.
      for (const a of lanes) {
        const ex = mouth.x + Math.cos(a) * 900, ey = mouth.y + Math.sin(a) * 900;
        if (phase === 'shut') {
          const k = clamp(1 - (phaseEnd - time) / SHUT_MS, 0, 1);
          g.lineStyle(LANE_HALF * 2, REDLINE, 0.08 + k * 0.18); g.lineBetween(mouth.x, mouth.y, ex, ey);
          g.lineStyle(2, REDLINE, 0.5 + 0.5 * (Math.floor(time / 90) % 2));
          const nx = -Math.sin(a) * LANE_HALF, ny = Math.cos(a) * LANE_HALF;
          g.lineBetween(mouth.x + nx, mouth.y + ny, ex + nx, ey + ny); g.lineBetween(mouth.x - nx, mouth.y - ny, ex - nx, ey - ny);
        } else if (phase === 'belch') {
          const k = clamp(1 - (phaseEnd - time) / BELCH_MS, 0, 1);
          g.lineStyle(LANE_HALF * 2 + 10, HOT, 0.75 * (1 - k)); g.lineBetween(mouth.x, mouth.y, ex, ey);
          g.lineStyle(LANE_HALF, HOT_LIT, 0.9 * (1 - k)); g.lineBetween(mouth.x, mouth.y, ex, ey);
          g.lineStyle(8, 0xffffff, 0.7 * (1 - k)); g.lineBetween(mouth.x, mouth.y, ex, ey);
        }
      }
      // Backdraft scorch ring.
      const bk = (time - backdraftAt) / 600;
      if (bk >= 0 && bk < 1) {
        g.fillStyle(HOT_LIT, 0.5 * (1 - bk)); g.fillCircle(mouth.x, mouth.y, BACKDRAFT_R * (0.5 + bk * 0.5));
        g.lineStyle(6, HOT, 1 - bk); g.strokeCircle(mouth.x, mouth.y, BACKDRAFT_R * (0.6 + bk * 0.4));
      }
    },

    drawAir(g, time) {
      drawFireboxDoor(g, mouth.x, mouth.y, phase, phaseEnd, time);
      // The damper wheel on its stand by the door.
      g.fillStyle(IRON_DARK, 1); g.fillRect(damperAt.x - 4, damperAt.y, 8, 26);
      g.fillStyle(IRON, 1); g.fillRect(damperAt.x - 14, damperAt.y + 22, 28, 6);
      valveWheel(g, damperAt.x, damperAt.y, 18, time / 1000 * wheelSpin * 6 + wheelSpin, phase === 'draught' ? REDLINE : BRASS);
      if (phase === 'draught') {
        g.lineStyle(2, HOT_LIT, 0.5 + 0.5 * Math.sin(time / 100)); g.strokeCircle(damperAt.x, damperAt.y, 27);
      }
    },

    drawHud(g, time) {
      // A firebox thermometer: the phase as a tall bulb, the draught marked by inward chevrons.
      const x = W - 30, y0 = top + 12, h = 120;
      const span = phase === 'draught' ? DRAUGHT_MS : phase === 'shut' ? SHUT_MS : phase === 'belch' ? BELCH_MS : REST_MS;
      const k = clamp(1 - (phaseEnd - time) / span, 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 14, y0 - 6, 28, h + 30, 8);
      g.fillStyle(0x1a1a1a, 1); g.fillRect(x - 5, y0, 10, h);
      const c = phase === 'draught' ? HOT : phase === 'shut' ? REDLINE : phase === 'belch' ? 0xffffff : COPPER;
      g.fillStyle(c, 1); g.fillRect(x - 4, y0 + h * (1 - k), 8, h * k);
      g.lineStyle(1.5, BRASS, 1); g.strokeRect(x - 5, y0, 10, h);
      g.fillStyle(c, 1); g.fillCircle(x, y0 + h + 10, 8);
      g.lineStyle(2, BRASS, 1); g.strokeCircle(x, y0 + h + 10, 8);
      if (fierce) { g.fillStyle(REDLINE, 1); g.fillTriangle(x - 12, y0 - 2, x - 6, y0 + 6, x - 12, y0 + 10); }
    },

    destroy() { damper.remove(); },
  };
}

/** The firebox door: a riveted iron arch in the north wall; it swings open on a throat of coals. */
function drawFireboxDoor(g: G, x: number, y: number, phase: Phase, end: number, time: number): void {
  const w = 150, h = 66;
  g.fillStyle(0x2a1a14, 1); g.fillRect(x - w / 2 - 30, y - 10, w + 60, h + 14);
  for (let i = 0; i < 9; i++) {
    g.fillStyle(i % 2 ? 0x6a3220 : 0x7a3a24, 1); g.fillRect(x - w / 2 - 28 + i * 23, y - 8, 21, 10);
  }
  // Throat: the coals inside, always glowing behind the door.
  const open = phase === 'draught' ? 1 : phase === 'belch' ? 1 : phase === 'shut' ? 0 : 0.08;
  g.fillStyle(0x120604, 1); g.fillRect(x - w / 2 + 8, y + 4, w - 16, h - 12);
  const beat = 0.5 + 0.5 * Math.sin(time / (phase === 'draught' ? 60 : 200));
  g.fillStyle(phase === 'belch' ? 0xffffff : HOT_LIT, (0.25 + 0.6 * beat) * (0.3 + 0.7 * open)); g.fillRect(x - w / 2 + 12, y + 30, w - 24, h - 38);
  for (let i = 0; i < 10; i++) {
    g.fillStyle(i % 2 ? HOT : HOT_LIT, 0.5 + 0.5 * Math.sin(time / 110 + i)); g.fillCircle(x - w / 2 + 20 + i * 12, y + h - 14, 5);
  }
  // Two door leaves, hinged at the sides, swung out to the walls when open.
  const swing = phase === 'draught' ? 1 : phase === 'belch' ? 1 : phase === 'shut' ? 0 : 0.08;
  const leafW = (w / 2) * (1 - swing * 0.82);
  for (const side of [-1, 1]) {
    const hx = x + side * (w / 2);
    const lx = side < 0 ? hx : hx - leafW;
    g.fillStyle(IRON_DARK, 1); g.fillRect(lx, y + 2, leafW, h - 6);
    g.fillStyle(IRON, 1); g.fillRect(lx + 2, y + 4, Math.max(0, leafW - 4), h - 10);
    if (leafW > 20) {
      rivets(g, { x: lx + 6, y: y + 8 }, { x: lx + leafW - 6, y: y + 8 }, 10, 1.3, RIVET);
      rivets(g, { x: lx + 6, y: y + h - 10 }, { x: lx + leafW - 6, y: y + h - 10 }, 10, 1.3, RIVET);
      g.fillStyle(dim(IRON_LIT, 0.1), 1); g.fillRect(lx + leafW / 2 - 8, y + h / 2 - 8, 16, 10);
      g.fillStyle(0x0a0402, 1);
      for (let i = 0; i < 3; i++) g.fillRect(lx + leafW / 2 - 7 + i * 5, y + h / 2 - 6, 3, 6);
    }
    g.fillStyle(COPPER_DARK, 1); g.fillCircle(hx, y + 14, 5); g.fillCircle(hx, y + h - 14, 5);
  }
  // Brass pressure plate and the shut-bar while it holds the door.
  g.fillStyle(BRASS, 1); g.fillRect(x - 22, y - 8, 44, 6);
  if (phase === 'shut') {
    const k = clamp(1 - (end - time) / SHUT_MS, 0, 1);
    g.fillStyle(COPPER, 1); g.fillRect(x - w / 2 + 4, y + h / 2 - 4, w - 8, 8);
    g.fillStyle(REDLINE, 0.3 + 0.5 * k); g.fillRect(x - w / 2 + 4, y + h / 2 - 1, (w - 8) * k, 2);
  }
}

export const FIREBOX: GimmickDef = {
  id: ID,
  rules: 'The firebox drags everyone toward its burning mouth, shuts, then belches fire lanes. Strike the damper while it draws to backdraft its mouth.',
  make: makeFirebox,
};
