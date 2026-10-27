import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { Clock, S, SCOL, alive, clamp, dist, drawCloud, jit } from '../util';

/**
 * EYE OF THE STORM — Stormchaser Cyra.
 *
 * The yard is a storm with a hole in it. A circle of calm — blue sky reflected in the wet setts —
 * drifts slowly about, and everything outside it is gale: rain driven sideways, shingles and
 * buckets tumbling past, the whole storm turning round the middle of the yard.
 * • **Outside the eye** you are battered (a little damage every half second) and *carried* —
 *   shoved round the yard with the wind, and slowed against it.
 * • **Inside** it is calm, and a blow struck from the calm into the storm lands harder.
 * Every so often the storm *shifts*: a ghost of the eye appears somewhere else, a trail of
 * cloud-wisps runs toward it, and a moment later the eye slides there faster than anyone can walk.
 * Read the ghost and be there first.
 *
 * Cyra has chased storms all her life. The gale hurts her less, and she always knows where the eye
 * is going — beat her to it, and leave her out in the wind.
 */

type Side = 'player' | 'npc';

interface Debris { a: number; r: number; spin: number; kind: number; seed: number }

const TICK_MS = 550;
const CARRY = 92;
const SHIFT_EVERY = 11000;
const SLIDE_SPEED = 320;

