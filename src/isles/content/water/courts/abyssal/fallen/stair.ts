import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { ABY, alive, clamp, dist } from '../palette';

/**
 * Down the Spiral Stair — Stairwarden Eddo's fight (the man who walked the families down).
 *
 * The arena is the head of the maelstrom stair. The whole floor turns: a current carries every
 * fighter round the eye and draws them slowly in. At the eye, the stair goes down — linger there
 * and you are **taken a step down**: struck, held, and thrown back up the spiral. Stone **steps**
 * ride the current in a spiral arm, and anyone standing on a step is out of the water — the
 * current does not move them. So the fight is a dance from step to step as the arm turns.
 *
 * Every so often **the stair turns**: the current reverses and surges outward, and the bubble
 * wall at the arena's edge is the cold sea — be out of the outer ring, or on a step, when it
 * comes.
 *
 * The exploit is the steps themselves: strike a step and it tips into the eye — and whoever
 * stood on it goes down with it. Eddo stands on steps. Knock them out from under him.
 *
 * Halfway **the stair goes deeper**: fewer steps, a stronger current.
 */

const ID = fallenId('abyssal', 'stair');
const EYE_R = 60;
const DESCENT_S = 0.9;
const TAKE_DMG = 20;
const STEP_R = 34;
const SURGE_EVERY = 10500;
const SURGE_WARN = 1300;
const SURGE_MS = 2600;
const WALL_BAND = 46;
const WALL_DMG = 7;
const STEP_DOWN_MS = 5200;

type G = Parameters<NonNullable<EncounterGimmick['drawGround']>>[0];

interface Step { i: number; x: number; y: number; ang: number; rad: number; downAt: number; target: StrikeTarget | null }

