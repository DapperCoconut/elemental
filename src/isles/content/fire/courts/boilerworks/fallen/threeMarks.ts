import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Rect } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { brandSigil, dim, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, FOE_C, HAZARD_YELLOW, MINE_C, REDLINE,
  clamp, dist, frameClock, inRect,
} from '../util';

/**
 * Loitering Is Three Marks — Under-Clerk Silas Quill keeps the overseer's tally, and in the King's
 * telling he is the informer who wrote up half the yard. The yard sign says it plainly: loitering is
 * three marks.
 *
 * The floor is chalked into twelve shift bays. Stand in one bay too long and Quill pens a mark
 * against you; walking into another bay starts the clock again, but the marks stay. The third mark
 * is a **report**: the overseer's great rubber stamp comes down on the whole bay you stand in, and
 * everyone in it is crushed — so a fighter who is rooted, stunned or simply stubborn is a fighter
 * about to be stamped. Past half the clerk writes faster, and a stamped bay stays **filed** in wet
 * crown-ink for a while, burning anyone who stands in it.
 */

const ID = fallenId('boilerworks', 'three-marks');
const COLS = 4, ROWS = 3;
const STAMP_MS = 1200;
const FILED_MS = 7000;
const INK = 0x1a1238;

type Side = 'player' | 'npc';
interface Tally { bay: number; inBay: number; marks: number }
interface Stamp { bay: number; at: number; land: number }