export const EYE_OF_THE_STORM: GimmickDef = {
  id: 'stormeye-eye',
  rules: 'Only the drifting eye is calm. Outside it you are battered, slowed and carried round the yard; strike from the calm into the storm for +20%. When a ghost eye appears, the storm is about to shift there — get there first.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const cx = W / 2, cy = top + (H - top) / 2;
    const R = ctx.hard ? 140 : 160;
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    let now = 0;
    let t0 = -1;
    // The eye is an anchor plus a slow drift; a shift moves the anchor.
    let ax = cx, ay = cy;
    let tx = cx, ty = cy;
    let ghostFrom = -1, slideAt = -1, nextShift = -1;
    let ex = cx, ey = cy;
    const acc: Record<Side, number> = { player: 0, npc: 0 };
    const debris: Debris[] = Array.from({ length: 14 }, (_, i) => ({ a: rng() * Math.PI * 2, r: 200 + rng() * 300, spin: rng() * 6, kind: i % 4, seed: rng() * 50 }));
    const tickDmg = ctx.hard ? 4 : 3;

    const inEye = (f: Fighter): boolean => dist(f.x, f.y, ex, ey) < R;
    const eyeAt = (time: number, bx: number, by: number): Pt => {
      const s = (time - t0) / 1000;
      return {
        x: clamp(bx + Math.sin(s * 0.5) * 110, R + 50, W - R - 50),
        y: clamp(by + Math.sin(s * 0.7 + 1) * 60, top + R * 0.8, H - R * 0.8),
      };
    };
    const pickTarget = (): void => {
      // Somewhere across the yard from where the eye is now — never a short hop.
      for (let k = 0; k < 10; k++) {
        const x = R + 80 + rng() * (W - 2 * R - 160), y = top + R + rng() * Math.max(1, H - top - 2 * R);
        if (dist(x, y, ax, ay) > 300 || k === 9) { tx = x; ty = y; return; }
      }
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (t0 < 0) { t0 = time; nextShift = time + 7000; }
        if (dt === 0) return;
        // The shift: a ghost first, then the slide.
        if (ghostFrom < 0 && time >= nextShift) {
          pickTarget();
          ghostFrom = time; slideAt = time + ctx.tk.warn(2200);
          ctx.sfx('tornado');
          ctx.banner('THE STORM SHIFTS', '#a8d8ff');
        }
        if (ghostFrom >= 0 && time >= slideAt) {
          const d = dist(ax, ay, tx, ty);
          const step = SLIDE_SPEED * dt;
          if (d <= step) { ax = tx; ay = ty; ghostFrom = -1; slideAt = -1; nextShift = time + SHIFT_EVERY * (ctx.hard ? 0.8 : 1); }
          else { ax += ((tx - ax) / d) * step; ay += ((ty - ay) / d) * step; }
        }
        const e = eyeAt(time, ax, ay);
        ex = e.x; ey = e.y;

        for (const s of ['player', 'npc'] as Side[]) {
          const f = fighterOf(s);
          if (!alive(f)) continue;
          if (inEye(f)) { acc[s] = 0; continue; }
          // Carried round the middle of the yard, anticlockwise, harder the further out.
          const a = Math.atan2(f.y - cy, f.x - cx);
          const k = clamp(dist(f.x, f.y, cx, cy) / 300, 0.5, 1.2);
          const carry = CARRY * k * (s === 'npc' ? 0.7 : 1);
          ctx.nudge(f, Math.sin(a) * carry * dt, -Math.cos(a) * carry * dt);
          acc[s] += dt * 1000;
          if (acc[s] >= TICK_MS) {
            acc[s] -= TICK_MS;
            // Cyra rides it: half the battering.
            const n = s === 'npc' ? Math.max(1, Math.round(tickDmg / 2)) : tickDmg;
            ctx.hit(f, n, f.x, f.y);
            if (s === 'player' && Math.floor(time / TICK_MS) % 4 === 0) ctx.float(f.x, f.y - 50, 'BATTERED — FIND THE EYE', SCOL.rain);
          }
        }
        for (const d of debris) { d.a -= dt * (90 / d.r) * 2.2; d.spin += dt * 5; }
      },

      playerSpeedMult: () => (alive(ctx.player) && !inEye(ctx.player) ? 0.82 : 1),
      npcSpeedMult: () => (alive(ctx.npc) && !inEye(ctx.npc) ? 0.9 : 1),
      npcTakenMult: () => (alive(ctx.player) && alive(ctx.npc) && inEye(ctx.player) && !inEye(ctx.npc) ? 1.2 : 1),
      playerTakenMult: () => (alive(ctx.player) && alive(ctx.npc) && inEye(ctx.npc) && !inEye(ctx.player) ? 1.2 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc;
        // She knows where it is going: once the ghost shows, she heads for it.
        if (ghostFrom >= 0) return { x: tx, y: ty };
        if (!inEye(n)) return { x: ex, y: ey };
        // In the calm she keeps to the side nearer you, ready to strike out of it.
        const p = ctx.player;
        const a = Math.atan2(p.y - ey, p.x - ex);
        return { x: ex + Math.cos(a) * R * 0.5, y: ey + Math.sin(a) * R * 0.5 };
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // The storm: everything outside the eye darkened, with rain driven round in arcs.
        g.lineStyle(1400, S.galeDark, 0.42); g.strokeCircle(ex, ey, R + 700);
        g.lineStyle(60, S.galeDark, 0.25); g.strokeCircle(ex, ey, R + 30);
        for (let i = 0; i < 90; i++) {
          const rr = 80 + jit(1, i) * 560;
          const a = jit(2, i) * Math.PI * 2 - (time / 1000) * (260 / rr);
          const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.62;
          if (x < 0 || x > W || y < top || y > H || dist(x, y, ex, ey) < R) continue;
          const b = a - 0.12;
          g.lineStyle(1.2, S.rain, 0.35); g.lineBetween(x, y, cx + Math.cos(b) * rr, cy + Math.sin(b) * rr * 0.62);
        }
        // The eye's floor: clear sky in the puddles, and the wall of cloud standing round it.
        g.fillStyle(S.eye, 0.13); g.fillCircle(ex, ey, R);
        g.fillStyle(S.eyeLit, 0.08); g.fillCircle(ex - R * 0.25, ey - R * 0.2, R * 0.5);
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * Math.PI * 2 - time / 1400;
          g.fillStyle(i % 2 ? S.cloudLit : S.cloud, 0.55); g.fillCircle(ex + Math.cos(a) * R, ey + Math.sin(a) * R, 16 + Math.sin(time / 300 + i) * 4);
        }
        g.lineStyle(3, S.eyeLit, 0.6); g.strokeCircle(ex, ey, R - 6);
        // The ghost of the next eye, and the wisps running toward it.
        if (ghostFrom >= 0) {
          const k = clamp((time - ghostFrom) / (slideAt - ghostFrom), 0, 1);
          const dashes = 24;
          for (let i = 0; i < dashes; i++) {
            const a0 = (i / dashes) * Math.PI * 2 + time / 900, a1 = a0 + Math.PI / dashes;
            g.lineStyle(3, S.eyeLit, 0.3 + k * 0.5);
            g.beginPath(); g.arc(tx, ty, R, a0, a1, false); g.strokePath();
          }
          g.fillStyle(S.eye, 0.05 + k * 0.1); g.fillCircle(tx, ty, R);
          for (let i = 0; i < 8; i++) {
            const u = ((time / 700) + i / 8) % 1;
            g.fillStyle(S.cloudLit, 0.5 * (1 - u)); g.fillCircle(ex + (tx - ex) * u, ey + (ty - ey) * u, 6 + u * 6);
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        // Debris carried round the yard: a shingle, a bucket, a torn shutter, a hat.
        for (const d of debris) {
          const x = cx + Math.cos(d.a) * d.r, y = cy + Math.sin(d.a) * d.r * 0.62 - 20 - Math.sin(d.spin * 0.7) * 10;
          if (x < -20 || x > W + 20 || y < top - 20 || y > H + 20 || dist(x, y, ex, ey) < R) continue;
          const c = Math.cos(d.spin), s = Math.sin(d.spin);
          if (d.kind === 0) { g.fillStyle(S.slateDark, 0.9); g.fillTriangle(x - c * 8, y - s * 8, x + c * 8, y + s * 8, x - s * 5, y + c * 5); }
          else if (d.kind === 1) { g.fillStyle(S.timber, 0.9); g.fillRect(x - 5, y - 6, 10, 10); g.fillStyle(S.slateDark, 1); g.fillRect(x - 6, y - 3, 12, 2); }
          else if (d.kind === 2) { g.lineStyle(4, 0x3a4048, 0.9); g.lineBetween(x - c * 12, y - s * 12, x + c * 12, y + s * 12); }
          else { g.fillStyle(S.oilskin, 0.9); g.fillEllipse(x, y, 14 * Math.abs(c) + 4, 8); }
          g.lineStyle(1, S.rain, 0.4); g.lineBetween(x + 6, y + 2, x + 24, y + 6);
        }
        // A shred of cloud sweeping across the top of the yard, against the turning.
        drawCloud(g, (W + 200) - ((time / 30) % (W + 400)), top + 18, 44, 0.35, S.cloudDark, 3);
        // Anyone out in the storm leans into it, wet streaks streaming off them.
        for (const s of ['player', 'npc'] as Side[]) {
          const f = fighterOf(s);
          if (!alive(f) || inEye(f)) continue;
          // Downwind is a quarter-turn back from the radius (the storm turns anticlockwise).
          const a = Math.atan2(f.y - cy, f.x - cx) - Math.PI / 2;
          for (let i = 0; i < 4; i++) {
            const ph = (time / 300 + i / 4) % 1;
            g.lineStyle(1.5, S.rain, 0.5 * (1 - ph));
            const ox = f.x + Math.cos(a) * (14 + ph * 30), oy = f.y - 10 + i * 6 + Math.sin(a) * (14 + ph * 30);
            g.lineBetween(ox, oy, ox + Math.cos(a) * 10, oy + Math.sin(a) * 10);
          }
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // Bottom-left: a little barometer face — needle at FAIR inside the eye, at STORMY out of it.
        const inside = alive(ctx.player) && inEye(ctx.player);
        const x = 44, y = H - 44;
        g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 30);
        g.fillStyle(S.brass, 1); g.fillCircle(x, y, 26);
        g.fillStyle(0xf0e8d0, 1); g.fillCircle(x, y, 21);
        g.lineStyle(5, S.galeLit, 1); g.beginPath(); g.arc(x, y, 15, Math.PI * 0.8, Math.PI * 1.3, false); g.strokePath();
        g.lineStyle(5, S.eye, 1); g.beginPath(); g.arc(x, y, 15, Math.PI * 1.7, Math.PI * 2.2, false); g.strokePath();
        const target = inside ? Math.PI * 1.95 : Math.PI * 1.05;
        const a = target + Math.sin(time / 90) * (inside ? 0.02 : 0.12);
        g.lineStyle(2.5, S.red, 1); g.lineBetween(x, y, x + Math.cos(a) * 18, y + Math.sin(a) * 18);
        g.fillStyle(S.brassDark, 1); g.fillCircle(x, y, 3);
        // Rain streaking across the screen while you are out in it.
        if (!inside && alive(ctx.player)) {
          for (let i = 0; i < 24; i++) {
            const yy = top + ((jit(7, i) * (H - top) + time * 0.5) % (H - top));
            const xx = (jit(8, i) * W + time * 0.9) % W;
            g.lineStyle(1, S.rain, 0.3); g.lineBetween(xx, yy, xx + 18, yy + 6);
          }
        }
      },
    };
  },
};
