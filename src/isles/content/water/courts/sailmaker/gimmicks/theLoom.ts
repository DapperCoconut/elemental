import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { BRASS, CANVAS, HEMP, OAK, OAK_DARK, PINE, RED_THREAD, STEEL } from '../art';

/**
 * The Loom — Weaver Shuttle's great loom, laid flat across the floor.
 *
 * Warp threads run north–south over the whole room. Across them, one pick at a time, the
 * shuttle flies: a brass-nosed wooden boat racing along a weft line from one wall to the other,
 * and anyone it passes is clipped hard. Behind it the weft it lays stands up as a low wall of
 * packed thread — solid, except where the heddles held a few warps down and left a gap. Pick by
 * pick, top to bottom, the weave closes into a maze. When the last pick is laid the cloth holds
 * a moment, then is *cut loose*: every weft wall springs apart at once and lashes whoever is
 * hugging it. Then the loom starts again with a new pattern.
 *
 * The shuttle does not care whose loom it is — it clips Shuttle the weaver as readily as you.
 * The maze is the exploit: trap her in a lane the shuttle is about to fly down.
 */

const PICKS = 5;
const PICKS_HARD = 6;
const SHUTTLE_SPEED = 520;
const SHUTTLE_HARD_SPEED = 620;
const WARN_MS = 1000;
const PICK_GAP_MS = 1500;
const CLOSED_HOLD_MS = 3600;
const CUT_WARN_MS = 1300;
const REST_MS = 2200;
const SHUTTLE_HIT_R = 26;
const SHUTTLE_DAMAGE = 12;
const WALL_BAND = 13;
const CUT_BAND = 24;
const CUT_DAMAGE = 10;
const GAP_W = 92;

type Stage = 'weaving' | 'closed' | 'cut' | 'rest';

interface Pick {
  y: number;
  /** Gap centres in x along this weft. */
  gaps: number[];
  /** +1: the shuttle flies west → east; −1: east → west. */
  dir: number;
  /** Warn starts / shuttle leaves / shuttle arrives. */
  warnAt: number;
  flyAt: number;
  doneAt: number;
  hitP: boolean;
  hitN: boolean;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const field = H - top;
  const nPicks = ctx.hard ? PICKS_HARD : PICKS;
  const speed = ctx.hard ? SHUTTLE_HARD_SPEED : SHUTTLE_SPEED;
  const flyMs = ((W + 80) / speed) * 1000;

  let picks: Pick[] = [];
  let stage: Stage = 'rest';
  let stageAt = 0;
  let cursor = 0;
  let announced = false;
  let cutAt = 0;
  /** Which side of each weft each fighter is on (+1 below, −1 above). */
  const sides = new Map<Fighter, number[]>();

  const pickY = (i: number): number => top + 40 + ((field - 70) / nPicks) * (i + 0.5);

  const plan = (time: number): void => {
    picks = [];
    for (let i = 0; i < nPicks; i++) {
      const gaps: number[] = [];
      const want = 2 + (rng() < 0.35 ? 1 : 0);
      for (let tries = 0; tries < 40 && gaps.length < want; tries++) {
        const x = 70 + rng() * (W - 140);
        if (gaps.some((gx) => Math.abs(gx - x) < GAP_W * 2.2)) continue;
        // Keep gaps from lining up straight through two picks — that is a corridor, not a maze.
        const prev = picks[i - 1];
        if (prev && prev.gaps.some((gx) => Math.abs(gx - x) < GAP_W * 0.8)) continue;
        gaps.push(x);
      }
      const warnAt = time + 600 + i * (flyMs + PICK_GAP_MS);
      picks.push({ y: pickY(i), gaps, dir: i % 2 ? -1 : 1, warnAt, flyAt: warnAt + WARN_MS, doneAt: warnAt + WARN_MS + flyMs, hitP: false, hitN: false });
    }
    cursor = 0;
  };

  /** How far along its weft the shuttle has laid thread (x), or null if not started. */
  const laidTo = (p: Pick, time: number): { from: number; to: number } | null => {
    if (time < p.flyAt) return null;
    const k = Math.min(1, (time - p.flyAt) / flyMs);
    const head = p.dir > 0 ? -40 + (W + 80) * k : W + 40 - (W + 80) * k;
    return p.dir > 0 ? { from: 0, to: Math.min(W, head) } : { from: Math.max(0, head), to: W };
  };
  const shuttleX = (p: Pick, time: number): number | null => {
    if (time < p.flyAt || time > p.doneAt) return null;
    const k = (time - p.flyAt) / flyMs;
    return p.dir > 0 ? -40 + (W + 80) * k : W + 40 - (W + 80) * k;
  };
  const inGap = (p: Pick, x: number): boolean => p.gaps.some((gx) => Math.abs(gx - x) < GAP_W / 2 - 4);
  const wallAt = (p: Pick, x: number, time: number): boolean => {
    const l = laidTo(p, time);
    return !!l && x >= l.from && x <= l.to && !inGap(p, x);
  };
  const wallsUp = (): boolean => stage === 'weaving' || stage === 'closed' || stage === 'cut';