function makeThreeMarks(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const tick = frameClock();
  const bw = W / COLS, bh = (H - top) / ROWS;
  const bayRect = (i: number): Rect => ({ x: (i % COLS) * bw, y: top + Math.floor(i / COLS) * bh, w: bw, h: bh });
  const bayOf = (x: number, y: number): number =>
    clamp(Math.floor((y - top) / bh), 0, ROWS - 1) * COLS + clamp(Math.floor(x / bw), 0, COLS - 1);
  const centre = (i: number): Pt => { const r = bayRect(i); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };

  const tally: Record<Side, Tally> = {
    player: { bay: -1, inBay: 0, marks: 0 },
    npc: { bay: -1, inBay: 0, marks: 0 },
  };
  let stamps: Stamp[] = [];
  let filed: { bay: number; until: number; nextTick: number }[] = [];
  let fast = false;

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
  const markMs = (): number => (fast ? 2000 : 2600);
  const unsafe = (i: number): boolean => stamps.some((s) => s.bay === i) || filed.some((f) => f.bay === i);

  const report = (s: Side, time: number): void => {
    const f = fighterOf(s);
    const bay = bayOf(f.x, f.y);
    tally[s].marks = 0;
    if (!stamps.some((st) => st.bay === bay)) stamps.push({ bay, at: time, land: time + STAMP_MS });
    ctx.sfx('judgement');
    ctx.float(f.x, f.y - 46, 'REPORTED', s === 'player' ? '#9fe8ff' : '#ffb070');
  };

  return {
    update(time) {
      const dt = tick(time);
      if (!fast && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        fast = true;
        ctx.banner('THE CLERK WRITES FASTER', '#d8c8ff');
        ctx.sfx('curse-cast');
      }
      for (const s of ['player', 'npc'] as Side[]) {
        const f = fighterOf(s);
        if (!alive(f)) continue;
        const t = tally[s];
        const bay = bayOf(f.x, f.y);
        if (bay !== t.bay) { t.bay = bay; t.inBay = 0; continue; }
        t.inBay += dt * 1000;
        if (t.inBay >= markMs()) {
          t.inBay = 0;
          t.marks++;
          ctx.sfx('trap-snap');
          if (t.marks >= 3) report(s, time);
        }
      }
      // Stamps landing.
      for (const st of stamps.filter((x) => time >= x.land)) {
        const r = bayRect(st.bay);
        ctx.sfx('stone-slam'); ctx.sfx('anvil');
        ctx.scene.cameras.main.shake(160, 0.007);
        ctx.flash(r.x + r.w / 2, r.y + r.h / 2, 0xd8c8ff);
        for (const f of [ctx.player, ctx.npc]) {
          if (alive(f) && inRect(f.x, f.y, r)) ctx.hit(f, 24, f.x, f.y);
        }
        if (fast) filed.push({ bay: st.bay, until: time + FILED_MS, nextTick: time + 500 });
      }
      stamps = stamps.filter((x) => time < x.land);
      filed = filed.filter((x) => time < x.until);
      for (const fl of filed) {
        if (time < fl.nextTick) continue;
        fl.nextTick = time + 500;
        const r = bayRect(fl.bay);
        for (const f of [ctx.player, ctx.npc]) if (alive(f) && inRect(f.x, f.y, r)) ctx.hit(f, 5, f.x, f.y);
      }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const here = bayOf(n.x, n.y);
      const t = tally.npc;
      const urgent = unsafe(here);
      if (!urgent && t.inBay < markMs() * 0.6) return null;
      // Step into the neighbouring safe bay nearest the player, so it keeps the pressure on.
      const c = here % COLS, r = Math.floor(here / COLS);
      const options = [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]]
        .filter(([x, y]) => x >= 0 && x < COLS && y >= 0 && y < ROWS)
        .map(([x, y]) => y * COLS + x)
        .filter((i) => !unsafe(i));
      if (!options.length) return null;
      const best = options.reduce((a, b) => (dist(centre(a).x, centre(a).y, p.x, p.y) < dist(centre(b).x, centre(b).y, p.x, p.y) ? a : b));
      return centre(best);
    },

    drawGround(g, time) {
      // Filed bays: wet crown-ink with the King's seal.
      for (const fl of filed) {
        const r = bayRect(fl.bay);
        const k = clamp((fl.until - time) / FILED_MS, 0, 1);
        g.fillStyle(INK, 0.5 * k + 0.15); g.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
        brandSigil(g, r.x + r.w / 2, r.y + r.h / 2, 46, 0x6a4ac8, 0.5 * k + 0.2);
      }
      // Chalk bay lines and corner ticks.
      g.lineStyle(2, 0xe8e2cc, 0.35);
      for (let c = 1; c < COLS; c++) g.lineBetween(c * bw, top, c * bw, H);
      for (let r = 1; r < ROWS; r++) g.lineBetween(0, top + r * bh, W, top + r * bh);
      for (let i = 0; i < COLS * ROWS; i++) {
        const r = bayRect(i);
        g.fillStyle(HAZARD_YELLOW, 0.5); g.fillRect(r.x + 6, r.y + 6, 14, 3); g.fillRect(r.x + 6, r.y + 6, 3, 14);
        // The bay's number in tally strokes, chalked small in the corner.
        g.lineStyle(1.5, 0xe8e2cc, 0.4);
        const n = i + 1;
        const groups = Math.floor(n / 5);
        for (let k = 0; k < n % 5; k++) g.lineBetween(r.x + 26 + groups * 22 + k * 4, r.y + 8, r.x + 26 + groups * 22 + k * 4, r.y + 18);
        for (let k = 0; k < groups; k++) {
          const ox = r.x + 28 + k * 22;
          for (let j = 0; j < 4; j++) g.lineBetween(ox + j * 4, r.y + 8, ox + j * 4, r.y + 18);
          g.lineBetween(ox - 2, r.y + 16, ox + 14, r.y + 10);
        }
      }
      // Each fighter's own bay brightens as the clerk's pen gets closer to a mark.
      for (const s of ['player', 'npc'] as Side[]) {
        const t = tally[s];
        if (t.bay < 0) continue;
        const r = bayRect(t.bay);
        const k = clamp(t.inBay / markMs(), 0, 1);
        g.lineStyle(3, s === 'player' ? MINE_C : FOE_C, 0.2 + k * 0.7); g.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
      }
      // Stamps coming down: the stamp's shadow fills the bay, its outline strobing red.
      for (const st of stamps) {
        const r = bayRect(st.bay);
        const k = clamp((time - st.at) / STAMP_MS, 0, 1);
        g.fillStyle(0x000000, 0.15 + k * 0.4);
        g.fillRect(r.x + r.w / 2 - (r.w / 2) * (0.4 + 0.6 * k), r.y + r.h / 2 - (r.h / 2) * (0.4 + 0.6 * k), r.w * (0.4 + 0.6 * k), r.h * (0.4 + 0.6 * k));
        g.lineStyle(4, REDLINE, Math.floor(time / 80) % 2 ? 1 : 0.5); g.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      }
    },

    drawAir(g, time) {
      for (const st of stamps) drawStamp(g, bayRect(st.bay), clamp((time - st.at) / STAMP_MS, 0, 1));
      // Pen-marks over each fighter: little ink strokes, struck through on the third.
      for (const s of ['player', 'npc'] as Side[]) {
        const f = fighterOf(s);
        if (!alive(f) || tally[s].marks === 0) continue;
        g.lineStyle(3, INK, 1);
        for (let i = 0; i < tally[s].marks; i++) g.lineBetween(f.x - 8 + i * 8, f.y - 62, f.x - 10 + i * 8, f.y - 50);
        g.lineStyle(1.5, s === 'player' ? MINE_C : FOE_C, 1);
        for (let i = 0; i < tally[s].marks; i++) g.lineBetween(f.x - 8 + i * 8, f.y - 62, f.x - 10 + i * 8, f.y - 50);
      }
    },

    drawHud(g) {
      // The clerk's ledger: two lines, three ruled boxes each, a pen-clock per line.
      const x = 16, y = top + 8;
      g.fillStyle(0xeee4c8, 0.95); g.fillRect(x, y, 128, 46);
      g.lineStyle(1, 0x9aa8c8, 0.8); g.lineBetween(x, y + 23, x + 128, y + 23);
      g.lineStyle(1, REDLINE, 0.8); g.lineBetween(x + 22, y, x + 22, y + 46);
      for (const [s, row] of [['player', 0], ['npc', 1]] as [Side, number][]) {
        const yy = y + 5 + row * 23;
        g.fillStyle(s === 'player' ? MINE_C : FOE_C, 1); g.fillCircle(x + 11, yy + 7, 5);
        for (let i = 0; i < 3; i++) {
          g.lineStyle(1, 0x5a5a6a, 1); g.strokeRect(x + 28 + i * 20, yy, 16, 14);
          if (i < tally[s].marks) {
            g.lineStyle(3, INK, 1); g.lineBetween(x + 31 + i * 20, yy + 12, x + 41 + i * 20, yy + 2);
          }
        }
        const k = clamp(tally[s].inBay / markMs(), 0, 1);
        g.fillStyle(dim(BRASS, 0.3), 1); g.fillRect(x + 92, yy + 5, 30, 4);
        g.fillStyle(INK, 1); g.fillRect(x + 92, yy + 5, 30 * k, 4);
      }
    },
  };
}

