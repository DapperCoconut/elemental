import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { spade } from '../art';
import { DIRT, DIRT_DARK, DIRT_LIT, MIRE_DEEP, PEAT_DARK, TIMBER, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Open Graves — Digger Barrow.
 *
 * Barrow digs as he fights. Every few seconds the turf is cut in an oblong beside one of the
 * fighters — you see the spade-lines first — and then the grave is open: a black pit, a spoil heap
 * on one side and the spade stood in it. Step into an open grave and you go down: held fast while
 * three shovelfuls of earth come in on top of you, a thud each, and then you climb out of the
 * filled hole.
 *
 * The digging is nobody's. A blow taken near an open grave knocks the struck fighter a stride
 * toward it, so a few hits on a foe at a graveside walks them in. Barrow knows this and tries to
 * get you between him and a hole; turn it round on him.
 */

const MARK_MS = 1400;
const OPEN_MS = 9000;
const FILLED_MS = 1800;
const PIT_W = 74;
const PIT_H = 34;
const MAX_OPEN = 3;
/** How far from a grave's edge a blow still knocks you toward it. */
const KNOCK_REACH = 120;
const KNOCK_STEP = 46;

interface Grave {
  x: number; y: number;
  /** When the turf was cut; open at `markAt + MARK_MS`. */
  markAt: number;
  openAt: number;
  closeAt: number;
  /** Someone fell in: who, when, and how many shovelfuls so far. */
  held: Fighter | null;
  heldAt: number;
  shovels: number;
  /** Filled in (by burial or by time): a fresh mound until `goneAt`. */
  filledAt: number;
  /** Which side the spoil heap is on (−1 north, 1 south). */
  heap: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const holdMs = ctx.hard ? 1500 : 1250;
  const thud = ctx.hard ? 6 : 5;
  const every = ctx.hard ? 2700 : 3400;
  const graves: Grave[] = [];
  const knockedAt = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let nextDig = 0;
  let started = false;
  let nearPlayer = true;

  const isOpen = (gr: Grave, time: number) => time >= gr.openAt && gr.filledAt === 0;
  const inPit = (gr: Grave, f: Fighter) => Math.abs(f.x - gr.x) < PIT_W / 2 - 6 && Math.abs(f.y - gr.y) < PIT_H / 2 + 2;
  const edgeDist = (gr: Grave, x: number, y: number) =>
    Math.hypot(Math.max(0, Math.abs(x - gr.x) - PIT_W / 2), Math.max(0, Math.abs(y - gr.y) - PIT_H / 2));

  function dig(time: number): void {
    const who = nearPlayer ? player : npc;
    nearPlayer = !nearPlayer;
    for (let tries = 0; tries < 12; tries++) {
      const a = rng() * Math.PI * 2, d = 80 + rng() * 80;
      const x = clamp(who.x + Math.cos(a) * d, 70, W - 70), y = clamp(who.y + Math.sin(a) * d, top + 60, H - 50);
      if (graves.some((gr) => Math.abs(gr.x - x) < PIT_W + 30 && Math.abs(gr.y - y) < PIT_H + 40)) continue;
      // Never cut the turf right under someone: that is a trap nobody can read.
      if (dist(x, y, player.x, player.y) < 56 || dist(x, y, npc.x, npc.y) < 56) continue;
      graves.push({ x, y, markAt: time, openAt: time + MARK_MS, closeAt: time + MARK_MS + OPEN_MS, held: null, heldAt: 0, shovels: 0, filledAt: 0, heap: rng() < 0.5 ? -1 : 1 });
      ctx.sfx('stone-rise');
      return;
    }
  }

  function nearestOpen(x: number, y: number, time: number): Grave | null {
    let best: Grave | null = null, bd = Infinity;
    for (const gr of graves) {
      if (!isOpen(gr, time) || gr.held) continue;
      const d = edgeDist(gr, x, y);
      if (d < bd) { bd = d; best = gr; }
    }
    return best && bd < KNOCK_REACH ? best : null;
  }

  /** A blow near a graveside knocks the struck a stride toward the hole. */
  function knock(f: Fighter, amount: number): void {
    const time = ctx.scene.time.now;
    if (amount < 2 || !alive(f) || time - (knockedAt.get(f) ?? 0) < 320) return;
    if (graves.some((gr) => gr.held === f)) return;
    const gr = nearestOpen(f.x, f.y, time);
    if (!gr) return;
    knockedAt.set(f, time);
    const d = Math.max(1, dist(f.x, f.y, gr.x, gr.y));
    const step = Math.min(KNOCK_STEP, d);
    ctx.nudge(f, ((gr.x - f.x) / d) * step, ((gr.y - f.y) / d) * step);
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        nextDig = time + 900;
        ctx.banner('BARROW IS DIGGING', '#c9b08a');
      }
      if (time >= nextDig) {
        nextDig = time + every;
        if (graves.filter((gr) => gr.filledAt === 0).length < MAX_OPEN) dig(time);
      }
      for (let i = graves.length - 1; i >= 0; i--) {
        const gr = graves[i];
        if (gr.filledAt) {
          if (time - gr.filledAt > FILLED_MS) graves.splice(i, 1);
          continue;
        }
        if (time < gr.openAt) continue;
        if (time >= gr.openAt && time - gr.openAt < 30 && gr.shovels === 0 && !gr.held) ctx.sfx('quake');
        // Someone down the hole: three shovelfuls, then they climb out over the mound.
        if (gr.held) {
          const f = gr.held;
          const due = Math.floor(((time - gr.heldAt) / holdMs) * 3);
          while (gr.shovels < Math.min(3, due)) {
            gr.shovels++;
            if (alive(f)) { ctx.hit(f, thud, f.x, f.y); ctx.float(f.x, f.y - 40 - gr.shovels * 8, 'THUD', '#c9b08a'); }
            ctx.sfx('rock-throw');
          }
          if (time - gr.heldAt >= holdMs) {
            gr.filledAt = time;
            if (alive(f)) {
              const side = f.y < gr.y ? -1 : 1;
              ctx.nudge(f, 0, side * (PIT_H / 2 + 22));
              ctx.float(f.x, f.y - 50, 'DUG OUT', '#e6dfc8');
            }
          }
          continue;
        }
        if (time >= gr.closeAt) { gr.filledAt = time; continue; }
        for (const f of [player, npc]) {
          if (!alive(f) || ctx.isAirborne(f) || !inPit(gr, f)) continue;
          if (graves.some((o) => o.held === f)) continue;
          gr.held = f;
          gr.heldAt = time;
          ctx.stun(f, holdMs);
          ctx.nudge(f, (gr.x - f.x) * 0.6, (gr.y - f.y) * 0.6);
          ctx.float(f.x, f.y - 48, f === player ? 'IN THE GRAVE' : 'BARROW\'S DOWN', '#e6dfc8');
          ctx.sfx('land');
          break;
        }
      }
    },

    onPlayerHurt(amount) { knock(player, amount); },
    onNpcHurt(amount) { knock(npc, amount); },

    npcSeek(): Pt | null {
      const time = ctx.scene.time.now;
      // Put the player between himself and the nearest open grave, so his blows walk them in.
      let best: Grave | null = null, bd = Infinity;
      for (const gr of graves) {
        if (!isOpen(gr, time) || gr.held) continue;
        const d = dist(gr.x, gr.y, player.x, player.y);
        if (d < bd) { bd = d; best = gr; }
      }
      let x: number, y: number;
      if (best && bd < 260) {
        const d = Math.max(1, bd);
        x = player.x + ((player.x - best.x) / d) * 90;
        y = player.y + ((player.y - best.y) / d) * 90;
      } else {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        x = player.x + Math.cos(a) * 150; y = player.y + Math.sin(a) * 150;
      }
      x = clamp(x, 60, W - 60); y = clamp(y, top + 50, H - 40);
      // Step round any hole on the way.
      for (const gr of graves) {
        if (gr.filledAt || time < gr.markAt) continue;
        if (Math.abs(x - gr.x) < PIT_W / 2 + 26 && Math.abs(y - gr.y) < PIT_H / 2 + 26) y = gr.y + (y < gr.y ? -1 : 1) * (PIT_H / 2 + 30);
      }
      return { x, y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const gr of graves) {
        const x0 = gr.x - PIT_W / 2, y0 = gr.y - PIT_H / 2;
        if (gr.filledAt) {
          // A fresh mound where the hole was, settling.
          const k = clamp((time - gr.filledAt) / FILLED_MS, 0, 1);
          g.fillStyle(DIRT_DARK, 0.8 * (1 - k)); g.fillEllipse(gr.x, gr.y + 3, PIT_W + 10, PIT_H + 8);
          g.fillStyle(DIRT, 0.9 * (1 - k)); g.fillEllipse(gr.x, gr.y, PIT_W, PIT_H);
          g.fillStyle(DIRT_LIT, 0.6 * (1 - k)); g.fillEllipse(gr.x - 8, gr.y - 5, PIT_W * 0.6, PIT_H * 0.4);
          continue;
        }
        if (time < gr.openAt) {
          // The turf being cut: spade-lines round an oblong, the sod lifting as the moment nears.
          const k = clamp((time - gr.markAt) / MARK_MS, 0, 1);
          g.fillStyle(DIRT_DARK, 0.15 + k * 0.35); g.fillRect(x0, y0, PIT_W, PIT_H);
          g.lineStyle(2, lit(DIRT_LIT, 0.3), 0.4 + k * 0.5);
          const per = 2 * (PIT_W + PIT_H), len = per * k;
          // Cut lines walking round the edge.
          const pts: Pt[] = [{ x: x0, y: y0 }, { x: x0 + PIT_W, y: y0 }, { x: x0 + PIT_W, y: y0 + PIT_H }, { x: x0, y: y0 + PIT_H }, { x: x0, y: y0 }];
          let left = len;
          for (let i = 0; i < 4 && left > 0; i++) {
            const a = pts[i], b = pts[i + 1];
            const seg = Math.hypot(b.x - a.x, b.y - a.y), f = Math.min(1, left / seg);
            g.lineBetween(a.x, a.y, a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
            left -= seg;
          }
          for (let d = 6; d < PIT_W; d += 12) { g.lineStyle(1, DIRT_DARK, 0.4 + k * 0.4); g.lineBetween(x0 + d, y0 + 3, x0 + d + 4, y0 + PIT_H - 3); }
          continue;
        }
        // The open grave: dark well, earth walls, a spoil heap on one side and the spade in it.
        const hy = gr.y + gr.heap * (PIT_H / 2 + 14);
        g.fillStyle(DIRT_DARK, 1); g.fillEllipse(gr.x, hy + 3, PIT_W + 18, 24);
        g.fillStyle(DIRT, 1); g.fillEllipse(gr.x, hy, PIT_W + 10, 20);
        g.fillStyle(DIRT_LIT, 1); g.fillEllipse(gr.x - 10, hy - 4, PIT_W * 0.6, 9);
        for (let i = 0; i < 7; i++) { g.fillStyle(PEAT_DARK, 0.9); g.fillCircle(gr.x - PIT_W / 2 + 8 + ((i * 37) % PIT_W), hy - 2 + ((i * 13) % 8) - 4, 2); }
        g.fillStyle(dim(DIRT, 0.3), 1); g.fillRect(x0 - 3, y0 - 3, PIT_W + 6, PIT_H + 6);
        g.fillStyle(DIRT_DARK, 1); g.fillRect(x0, y0, PIT_W, PIT_H);
        g.fillStyle(MIRE_DEEP, 1); g.fillRect(x0 + 5, y0 + 8, PIT_W - 10, PIT_H - 10);
        g.fillStyle(DIRT, 0.7); g.fillRect(x0, y0, PIT_W, 6);
        for (let i = 0; i < 5; i++) { g.lineStyle(1, DIRT_LIT, 0.4); g.lineBetween(x0 + 6 + i * 15, y0 + 1, x0 + 4 + i * 15, y0 + 6); }
        // How long it stays open: the grass creeping back along the lip.
        const left = clamp((gr.closeAt - time) / OPEN_MS, 0, 1);
        g.lineStyle(2, 0x6c7e52, 0.6); g.lineBetween(x0, y0 + PIT_H + 2, x0 + PIT_W * (1 - left), y0 + PIT_H + 2);
        // A bare wooden cross at the head, no name yet.
        const cx = gr.x - PIT_W / 2 - 10, cy = gr.y;
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(cx - 2, cy - 20, 4, 22); g.fillRect(cx - 7, cy - 15, 14, 3);
        g.fillStyle(TIMBER, 1); g.fillRect(cx - 1, cy - 20, 1.5, 22);
      }
    },

    drawAir(g, time) {
      for (const gr of graves) {
        if (gr.filledAt || time < gr.openAt) {
          if (!gr.filledAt && time > gr.openAt - 300) {
            // Earth flicking up as the hole is dug out.
            for (let i = 0; i < 5; i++) {
              const ph = ((time / 260) + i / 5) % 1;
              g.fillStyle(DIRT, 1 - ph); g.fillCircle(gr.x - 20 + i * 10, gr.y - ph * 30 + ph * ph * 30, 3);
            }
          }
          continue;
        }
        const hy = gr.y + gr.heap * (PIT_H / 2 + 14);
        spade(g, gr.x + PIT_W / 2 - 6, hy - 2, -Math.PI / 2 + 0.3, 40);
        if (!gr.held) continue;
        // Shovelfuls arcing from the heap into the hole, and the earth heaping over whoever is in it.
        const f = gr.held;
        const k = clamp((time - gr.heldAt) / holdMs, 0, 1);
        for (let i = 0; i < 3; i++) {
          const ph = (k * 3 - i);
          if (ph < 0 || ph > 1) continue;
          const sx = gr.x + 24, sy = hy - 6;
          const x = sx + (f.x - sx) * ph, y = sy + (f.y - 18 - sy) * ph - Math.sin(ph * Math.PI) * 46;
          g.fillStyle(DIRT, 1); g.fillCircle(x, y, 7); g.fillStyle(DIRT_LIT, 1); g.fillCircle(x - 2, y - 2, 3);
          g.fillStyle(PEAT_DARK, 1); g.fillCircle(x + 3, y + 1, 2);
        }
        const pile = Math.min(3, gr.shovels) / 3;
        g.fillStyle(DIRT_DARK, 0.9); g.fillEllipse(f.x, f.y + 6, 50 + pile * 14, 16 + pile * 18);
        g.fillStyle(DIRT, 0.95); g.fillEllipse(f.x, f.y + 2 - pile * 6, 44 + pile * 10, 10 + pile * 22);
        g.fillStyle(DIRT_LIT, 0.8); g.fillEllipse(f.x - 6, f.y - 2 - pile * 10, 22, 6 + pile * 6);
      }
    },

    destroy() { graves.length = 0; },
  };
}

export const OPEN_GRAVES: GimmickDef = {
  id: 'grave-open-graves',
  rules: 'Graves open beside the fighters. Step in and you are held while earth is shovelled on. A blow near an open grave knocks the struck toward it — knock Barrow in.',
  make,
};