  /** Shoulder a fighter back to the side of each standing weft it came from. */
  const hold = (f: Fighter, time: number): void => {
    let mem = sides.get(f);
    if (!mem || mem.length !== picks.length) { mem = picks.map((p) => (f.y + 12 >= p.y ? 1 : -1)); sides.set(f, mem); }
    const fy = f.y + 12;
    picks.forEach((p, i) => {
      const dy = fy - p.y;
      if (wallsUp() && wallAt(p, f.x, time) && Math.abs(dy) < WALL_BAND) {
        const want = mem![i];
        const push = want * (WALL_BAND - dy * want);
        ctx.nudge(f, 0, Math.max(-14, Math.min(14, push)));
        return;
      }
      if (Math.abs(dy) >= WALL_BAND) mem![i] = dy >= 0 ? 1 : -1;
    });
  };

  return {
    update(time) {
      if (!announced) { announced = true; stageAt = time; ctx.banner('THE LOOM IS RUNNING', '#c8e4f0'); }

      if (stage === 'rest' && time - stageAt >= REST_MS) {
        stage = 'weaving'; stageAt = time;
        plan(time);
      }
      if (stage === 'weaving') {
        // The shuttle: a fast clip for anyone on its line.
        for (const p of picks) {
          const sx = shuttleX(p, time);
          if (sx === null) continue;
          if (time - p.flyAt < 40) ctx.sfx('gear-turn');
          for (const f of [ctx.player, ctx.npc]) {
            if (!f.active || f.hp <= 0) continue;
            const isP = f === ctx.player;
            if (isP ? p.hitP : p.hitN) continue;
            if (Math.abs(f.y + 12 - p.y) < SHUTTLE_HIT_R && Math.abs(f.x - sx) < SHUTTLE_HIT_R + 10) {
              if (isP) p.hitP = true; else p.hitN = true;
              ctx.hit(f, SHUTTLE_DAMAGE, f.x, f.y);
              ctx.nudge(f, p.dir * 30, 0);
              ctx.float(f.x, f.y - 46, 'CLIPPED', isP ? '#ffd27a' : '#9df5c8');
              ctx.sfx('clang');
            }
          }
        }
        while (cursor < picks.length && time >= picks[cursor].doneAt) cursor++;
        if (cursor >= picks.length) {
          stage = 'closed'; stageAt = time;
          ctx.float(W / 2, top + 30, 'THE WEAVE IS CLOSED', '#c8e4f0');
        }
      } else if (stage === 'closed' && time - stageAt >= CLOSED_HOLD_MS) {
        stage = 'cut'; stageAt = time; cutAt = time + CUT_WARN_MS;
        ctx.banner('CUT LOOSE!', '#ffb08a');
        ctx.sfx('beam-charge');
      } else if (stage === 'cut' && time >= cutAt) {
        ctx.sfx('slash');
        ctx.sfx('snap-back');
        ctx.scene.cameras.main.shake(160, 0.006);
        for (const f of [ctx.player, ctx.npc]) {
          if (!f.active || f.hp <= 0) continue;
          if (picks.some((p) => Math.abs(f.y + 12 - p.y) < CUT_BAND && !inGap(p, f.x))) {
            ctx.hit(f, CUT_DAMAGE, f.x, f.y);
            ctx.float(f.x, f.y - 46, 'LASHED', '#ffb08a');
          }
        }
        stage = 'rest'; stageAt = time;
        picks = [];
        sides.clear();
      }

      if (picks.length) { hold(ctx.player, time); hold(ctx.npc, time); }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      const time = ctx.scene.time.now;
      // Off a weft the shuttle is about to fly down — step through the nearest gap or away.
      for (const p of picks) {
        if (time < p.warnAt || time > p.doneAt) continue;
        if (Math.abs(n.y + 12 - p.y) > SHUTTLE_HIT_R + 18) continue;
        const away = n.y + 12 >= p.y ? 1 : -1;
        return { x: n.x, y: p.y + away * 70 - 12 };
      }
      if (stage === 'cut') {
        for (const p of picks) {
          if (Math.abs(n.y + 12 - p.y) < CUT_BAND + 14 && !inGap(p, n.x)) {
            const away = n.y + 12 >= p.y ? 1 : -1;
            return { x: n.x, y: p.y + away * 46 - 12 };
          }
        }
      }
      // Walled off from the player: head for the nearest gap in the wall between.
      const pl = ctx.player;
      for (const p of picks) {
        if (!wallsUp() || !laidTo(p, time)) continue;
        const ns = n.y + 12 >= p.y ? 1 : -1, ps = pl.y + 12 >= p.y ? 1 : -1;
        if (ns === ps || !p.gaps.length) continue;
        const gx = p.gaps.reduce((b, x) => (Math.abs(x - n.x) < Math.abs(b - n.x) ? x : b), p.gaps[0]);
        if (Math.abs(gx - n.x) < GAP_W / 2 - 8) return { x: gx, y: p.y - ns * 40 - 12 };
        return { x: gx, y: p.y + ns * 30 - 12 };
      }
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      // The warp: fine pale threads running the length of the room.
      for (let x = 24; x < W; x += 16) {
        g.lineStyle(1, CANVAS, 0.12 + ((x / 16) % 2) * 0.06); g.lineBetween(x, top, x, H);
      }
      // Breast beam (south) and back beam (north).
      g.fillStyle(OAK_DARK, 1); g.fillRect(0, top, W, 12); g.fillRect(0, H - 14, W, 14);
      g.fillStyle(OAK, 1); g.fillRect(0, top + 2, W, 5); g.fillRect(0, H - 12, W, 5);
      for (const p of picks) {
        // Heddle gaps: brass eyes marking where the weft will part.
        for (const gx of p.gaps) {
          g.fillStyle(BRASS, 0.18); g.fillRect(gx - GAP_W / 2, p.y - WALL_BAND, GAP_W, WALL_BAND * 2);
          g.lineStyle(2, BRASS, 0.75);
          g.strokeRect(gx - GAP_W / 2, p.y - WALL_BAND, GAP_W, WALL_BAND * 2);
        }
        // The pick's warning: its line ripples, an arrow at the wall the shuttle leaves from.
        if (time >= p.warnAt && time < p.flyAt) {
          const k = (time - p.warnAt) / WARN_MS;
          g.fillStyle(RED_THREAD, 0.08 + k * 0.18); g.fillRect(0, p.y - SHUTTLE_HIT_R, W, SHUTTLE_HIT_R * 2);
          g.lineStyle(2, RED_THREAD, 0.4 + 0.5 * k);
          for (let x = 0; x < W; x += 30) {
            const yy = p.y + Math.sin(t * 16 + x * 0.05) * 4;
            g.lineBetween(x, yy, x + 18, yy);
          }
          const ax = p.dir > 0 ? 24 : W - 24;
          g.fillStyle(0xffffff, 0.7 + 0.3 * Math.sin(t * 20));
          g.fillTriangle(ax + p.dir * 18, p.y, ax - p.dir * 6, p.y - 12, ax - p.dir * 6, p.y + 12);
          if (k > 0.8 && Math.floor(time / 80) % 2 === 0) { g.fillStyle(0xffffff, 0.12); g.fillRect(0, p.y - SHUTTLE_HIT_R, W, SHUTTLE_HIT_R * 2); }
        }
      }
      // Cut warning: every weft wall strains and glows.
      if (stage === 'cut') {
        const k = Math.min(1, (time - stageAt) / CUT_WARN_MS);
        for (const p of picks) {
          g.fillStyle(0xffb08a, 0.1 + 0.2 * k); g.fillRect(0, p.y - CUT_BAND, W, CUT_BAND * 2);
          for (const gx of p.gaps) { g.fillStyle(0x000000, 0.25); g.fillRect(gx - GAP_W / 2 + 4, p.y - CUT_BAND, GAP_W - 8, CUT_BAND * 2); }
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // The weft walls: packed thread, layered and beaten up tight, bulging slightly.
      for (const p of picks) {
        const l = laidTo(p, time);
        if (!l) continue;
        const strain = stage === 'cut' ? Math.min(1, (time - stageAt) / CUT_WARN_MS) : 0;
        const segs: [number, number][] = [];
        let x0 = l.from;
        const sortedGaps = [...p.gaps].sort((a, b) => a - b);
        for (const gx of sortedGaps) {
          const a = gx - GAP_W / 2, b = gx + GAP_W / 2;
          if (b < l.from || a > l.to) continue;
          if (a > x0) segs.push([x0, Math.min(a, l.to)]);
          x0 = Math.max(x0, b);
        }
        if (x0 < l.to) segs.push([x0, l.to]);
        for (const [a, b] of segs) {
          if (b - a < 2) continue;
          const shake = strain > 0 ? Math.sin(t * 50 + a) * strain * 2 : 0;
          g.fillStyle(0x000000, 0.25); g.fillRect(a, p.y + 2, b - a, 10);
          g.fillStyle(dim(HEMP, 0.35), 1); g.fillRect(a, p.y - 14 + shake, b - a, 16);
          g.fillStyle(HEMP, 1); g.fillRect(a, p.y - 16 + shake, b - a, 12);
          // Thread texture: tight horizontal passes.
          for (let k = 0; k < 4; k++) {
            g.lineStyle(1, k % 2 ? lit(HEMP, 0.2) : dim(HEMP, 0.2), 0.8);
            g.lineBetween(a, p.y - 14 + k * 3 + shake, b, p.y - 14 + k * 3 + shake);
          }
          // Warp ends poking through the weave.
          for (let x = Math.ceil(a / 16) * 16 + 8; x < b; x += 16) {
            g.fillStyle(CANVAS, 0.6); g.fillRect(x - 1, p.y - 17 + shake, 2, 14);
          }
          if (strain > 0.7 && Math.floor(time / 70) % 2 === 0) { g.lineStyle(2, 0xffffff, 0.6); g.strokeRect(a, p.y - 16, b - a, 14); }
        }
        // Gap posts: a heddle frame either side of each gap.
        for (const gx of p.gaps) {
          for (const s of [-1, 1]) {
            const hx = gx + s * GAP_W / 2;
            if (hx < l.from || hx > l.to) continue;
            g.fillStyle(OAK_DARK, 1); g.fillRect(hx - 3, p.y - 26, 6, 26);
            g.fillStyle(BRASS, 1); g.fillCircle(hx, p.y - 26, 3);
          }
        }
        // The shuttle.
        const sx = shuttleX(p, time);
        if (sx !== null) {
          const d = p.dir;
          g.fillStyle(0xffffff, 0.12); g.fillRect(sx - d * 120, p.y - 6, d * 120, 6);
          g.fillStyle(0x000000, 0.3); g.fillEllipse(sx, p.y + 6, 60, 10);
          g.fillStyle(OAK_DARK, 1); g.fillEllipse(sx, p.y - 12, 62, 18);
          g.fillStyle(PINE, 1); g.fillEllipse(sx, p.y - 14, 56, 13);
          g.fillStyle(BRASS, 1);
          g.fillTriangle(sx + d * 26, p.y - 18, sx + d * 26, p.y - 8, sx + d * 40, p.y - 13);
          g.fillTriangle(sx - d * 26, p.y - 18, sx - d * 26, p.y - 8, sx - d * 36, p.y - 13);
          // The bobbin inside, spinning.
          g.fillStyle(dim(PINE, 0.5), 1); g.fillRect(sx - 14, p.y - 17, 28, 7);
          g.fillStyle(RED_THREAD, 1); g.fillRect(sx - 12, p.y - 16, 24, 5);
          g.lineStyle(1, dim(RED_THREAD, 0.4), 1);
          for (let k = 0; k < 4; k++) { const ox = ((t * 400 + k * 6) % 24) - 12; g.lineBetween(sx + ox, p.y - 16, sx + ox, p.y - 11); }
          g.fillStyle(STEEL, 1); g.fillCircle(sx + d * 38, p.y - 13, 2);
        }
      }
      // The cut: shear blades across every pick the instant it fires.
      if (stage === 'rest' && time - stageAt < 400) {
        const k = (time - stageAt) / 400;
        g.lineStyle(6 * (1 - k), 0xffffff, 0.8 * (1 - k));
        for (let i = 0; i < nPicks; i++) g.lineBetween(0, pickY(i) - 8, W * k * 1.4, pickY(i) - 8);
      }
    },

    drawHud(g, time) {
      // Picks laid, as a row of little weft bars.
      const x0 = W / 2 - nPicks * 14;
      for (let i = 0; i < nPicks; i++) {
        const p = picks[i];
        const done = p ? time >= p.doneAt : false;
        const flying = p ? time >= p.flyAt && time < p.doneAt : false;
        g.fillStyle(done ? HEMP : flying ? 0xffffff : 0x2a2a30, done || flying ? 0.95 : 0.6);
        g.fillRect(x0 + i * 28, top + 8, 22, 8);
      }
      if (stage === 'closed' || stage === 'cut') {
        g.lineStyle(2, stage === 'cut' ? 0xffb08a : 0xc8e4f0, 0.9);
        g.strokeRect(x0 - 4, top + 4, nPicks * 28 + 2, 16);
      }
    },

    destroy() { sides.clear(); },
  };
}

export const THE_LOOM: GimmickDef = {
  id: 'sailmaker-the-loom',
  rules: 'The shuttle clips anyone on its line and leaves a thread wall behind it. The closed weave is CUT LOOSE — leave the walls.',
  make,
};