/** The overseer's rubber stamp: a broad inked block on a turned wooden handle, falling as `k` → 1. */
function drawStamp(g: G, r: Rect, k: number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const lift = (1 - k * k) * 150;
  const w = r.w * 0.82, h = r.h * 0.5;
  const by = cy - lift;
  g.fillStyle(0x3a2414, 1); g.fillRect(cx - w / 2, by - h / 2 - 20, w, 22);
  g.fillStyle(0x5a3a20, 1); g.fillRect(cx - w / 2 + 3, by - h / 2 - 18, w - 6, 8);
  g.fillStyle(0x7a4a28, 1); g.fillRoundedRect(cx - 14, by - h / 2 - 70, 28, 52, 8);
  g.fillStyle(0x9a6234, 1); g.fillCircle(cx, by - h / 2 - 76, 20);
  g.fillStyle(0xb67a44, 1); g.fillCircle(cx - 6, by - h / 2 - 82, 7);
  g.fillStyle(0x2a2a2e, 1); g.fillRect(cx - w / 2 - 2, by - h / 2, w + 4, h * 0.3);
  g.fillStyle(INK, 1); g.fillRect(cx - w / 2, by - h / 2 + h * 0.3, w, 8);
  brandSigil(g, cx, by - h / 2 + h * 0.15, 12, 0x6a4ac8, 0.8);
}

export const THREE_MARKS: GimmickDef = {
  id: ID,
  rules: 'Linger in one chalked bay and you are marked. Three marks and the stamp crushes your whole bay — whoever stands in it.',
  make: makeThreeMarks,
};