export const STAIR: GimmickDef = {
  id: ID,
  rules: 'The floor turns round the eye and draws you in; linger at the eye and you are taken down. Steps stand out of it — strike one to drop whoever is on it.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    const C = { x: W / 2, y: top + (H - top) / 2 };
    const N = 8;
    const steps: Step[] = Array.from({ length: N }, (_, i) => ({ i, x: C.x, y: C.y, ang: 0, rad: 0, downAt: -99999, target: null }));
    const descent = new Map<Fighter, number>([[ctx.player, 0], [ctx.npc, 0]]);
    const wallAt = new Map<Fighter, number>([[ctx.player, 0], [ctx.npc, 0]]);
    let spin = 0;
    let now = 0;
    let surgeAt = -1;
    let deeper = false;
    const takenAt = new Map<Fighter, number>();

    const live = (s: Step): boolean => now - s.downAt >= STEP_DOWN_MS && (!deeper || s.i % 2 === 0 || s.i === 1);
    const stepUnder = (f: Fighter): Step | null => steps.find((s) => live(s) && dist(f.x, f.y, s.x, s.y) < STEP_R + 4) ?? null;
    const surging = (): boolean => surgeAt > 0 && now >= surgeAt && now < surgeAt + SURGE_MS;
    const surgeWarn = (): boolean => surgeAt > 0 && now >= surgeAt - SURGE_WARN && now < surgeAt;
    const nearWall = (f: Fighter): boolean => f.x < WALL_BAND || f.x > W - WALL_BAND || f.y < top + WALL_BAND || f.y > H - WALL_BAND;

    const takeDown = (f: Fighter): void => {
      if (!alive(f)) return;
      descent.set(f, 0);
      takenAt.set(f, now);
      ctx.hit(f, TAKE_DMG, f.x, f.y);
      ctx.root(f, 500);
      ctx.sfx('gravity-slam');
      ctx.flash(C.x, C.y, ABY.membraneDim);
      ctx.tk.schedule(520, () => {
        if (!alive(f)) return;
        const a = Math.atan2(f.y - C.y, f.x - C.x) + 0.4;
        ctx.nudge(f, C.x + Math.cos(a) * 230 - f.x, C.y + Math.sin(a) * 180 - f.y);
        ctx.sfx('geyser');
      });
    };

    const place = (): void => {
      for (const s of steps) {
        s.rad = 96 + s.i * 24;
        s.ang = spin + s.i * 0.78;
        s.x = C.x + Math.cos(s.ang) * s.rad;
        s.y = C.y + Math.sin(s.ang) * s.rad * 0.78;
        if (live(s)) {
          if (!s.target) {
            s.target = ctx.target({
              x: s.x, y: s.y, r: 22,
              onStruck: (by) => {
                if (!live(s)) return;
                const victim = by === 'player' ? ctx.npc : ctx.player;
                const on = dist(victim.x, victim.y, s.x, s.y) < STEP_R + 4;
                s.downAt = now;
                s.target?.remove(); s.target = null;
                ctx.sfx('stone-slam');
                if (on) { ctx.nudge(victim, C.x - victim.x, C.y - victim.y); takeDown(victim); }
              },
            });
          } else s.target.moveTo(s.x, s.y);
        } else if (s.target) { s.target.remove(); s.target = null; }
      }
    };
    place();

    return {
      update(time: number, dtIn: number) {
        const dt = Math.min(0.05, dtIn);
        now = time;
        if (surgeAt < 0) surgeAt = time + SURGE_EVERY;
        if (!deeper && ctx.npc.hp <= ctx.npc.maxHp * 0.5) {
          deeper = true;
          ctx.banner('THE STAIR GOES DEEPER', '#9fe4ff');
          ctx.sfx('tornado');
        }
        if (time >= surgeAt - SURGE_WARN && time - dt * 1000 < surgeAt - SURGE_WARN) { ctx.sfx('beam-charge'); }
        if (time >= surgeAt + SURGE_MS) surgeAt = time + SURGE_EVERY;
        spin += dt * (surging() ? -0.5 : 0.32);
        place();
        const power = deeper ? 1.3 : 1;
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f) || ctx.isAirborne(f)) continue;
          const dx = f.x - C.x, dy = f.y - C.y;
          const r = Math.hypot(dx, dy) || 1;
          const ux = dx / r, uy = dy / r;
          if (!stepUnder(f)) {
            const vt = 78 * power * clamp(r / 140, 0.45, 1) * (surging() ? -0.6 : 1);
            const vr = surging() ? 95 : -30 * power;
            ctx.nudge(f, (-uy * vt + ux * vr) * dt, (ux * vt + uy * vr) * dt);
          }
          let d = descent.get(f) ?? 0;
          d = r < EYE_R ? d + dt : Math.max(0, d - dt * 2);
          descent.set(f, d);
          if (d >= DESCENT_S) takeDown(f);
          if (surging() && nearWall(f) && !stepUnder(f) && time >= (wallAt.get(f) ?? 0)) {
            wallAt.set(f, time + 500);
            ctx.hit(f, WALL_DMG, f.x, f.y);
            if (f === ctx.player) ctx.sfx('status-freeze');
          }
        }
      },

      npcSeek() {
        const n = ctx.npc, p = ctx.player;
        const pStep = stepUnder(p);
        if (pStep && dist(n.x, n.y, pStep.x, pStep.y) < 280) return { x: pStep.x + (n.x < pStep.x ? -30 : 30), y: pStep.y };
        if (stepUnder(n) && !surgeWarn()) return null;
        let best: Step | null = null;
        for (const s of steps) {
          if (!live(s)) continue;
          if (!best || dist(n.x, n.y, s.x, s.y) < dist(n.x, n.y, best.x, best.y)) best = s;
        }
        if (best) return { x: best.x, y: best.y };
        const a = Math.atan2(n.y - C.y, n.x - C.x);
        return { x: C.x + Math.cos(a) * 200, y: C.y + Math.sin(a) * 160 };
      },

      drawGround(g, time) {
        const t = time / 1000;
        // The water of the stairhead, deepening toward the eye.
        for (let k = 6; k >= 1; k--) {
          g.fillStyle(mixC(ABY.deepMid, ABY.abyss, 1 - k / 6), 0.22);
          g.fillEllipse(C.x, C.y, k * 120, k * 94);
        }
        // Spiral arms of current — they run the other way while the stair turns.
        const dir = surging() ? -1 : 1;
        for (let arm = 0; arm < 5; arm++) {
          g.lineStyle(2, surgeWarn() || surging() ? ABY.coralRose : ABY.membrane, 0.22);
          g.beginPath();
          for (let i = 0; i <= 30; i++) {
            const r = EYE_R + i * 10;
            const a = spin * 2.2 * dir + arm * (Math.PI * 2 / 5) + Math.log(r / EYE_R) * 1.6;
            const px = C.x + Math.cos(a) * r, py = C.y + Math.sin(a) * r * 0.78;
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.strokePath();
        }
        // Foam flecks riding the current.
        for (let i = 0; i < 36; i++) {
          const r = EYE_R + ((i * 37) % 300);
          const a = i * 2.4 + (t * 90 * dir) / r;
          g.fillStyle(0xe8f6ff, 0.35); g.fillCircle(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r * 0.78, 1.5);
        }
        // The eye: the stair going down into the dark, lip below lip.
        for (let k = 0; k < 6; k++) {
          const rr = EYE_R * (1 - k * 0.15);
          g.fillStyle(mixC(ABY.siltMid, ABY.abyss, k / 5), 1); g.fillEllipse(C.x, C.y + k * 2, rr * 2, rr * 1.56);
          g.lineStyle(2, ABY.siltPale, 0.5 - k * 0.07);
          g.beginPath(); g.arc(C.x, C.y + k * 2, rr, Math.PI * 1.05 + k * 0.4 + spin, Math.PI * 1.75 + k * 0.4 + spin, false); g.strokePath();
        }
        g.fillStyle(ABY.lure, 0.5 + Math.sin(t * 2) * 0.2); g.fillCircle(C.x + 4, C.y + 12, 2);
        // The wall ring: the cold sea, glowing as the surge comes.
        if (surgeWarn() || surging()) {
          const a = surging() ? 0.3 : 0.3 * (1 - (surgeAt - now) / SURGE_WARN);
          g.fillStyle(ABY.membraneDim, a);
          g.fillRect(0, top, W, WALL_BAND); g.fillRect(0, H - WALL_BAND, W, WALL_BAND);
          g.fillRect(0, top + WALL_BAND, WALL_BAND, H - top - WALL_BAND * 2); g.fillRect(W - WALL_BAND, top + WALL_BAND, WALL_BAND, H - top - WALL_BAND * 2);
          g.lineStyle(2, ABY.membrane, a * 2); g.strokeRect(WALL_BAND, top + WALL_BAND, W - WALL_BAND * 2, H - top - WALL_BAND * 2);
        }
        for (const s of steps) {
          if (live(s)) drawStep(g, s, t);
          else if (now - s.downAt < 700) {
            // Tipping into the eye: the slab slides down the spiral, shrinking.
            const k = (now - s.downAt) / 700;
            const x = s.x + (C.x - s.x) * k, y = s.y + (C.y - s.y) * k;
            g.fillStyle(ABY.boneDark, 1 - k); g.fillEllipse(x, y, 60 * (1 - k * 0.7), 26 * (1 - k * 0.7));
          }
        }
      },

      drawAir(g, time) {
        for (const f of [ctx.player, ctx.npc]) {
          const d = descent.get(f) ?? 0;
          if (d > 0) {
            // The pull of the eye: rings closing round their feet.
            const k = d / DESCENT_S;
            g.lineStyle(3, ABY.coralRose, 0.4 + 0.5 * k); g.strokeCircle(f.x, f.y + 6, 30 * (1 - k) + 8);
          }
          const ta = takenAt.get(f);
          if (ta !== undefined && time - ta < 520) {
            const k = (time - ta) / 520;
            g.fillStyle(ABY.abyss, 0.6 * (1 - k)); g.fillEllipse(f.x, f.y + 8, 60, 24);
            g.lineStyle(2, ABY.membrane, 1 - k); g.strokeEllipse(f.x, f.y + 8, 60 * (1 - k), 24 * (1 - k));
          }
        }
      },

      drawHud(g) {
        // The turning clock: a ring that fills toward the surge, and each fighter's step-down pips.
        const cx = W / 2, y = top + 18;
        const k = surging() ? 1 : clamp(1 - (surgeAt - now) / SURGE_EVERY, 0, 1);
        g.fillStyle(0x000000, 0.55); g.fillCircle(cx, y, 14);
        g.lineStyle(4, surgeWarn() || surging() ? ABY.coralRose : ABY.membrane, 1);
        g.beginPath(); g.arc(cx, y, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
        g.lineStyle(1.5, 0xe8e0c8, 1);
        g.beginPath(); for (let i = 0; i <= 12; i++) { const r = i * 0.6, a = i * 0.7; const px = cx + Math.cos(a) * r, py = y + Math.sin(a) * r; if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); } g.strokePath();
        const pips = (x0: number, f: Fighter): void => {
          const d = (descent.get(f) ?? 0) / DESCENT_S;
          for (let i = 0; i < 5; i++) {
            g.fillStyle(d * 5 > i ? ABY.coralRose : 0x223040, 1);
            g.fillRect(x0 + i * 9, y - 3, 7, 6);
          }
        };
        pips(cx - 70, ctx.player);
        pips(cx + 26, ctx.npc);
      },

      destroy() { for (const s of steps) s.target?.remove(); descent.clear(); },
    };
  },
};

