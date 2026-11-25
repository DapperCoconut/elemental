import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { fallenId } from '../../../../meteor/spec';
import { Clock, S, alive, clamp, jit } from '../util';

/**
 * DOWN A COURSE — Orrin Stack, Wall-Mason (clay).
 *
 * Stormeye's forecast is a ledger: a street in arrears is "named for weather", and that night the
 * wall behind it comes down a course so the gale can walk in. In the star's telling the man who
 * takes it down is the court's own wall-mason. The yard's north side is that wall — eight sections
 * of granite, four courses high — with the gale roaring past behind it.
 *
 * Every few seconds Stack chalks a section (a white tally on its top course). When the chalk is
 * done he knocks the course out, and from then on that section breathes the gale: in gusts, a stream
 * of wind pours over the gap and down its lane of the yard, shoving everyone in it south and
 * battering them — harder the lower the wall stands. Spray curling over the gap warns of each gust.
 *
 * The exploit: STRIKE a chalked course before he knocks it and it is shored from the wrong side —
 * the block teeters and falls inward, tumbling down its own lane and flattening whoever stands in it.
 * Shore the course above the mason. Past half, the gale carries the rubble: each gust that starts
 * in a breach throws stones down its lane at whoever is in the way.
 */

type Side = 'player' | 'npc';

interface Section {
  i: number;
  x: number;
  courses: number;
  /** When the chalk was begun (-1 = none) and when the knock lands. */
  chalkAt: number;
  knockAt: number;
  target: StrikeTarget | null;
  phase: number;
  wasGusting: boolean;
}

interface Block { x: number; y: number; vy: number; spin: number; startAt: number; hit: Record<Side, boolean>; seed: number }

const SECTIONS = 8;
const COURSES = 4;
const WALL_H = 58;
const LANE_HALF = 60;
const BLOCK_HALF = 34;
const GUST_CYCLE = 3600;
const GUST_ON = 2000;

