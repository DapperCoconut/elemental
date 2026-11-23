import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { OBS } from '../../../../../art/PinnacleArt';
import { BONE, OCHRE, OCHRE_LIT, SANDSTONE } from '../art';
import { type Who, WHO, alive, clamp, dist, stepDt } from '../util';

/**
 * Decree of Trespass — Councilor Ashar Wend, Seat of Drifts (dune, shown as Sand).
 *
 * Wend wrote the Boundary: whoever leaves a print on Tithe ground owes for the ground. The floor is
 * deep in the vault's dust, and every step either party takes leaves a glowing print. Tread on the
 * other party's fresh prints and you are charged with trespass — held fast for a moment and hurt —
 * and the evidence is collected. A dash, a blink or a jump touches nothing and leaves nothing:
 * perfected Sand is barely ever on the floor. Every so often THE DRIFT blows across the vault and
 * buries every print it passes.
 *
 * Draw a line round her. Make her walk through it.
 */

type G = Phaser.GameObjects.Graphics;

interface Print { x: number; y: number; a: number; who: Who; t: number; foot: number }
interface Walker { lx: number; ly: number; acc: number; foot: number; okAt: number; vx: number; vy: number; heldAt: number }

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top } = ctx;
  const STEP = 24;
  const LIFE = ctx.hard ? 4400 : 3800;
  const ARM = 400;
  const TOUCH = 15;
  const DMG = ctx.hard ? 10 : 8;
  const DRIFT_EVERY = 12500;
  const DRIFT_WARN = 1100;
  const DRIFT_SPEED = 620;
  const prints: Print[] = [];
  const walkers: Record<Who, Walker> = {
    player: { lx: 0, ly: 0, acc: 0, foot: 0, okAt: 0, vx: 0, vy: 0, heldAt: -9999 },
    npc: { lx: 0, ly: 0, acc: 0, foot: 0, okAt: 0, vx: 0, vy: 0, heldAt: -9999 },
  };
  let started = false;
  let firstCharge = true;
  let driftAt = 0;
  let driftDir = 1;
  /** -1 while no drift is crossing; else the ms it began crossing. */
  let driftStart = -1;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const grounded = (f: Fighter): boolean => !ctx.dashing(f) && !ctx.isAirborne(f);
  const driftX = (time: number): number => (driftDir > 0 ? -60 : W + 60) + driftDir * (time - driftStart) / 1000 * DRIFT_SPEED;

  const charge = (who: Who, f: Fighter, time: number) => {
    const w = walkers[who];
    w.okAt = time + 1300;
    w.heldAt = time;
    ctx.root(f, 520);
    ctx.hit(f, DMG, f.x, f.y);
    ctx.float(f.x, f.y - 50, 'TRESPASS', '#e8c27e');
    ctx.sfx('trap-snap');
    if (firstCharge) { firstCharge = false; ctx.banner('CHARGED WITH TRESPASS', '#e8c27e'); }
    // The evidence is collected.
    for (let i = prints.length - 1; i >= 0; i--) if (prints[i].who !== who && dist(prints[i].x, prints[i].y, f.x, f.y) < 46) prints.splice(i, 1);
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        driftAt = time + DRIFT_EVERY;
        for (const w of WHO) { walkers[w].lx = fighter(w).x; walkers[w].ly = fighter(w).y; }
      }
      for (const who of WHO) {
        const f = fighter(who), w = walkers[who];
        if (!alive(f)) continue;
        const dx = f.x - w.lx, dy = f.y - w.ly, d = Math.hypot(dx, dy);
        if (dt > 0) { w.vx += ((dx / dt) - w.vx) * 0.2; w.vy += ((dy / dt) - w.vy) * 0.2; }
        w.lx = f.x; w.ly = f.y;
        if (d > 60) { w.acc = 0; continue; }
        if (!grounded(f)) { w.acc = 0; continue; }
        w.acc += d;
        if (w.acc >= STEP) {
          w.acc = 0;
          w.foot = 1 - w.foot;
          const a = Math.atan2(dy, dx);
          const side = w.foot ? 5 : -5;
          prints.push({ x: f.x - Math.sin(a) * side, y: f.y + 12 + Math.cos(a) * side, a, who, t: time, foot: w.foot });
        }
        if (time >= w.okAt) {
          for (const p of prints) {
            if (p.who === who || time - p.t < ARM) continue;
            if (dist(p.x, p.y, f.x, f.y + 12) < TOUCH) { charge(who, f, time); break; }
          }
        }
      }
      while (prints.length && time - prints[0].t > LIFE) prints.shift();
      // The Drift.
      if (driftStart < 0 && time >= driftAt) {
        driftStart = time + DRIFT_WARN;
        driftDir = ctx.rng() < 0.5 ? 1 : -1;
        ctx.banner('THE DRIFT', '#d6b47a');
        ctx.sfx('gust');
      }
      if (driftStart >= 0 && time >= driftStart) {
        const x = driftX(time);
        for (let i = prints.length - 1; i >= 0; i--) {
          const p = prints[i];
          if (p.t < driftStart && (driftDir > 0 ? p.x < x : p.x > x)) prints.splice(i, 1);
        }
        if (x < -80 || x > W + 80) { driftStart = -1; driftAt = time + DRIFT_EVERY; }
      }
    },

    npcSeek() {
      // Run ahead of the challenger and lay a line across where they are going.
      const p = ctx.player, n = ctx.npc, w = walkers.player;
      const sp = Math.hypot(w.vx, w.vy);
      if (sp < 30) {
        // Standing still: ring them.
        const a = Math.atan2(n.y - p.y, n.x - p.x) + 0.9;
        return { x: clamp(p.x + Math.cos(a) * 170, 50, W - 50), y: clamp(p.y + Math.sin(a) * 140, top + 40, H - 40) };
      }
      const ux = w.vx / sp, uy = w.vy / sp;
      const side = (n.x - p.x) * -uy + (n.y - p.y) * ux >= 0 ? 1 : -1;
      return { x: clamp(p.x + ux * 170 - uy * side * 70, 50, W - 50), y: clamp(p.y + uy * 170 + ux * side * 70, top + 40, H - 40) };
    },

    drawGround(g, time) {
      // The dust: fixed ripple lines across the floor.
      for (let i = 0; i < 26; i++) {
        const y = top + 20 + ((i * 97) % (H - top - 30)), x = (i * 173) % W;
        g.lineStyle(1, SANDSTONE, 0.08);
        g.beginPath(); g.arc(x, y + 30, 60, Math.PI * 1.2, Math.PI * 1.8, false); g.strokePath();
      }
      for (const p of prints) footprint(g, p, time, LIFE, ARM);
      // The drift: a bank of dust rolling across, banking at its edge before it comes.
      if (driftStart >= 0) {
        const pre = time < driftStart;
        const x = pre ? (driftDir > 0 ? 0 : W) : driftX(time);
        const k = pre ? 1 - (driftStart - time) / DRIFT_WARN : 1;
        for (let i = 0; i < 16; i++) {
          const y = top + 20 + i * ((H - top - 20) / 15);
          const wob = Math.sin(time / 160 + i) * 14;
          g.fillStyle(SANDSTONE, (pre ? 0.12 * k : 0.28));
          g.fillEllipse(x - driftDir * 30 + wob, y, 120 * (pre ? k : 1), 46);
          g.fillStyle(lit(SANDSTONE, 0.3), pre ? 0.08 * k : 0.2);
          g.fillEllipse(x + wob, y, 50, 22);
        }
      }
    },

    drawAir(g, time) {
      // Held for trespass: dust coiling up round the legs.
      for (const who of WHO) {
        const f = fighter(who), w = walkers[who];
        const k = (time - w.heldAt) / 520;
        if (k < 0 || k > 1) continue;
        for (let i = 0; i < 3; i++) {
          g.lineStyle(2.4, OCHRE_LIT, 0.8 * (1 - k));
          g.strokeEllipse(f.x, f.y + 14 - i * 7, 40 - i * 6, 12 - i * 2);
        }
      }
    },
  };
};