/** One stair tread: a worn slab of carved stone, barnacled at the edge, with a lantern on its outer lip. */
function drawStep(g: G, s: Step, t: number): void {
  const { x, y } = s;
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x + 3, y + 8, 70, 26);
  g.fillStyle(ABY.boneShadow, 1); g.fillEllipse(x, y + 4, 68, 26);
  g.fillStyle(ABY.siltPale, 1); g.fillEllipse(x, y, 66, 24);
  g.fillStyle(mixC(ABY.siltPale, 0xffffff, 0.18), 1); g.fillEllipse(x - 4, y - 3, 48, 14);
  // Worn hollow where feet have gone down it for years.
  g.fillStyle(ABY.siltLit, 1); g.fillEllipse(x + 4, y + 1, 22, 8);
  g.lineStyle(1, ABY.siltMid, 0.9);
  g.lineBetween(x - 22, y - 2, x - 10, y + 4); g.lineBetween(x - 10, y + 4, x - 4, y + 2);
  // Barnacles round the lip.
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 0.15 + i * 0.22;
    g.fillStyle(0xd8d0c0, 1); g.fillCircle(x + Math.cos(a) * 30, y + Math.sin(a) * 11, 2);
    g.fillStyle(0x3a3a3a, 1); g.fillCircle(x + Math.cos(a) * 30, y + Math.sin(a) * 11, 0.8);
  }
  // A small lantern on a bone post at the outer edge.
  const lx = x + Math.cos(s.ang) * 26, ly = y + Math.sin(s.ang) * 9;
  g.lineStyle(2, ABY.boneMid, 1); g.lineBetween(lx, ly, lx, ly - 22);
  g.fillStyle(ABY.lure, 0.15); g.fillCircle(lx, ly - 24, 9);
  g.fillStyle(ABY.lure, 0.9 + Math.sin(t * 4 + s.i) * 0.1); g.fillCircle(lx, ly - 24, 3);
  g.lineStyle(1, ABY.brassDark, 1); g.strokeRect(lx - 3.5, ly - 28, 7, 8);
}