export const FALLEN_COURSE: GimmickDef = {
  id: fallenId('stormeye', 'course'),
  rules: 'The mason chalks a course, then knocks it out and the gale gusts down that lane. Strike a chalked course to tip it inward down its lane.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const secW = W / SECTIONS;
    const wallBase = top + WALL_H;
    const sections: Section[] = Array.from({ length: SECTIONS }, (_, i) => ({
      i, x: secW * (i + 0.5), courses: COURSES, chalkAt: -1, knockAt: -1, target: null, phase: (i * 450 + 900) % GUST_CYCLE, wasGusting: false,
    }));
    const blocks: Block[] = [];
    const chalkMs = ctx.tk.warn(1700);
    let now = 0;
    let nextChalk = -1;
    let turn = 0;
    let tickAt = 0;
    let rubble = false;

    const missing = (s: Section): number => COURSES - s.courses;
    const gustPhase = (s: Section, time: number): number => (time + s.phase) % GUST_CYCLE;
    const gusting = (s: Section, time: number): boolean => missing(s) > 0 && gustPhase(s, time) < GUST_ON;
    /** 0..1 over the last 700 ms before a gust, while the spray gathers on the gap. */
    const gathering = (s: Section, time: number): number => {
      if (missing(s) === 0) return 0;
      const p = gustPhase(s, time);
      return p > GUST_CYCLE - 700 ? (p - (GUST_CYCLE - 700)) / 700 : 0;
    };
    const laneOf = (x: number): Section => sections[clamp(Math.floor(x / secW), 0, SECTIONS - 1)];

    const tip = (s: Section, by: Side): void => {
      if (s.chalkAt < 0) return;
      s.chalkAt = -1; s.knockAt = -1;
      s.target?.remove(); s.target = null;
      blocks.push({ x: s.x, y: wallBase - 10, vy: 0, spin: 0, startAt: now + 420, hit: { player: false, npc: false }, seed: rng() * 100 });
      ctx.sfx('stone-slam');
      ctx.flash(s.x, wallBase - 20, S.granite);
      if (by === 'player') ctx.float(s.x, wallBase + 20, 'SHORED WRONG', '#e4e8f0');
    };

    const chalk = (): void => {
      // In turn: the section over you, then over himself, then the tallest still standing.
      const who = turn % 3;
      turn++;
      let pick: Section;
      if (who === 0) pick = laneOf(ctx.player.x);
      else if (who === 1) pick = laneOf(ctx.npc.x);
      else pick = sections.slice().sort((a, b) => b.courses - a.courses || rng() - 0.5)[0];
      if (pick.courses <= 1 || pick.chalkAt >= 0) {
        const open = sections.filter((s) => s.courses > 1 && s.chalkAt < 0);
        if (!open.length) return;
        pick = open[Math.floor(rng() * open.length)];
      }
      const s = pick;
      s.chalkAt = now; s.knockAt = now + chalkMs;
      s.target = ctx.target({ x: s.x, y: wallBase - 14 - (s.courses - 1) * 12, r: 26, onStruck: (by) => tip(s, by) });
      ctx.sfx('trap-set');
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (nextChalk < 0) { nextChalk = time + 1800; tickAt = time + 500; }
        if (dt === 0) return;
        if (!rubble && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          rubble = true;
          ctx.banner('The gale carries the rubble now', '#c8d0e0');
          ctx.sfx('quake');
        }
        if (time >= nextChalk) { chalk(); nextChalk = time + (rubble ? 3500 : 4400); }

        for (const s of sections) {
          if (s.knockAt > 0 && time >= s.knockAt) {
            s.courses = Math.max(1, s.courses - 1);
            s.chalkAt = -1; s.knockAt = -1;
            s.target?.remove(); s.target = null;
            ctx.sfx('rock-throw');
            ctx.flash(s.x, wallBase - 20, S.galeLit);
          }
          const g = gusting(s, time);
          if (g && !s.wasGusting) {
            ctx.sfx('gust');
            if (rubble) {
              for (let k = 0; k < 2; k++) {
                ctx.tk.spawnBullet({ x: s.x + (k - 0.5) * 50, y: wallBase + 6, angle: Math.PI / 2 + (k - 0.5) * 0.12, speed: 250, damage: 7, r: 7, color: S.graniteLit, hits: [ctx.player, ctx.npc], lifeMs: 3000 });
              }
            }
          }
          s.wasGusting = g;
        }

        // The streams: a shove south every frame, a battering on the gimmick's own clock.
        const doTick = time >= tickAt;
        if (doTick) tickAt = time + 500;
        for (const side of ['player', 'npc'] as Side[]) {
          const f = fighterOf(side);
          if (!alive(f)) continue;
          const s = laneOf(f.x);
          if (!gusting(s, time) || Math.abs(f.x - s.x) > LANE_HALF) continue;
          const m = missing(s);
          ctx.nudge(f, 0, (60 + m * 35) * dt);
          if (doTick) ctx.hit(f, 2 + m, f.x, f.y);
        }

        // The tipped blocks: a teeter, then a tumble down the lane.
        for (const b of blocks) {
          if (time < b.startAt) continue;
          b.vy = Math.min(300, b.vy + 900 * dt);
          b.y += b.vy * dt;
          b.spin += dt * 6;
          for (const side of ['player', 'npc'] as Side[]) {
            const f = fighterOf(side);
            if (b.hit[side] || !alive(f)) continue;
            if (Math.abs(f.x - b.x) < BLOCK_HALF + 20 && Math.abs(f.y - b.y) < 30) {
              b.hit[side] = true;
              ctx.hit(f, 18, f.x, f.y);
              ctx.stun(f, 700);
              ctx.sfx('hit-heavy');
            }
          }
        }
        for (let i = blocks.length - 1; i >= 0; i--) if (blocks[i].y > H + 40) blocks.splice(i, 1);
      },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        const here = laneOf(n.x);
        // A tumbling block in his lane: step to the side it is not on.
        const threat = blocks.some((b) => Math.abs(b.x - n.x) < BLOCK_HALF + 40 && b.y < n.y + 20);
        const windy = gusting(here, now) || gathering(here, now) > 0;
        if (!threat && !windy) {
          // A chalked course over the player's lane is worth shoring when he stands close.
          const pl = laneOf(ctx.player.x);
          if (pl.target && pl !== here) return { x: pl.x + (n.x < pl.x ? -LANE_HALF - 30 : LANE_HALF + 30), y: clamp(wallBase + 120, top + 60, H - 60) };
          return null;
        }
        let best: Section | null = null;
        for (const s of sections) {
          if (s === here || gusting(s, now) || gathering(s, now) > 0) continue;
          if (blocks.some((b) => Math.abs(b.x - s.x) < LANE_HALF)) continue;
          if (!best || Math.abs(s.x - n.x) < Math.abs(best.x - n.x)) best = s;
        }
        return best ? { x: best.x, y: clamp(n.y, top + 90, H - 50) } : null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // The streams down the yard: pale wind combed south, wet setts darkened where it lands.
        for (const s of sections) {
          const m = missing(s);
          if (m === 0) continue;
          const gp = gustPhase(s, time);
          const on = gp < GUST_ON;
          const k = on ? Math.min(1, gp / 220, (GUST_ON - gp) / 260) : gathering(s, time) * 0.35;
          if (k <= 0.01) continue;
          g.fillStyle(S.gale, 0.12 * k + m * 0.03); g.fillRect(s.x - LANE_HALF, wallBase, LANE_HALF * 2, H - wallBase);
          for (let i = 0; i < 10 + m * 4; i++) {
            const fx = jit(s.i + 3, i);
            const sp = 0.7 + jit(s.i + 9, i) * 0.6;
            const yy = wallBase + ((jit(s.i + 5, i) * (H - wallBase) + time * 0.5 * sp) % (H - wallBase));
            const xx = s.x - LANE_HALF + 8 + fx * (LANE_HALF * 2 - 16) + Math.sin(time / 260 + i) * 4;
            g.lineStyle(1.5, S.cloudLit, 0.45 * k); g.lineBetween(xx, yy, xx + Math.sin(i) * 3, yy + 26 + m * 6);
          }
          g.lineStyle(1, S.galeLit, 0.3 * k);
          g.lineBetween(s.x - LANE_HALF, wallBase, s.x - LANE_HALF, H); g.lineBetween(s.x + LANE_HALF, wallBase, s.x + LANE_HALF, H);
        }

        // The wall itself: four courses of granite per section, merlons on the top course, gaps
        // where Stack has knocked them out, the purple gale seen through each gap.
        g.fillStyle(S.galeDark, 1); g.fillRect(0, top, W, WALL_H);
        for (let i = 0; i < 14; i++) {
          const x = ((jit(7, i) * W + time * 0.25 * (0.6 + jit(8, i))) % (W + 120)) - 60;
          g.fillStyle(S.gale, 0.6); g.fillEllipse(x, top + 8 + jit(9, i) * 30, 90, 16);
        }
        for (const s of sections) {
          const x0 = s.x - secW / 2;
          for (let c = 0; c < s.courses; c++) {
            const y = wallBase - (c + 1) * 13;
            const off = c % 2 ? secW / 6 : 0;
            for (let b = -1; b < 3; b++) {
              const bx = x0 + off + b * (secW / 3);
              const l = Math.max(x0, bx), r = Math.min(x0 + secW - 1, bx + secW / 3 - 2);
              if (r <= l) continue;
              const tone = jit(s.i * 10 + c, b + 4) < 0.5 ? S.granite : S.graniteDark;
              g.fillStyle(tone, 1); g.fillRect(l, y, r - l, 12);
              g.fillStyle(S.graniteLit, 0.5); g.fillRect(l, y, r - l, 2);
            }
          }
          // Merlons on whatever course is top.
          const ty = wallBase - s.courses * 13;
          for (let m = 0; m < 3; m++) { g.fillStyle(S.granite, 1); g.fillRect(x0 + 6 + m * (secW / 3), ty - 8, secW / 3 - 18, 8); }
          // Moss in the lee, and verdigris streaks off the copper flashing.
          g.fillStyle(S.moss, 0.6); g.fillRect(x0 + 4, wallBase - 4, secW - 8, 4);
          // The chalk: a mason's tally, drawn stroke by stroke, and the crowbar's bite growing.
          if (s.chalkAt >= 0) {
            const k = clamp((time - s.chalkAt) / (s.knockAt - s.chalkAt), 0, 1);
            const cy = wallBase - (s.courses - 0.5) * 13;
            const strokes = Math.ceil(k * 5);
            for (let t = 0; t < strokes; t++) {
              g.lineStyle(2, 0xf4f4f0, 0.95);
              if (t < 4) g.lineBetween(s.x - 16 + t * 8, cy - 5, s.x - 18 + t * 8, cy + 5);
              else g.lineBetween(s.x - 22, cy + 4, s.x + 14, cy - 4);
            }
            g.lineStyle(2, S.red, 0.35 + 0.5 * k); g.strokeRect(s.x - secW / 2 + 3, cy - 7, secW - 6, 13);
            if (k > 0.7 && Math.floor(time / 80) % 2) { g.fillStyle(0xffffff, 0.15); g.fillRect(s.x - secW / 2 + 3, cy - 7, secW - 6, 13); }
          }
          // Spray gathering over the gap before a gust.
          const ga = gathering(s, time);
          if (ga > 0) {
            for (let i = 0; i < 6; i++) {
              g.fillStyle(S.cloudLit, 0.5 * ga); g.fillCircle(x0 + 12 + jit(s.i, i) * (secW - 24), ty - 4 - ga * 10 * jit(s.i, i + 9), 3 + ga * 5);
            }
          }
        }
        g.fillStyle(0x000000, 0.35); g.fillRect(0, wallBase, W, 5);

        // A tipped block's shadow, running ahead of it down the lane.
        for (const b of blocks) {
          const teeter = time < b.startAt;
          g.fillStyle(0x000000, teeter ? 0.2 : 0.32); g.fillEllipse(b.x, b.y + 22, BLOCK_HALF * 2.2, 14);
          if (teeter) { g.lineStyle(2, S.red, 0.6); g.strokeRect(b.x - BLOCK_HALF - 8, wallBase, BLOCK_HALF * 2 + 16, 220); }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        // The gusts curling over each gap, thick white spray bowling down.
        for (const s of sections) {
          if (!gusting(s, time)) continue;
          const m = missing(s);
          const ty = wallBase - s.courses * 13;
          for (let i = 0; i < 5 + m * 2; i++) {
            const ph = ((time / 600) + jit(s.i + 40, i)) % 1;
            g.fillStyle(S.cloudLit, 0.4 * (1 - ph)); g.fillCircle(s.x - 40 + jit(s.i + 41, i) * 80, ty + ph * 90, 5 + ph * 12);
          }
        }
        // The tumbling blocks: a granite ashlar with chisel marks and the mason's chalk still on it.
        for (const b of blocks) {
          const teeter = time < b.startAt;
          const a = teeter ? Math.sin(time / 50) * 0.12 : b.spin;
          const cx = b.x, cy = b.y;
          const hw = BLOCK_HALF, hh = 16;
          const c = Math.cos(a), sn = Math.sin(a);
          const P = (x: number, y: number): Pt => ({ x: cx + x * c - y * sn, y: cy + x * sn + y * c });
          const q = [P(-hw, -hh), P(hw, -hh), P(hw, hh), P(-hw, hh)];
          g.fillStyle(S.graniteDark, 1); g.fillPoints(q.map((p) => ({ x: p.x + 3, y: p.y + 3 })), true);
          g.fillStyle(S.granite, 1); g.fillPoints(q, true);
          g.lineStyle(1, S.graniteLit, 0.8); g.strokePoints(q, true);
          for (let i = 0; i < 4; i++) {
            const p0 = P(-hw + 8 + i * 16, -hh + 4), p1 = P(-hw + 12 + i * 16, hh - 4);
            g.lineStyle(1, S.slateDark, 0.6); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
          }
          const m0 = P(-10, 0), m1 = P(10, 0);
          g.lineStyle(2, 0xf4f4f0, 0.9); g.lineBetween(m0.x, m0.y, m1.x, m1.y);
          if (!teeter) for (let i = 0; i < 3; i++) { g.fillStyle(S.granite, 0.6); g.fillCircle(cx + (jit(b.seed, i) - 0.5) * 50, cy - 20 - jit(b.seed, i + 3) * 20, 2.5); }
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics) {
        // The wall's tally, bottom left: eight little columns of four courses.
        const x0 = 18, y0 = H - 22;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 8, y0 - 54, SECTIONS * 16 + 12, 62, 6);
        for (const s of sections) {
          for (let c = 0; c < COURSES; c++) {
            const on = c < s.courses;
            g.fillStyle(on ? (s.chalkAt >= 0 && c === s.courses - 1 ? 0xf4f4f0 : S.graniteLit) : S.galeDark, 1);
            g.fillRect(x0 + s.i * 16, y0 - (c + 1) * 12, 12, 10);
          }
        }
        if (rubble) { g.fillStyle(S.graniteLit, 1); for (let i = 0; i < 3; i++) g.fillCircle(x0 + SECTIONS * 16 - 20 + i * 8, y0 - 47, 2.5); }
      },

      destroy() {
        for (const s of sections) s.target?.remove();
      },
    };
  },
};