/** One print: a sole and three toes, rotated to the heading — bone for the challenger, ochre for the Seat. */
function footprint(g: G, p: Print, time: number, life: number, arm: number): void {
  const age = time - p.t;
  const armed = age >= arm;
  const fade = clamp((life - age) / 600, 0, 1);
  const col = p.who === 'player' ? BONE : OCHRE;
  const ca = Math.cos(p.a), sa = Math.sin(p.a);
  const at = (fx: number, fy: number) => ({ x: p.x + ca * fx - sa * fy, y: p.y + sa * fx + ca * fy });
  if (armed) { g.fillStyle(p.who === 'player' ? BONE : OBS.seam, 0.12 * fade); g.fillCircle(p.x, p.y, 11); }
  const heel = at(-4, 0), ball = at(3, 0);
  g.fillStyle(dim(col, 0.5), (armed ? 0.75 : 0.35) * fade);
  g.fillCircle(heel.x, heel.y, 3.2);
  g.fillCircle(ball.x, ball.y, 3.8);
  g.fillStyle(lit(col, armed ? 0.25 : 0), (armed ? 0.85 : 0.4) * fade);
  for (let i = -1; i <= 1; i++) { const t = at(7.5, i * 2.4); g.fillCircle(t.x, t.y, 1.2); }
}

export const DECREE_TRESPASS: GimmickDef = {
  id: 'bench-earth-trespass',
  rules: 'Every step leaves a print. Tread the other party\'s fresh prints and you are held and charged. A dash or a jump leaves none and crosses free.',
  make,
};
