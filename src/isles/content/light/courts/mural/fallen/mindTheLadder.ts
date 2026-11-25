import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CANVAS, CANVAS_DARK, GOLD, SIDE_NPC, SIDE_PLAYER, STONE_DARK, TIMBER, TIMBER_DARK, TIMBER_LIT, ULTRAMARINE,
  VERMILION, VIRIDIAN, CADMIUM,
} from '../palette';
import { clamp, dist, segDist, stepDt, wrapAngle } from '../util';
import { alive, framePlate, halfDown, pip } from './common';

/**
 * Mind the Ladder — Florizel Putlog, Scaffold-Master (earth).
 *
 * Nothing goes up the Great Mural without a ladder, and nothing gets a ladder to the wall but two
 * apprentices with it on their shoulders, one in front and one behind, shouting "mind your backs!"
 * down streets too narrow for it. The Scaffold-Master sends a pair through this yard after you.
 * The front lad walks at you and the back lad follows on the far end, so every time the front one
 * turns the ladder swings — clouting whoever it swings into.
 *
 * Strike either lad and he stops dead, dazed, holding his end; the other lad, still walking, can
 * only go round him — and the far end of the ladder sweeps a great arc about the stopped one,
 * swinging the way of the striker's foe. A chalk arc shows the sweep a moment before it starts:
 * step over to the side it is swinging *from*, or out past the ladder's length. Below half a
 * second, shorter pair joins in from the other side of the yard.
 */

const ID = fallenId('mural', 'mind-the-ladder');

const WALK = 86;
const SWEEP_RATE = 1.7;
const WARN_MS = 560;
const CLOUT_CD = 900;

interface Sweep { pivot: 0 | 1; dir: 1 | -1; a0: number; total: number; startAt: number; hit: Set<Fighter> }

interface Ladder {
  /** [front, rear] carriers' shoulders. */
  ends: [Pt, Pt];
  len: number;
  heading: number;
  passUntil: number;
  dazed: [number, number];
  targets: [StrikeTarget | null, StrikeTarget | null];
  sweep: Sweep | null;
  restAt: number;
  coat: number;
  bob: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const ladders: Ladder[] = [];
  const clouted = new Map<Fighter, number>([[player, -1e9], [npc, -1e9]]);
  let started = false;
  let second = false;

  function add(fx: number, fy: number, heading: number, len: number, coat: number): void {
    const front = { x: fx, y: fy };
    const rear = { x: fx - Math.cos(heading) * len, y: fy - Math.sin(heading) * len };
    const l: Ladder = {
      ends: [front, rear], len, heading, passUntil: 0, dazed: [0, 0], targets: [null, null], sweep: null, restAt: 0,
      coat, bob: 0,
    };
    for (const i of [0, 1] as const) {
      l.targets[i] = ctx.target({
        x: l.ends[i].x, y: l.ends[i].y, r: 22,
        onStruck: (by) => strike(l, i, by === 'player' ? npc : player),
      });
    }
    ladders.push(l);
  }

  /** A lad is struck: he stops, and the other end sweeps round him toward `at`. */
  function strike(l: Ladder, i: 0 | 1, at: Fighter): void {
    const now = ctx.scene.time.now;
    if (l.sweep || now < l.restAt) return;
    const pivot = l.ends[i], tip = l.ends[1 - i];
    const a0 = Math.atan2(tip.y - pivot.y, tip.x - pivot.x);
    const want = Math.atan2(at.y - pivot.y, at.x - pivot.x);
    const delta = wrapAngle(want - a0);
    const dir: 1 | -1 = delta >= 0 ? 1 : -1;
    const total = clamp(Math.abs(delta) + 0.75, 1.3, 3.9);
    l.sweep = { pivot: i, dir, a0, total, startAt: now + WARN_MS, hit: new Set() };
    l.dazed[i] = now + WARN_MS + (total / SWEEP_RATE) * 1000 + 500;
    ctx.sfx('clang');
  }

  const segOf = (l: Ladder): [Pt, Pt] => l.ends;

  function clout(l: Ladder, f: Fighter, now: number, heavy: boolean): void {
    const [a, b] = segOf(l);
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    if ((f.x - a.x) * nx + (f.y - a.y) * ny < 0) { nx = -nx; ny = -ny; }
    ctx.hit(f, heavy ? (f === npc ? 28 : 24) : (f === npc ? 16 : 12), f.x, f.y);
    ctx.nudge(f, nx * (heavy ? 46 : 32), ny * (heavy ? 46 : 32));
    if (heavy) ctx.stun(f, f === npc ? 700 : 600);
    clouted.set(f, now);
    ctx.sfx(heavy ? 'hit-heavy' : 'hit-medium');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; add(W - 140, H - 110, Math.PI + 0.4, 250, VERMILION); }
      if (!second && halfDown(npc)) { second = true; add(140, top + 90, 0.3, 196, ULTRAMARINE); ctx.sfx('trap-set'); }

      for (const l of ladders) {
        const [front, rear] = l.ends;
        if (l.sweep) {
          const s = l.sweep;
          if (time >= s.startAt) {
            const swept = Math.min(s.total, ((time - s.startAt) / 1000) * SWEEP_RATE);
            const a = s.a0 + s.dir * swept;
            const pv = l.ends[s.pivot];
            const tip = l.ends[1 - s.pivot];
            tip.x = clamp(pv.x + Math.cos(a) * l.len, 30, W - 30);
            tip.y = clamp(pv.y + Math.sin(a) * l.len, top + 20, H - 20);
            for (const f of [player, npc]) {
              if (!alive(f) || ctx.isAirborne(f) || s.hit.has(f)) continue;
              if (segDist(f.x, f.y, pv.x, pv.y, tip.x, tip.y) < 28) { s.hit.add(f); clout(l, f, time, true); }
            }
            if (swept >= s.total) { l.sweep = null; l.restAt = time + 1400; l.heading = Math.atan2(front.y - rear.y, front.x - rear.x); }
          }
        } else if (time >= l.dazed[0] && time >= l.dazed[1]) {
          // Walking: the front lad heads for the stranger, walks on past, turns; the back lad trails.
          const d = dist(front.x, front.y, player.x, player.y);
          if (d < 70 && time > l.passUntil) l.passUntil = time + 1100;
          if (time > l.passUntil && alive(player)) {
            const want = Math.atan2(player.y - front.y, player.x - front.x);
            l.heading += clamp(wrapAngle(want - l.heading), -1.5 * dt, 1.5 * dt);
          }
          front.x = clamp(front.x + Math.cos(l.heading) * WALK * dt, 40, W - 40);
          front.y = clamp(front.y + Math.sin(l.heading) * WALK * dt, top + 30, H - 30);
          if (front.x <= 41 || front.x >= W - 41 || front.y <= top + 31 || front.y >= H - 31) l.heading += Math.PI * 0.6;
          const bx = rear.x - front.x, by = rear.y - front.y, bl = Math.hypot(bx, by) || 1;
          rear.x = front.x + (bx / bl) * l.len; rear.y = front.y + (by / bl) * l.len;
          l.bob += dt * 9;
          // The ladder clouts whoever it swings or walks into.
          for (const f of [player, npc]) {
            if (!alive(f) || ctx.isAirborne(f) || time - (clouted.get(f) ?? 0) < CLOUT_CD) continue;
            if (segDist(f.x, f.y, front.x, front.y, rear.x, rear.y) < 24) clout(l, f, time, false);
          }
        }
        for (const i of [0, 1] as const) l.targets[i]?.moveTo(l.ends[i].x, l.ends[i].y);
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const now = ctx.scene.time.now;
      // A sweep coming: get behind where it starts, or out past its length.
      for (const l of ladders) {
        const s = l.sweep;
        if (!s) continue;
        const pv = l.ends[s.pivot];
        const d = dist(npc.x, npc.y, pv.x, pv.y);
        if (d > l.len + 40) continue;
        const a = s.a0 - s.dir * 0.7;
        return { x: clamp(pv.x + Math.cos(a) * Math.min(l.len * 0.6, 150), 60, W - 60), y: clamp(pv.y + Math.sin(a) * Math.min(l.len * 0.6, 150), top + 50, H - 40) };
      }
      for (const l of ladders) {
        const [a, b] = l.ends;
        // Out of the ladder's way while it walks.
        if (segDist(npc.x, npc.y, a.x, a.y, b.x, b.y) < 60) {
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          let nx = -dy / len, ny = dx / len;
          if ((npc.x - a.x) * nx + (npc.y - a.y) * ny < 0) { nx = -nx; ny = -ny; }
          return { x: clamp(npc.x + nx * 110, 60, W - 60), y: clamp(npc.y + ny * 110, top + 50, H - 40) };
        }
      }
      // The stranger is within a ladder's reach of a lad: go and stop that lad.
      for (const l of ladders) {
        if (l.sweep || now < l.restAt) continue;
        for (const i of [0, 1] as const) {
          const c = l.ends[i];
          if (dist(c.x, c.y, player.x, player.y) > l.len * 0.92) continue;
          if (dist(c.x, c.y, npc.x, npc.y) > 360) continue;
          const a = Math.atan2(npc.y - c.y, npc.x - c.x);
          return { x: clamp(c.x + Math.cos(a) * 110, 60, W - 60), y: clamp(c.y + Math.sin(a) * 110, top + 50, H - 40) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      for (const l of ladders) {
        const [a, b] = l.ends;
        // Its small hard shadow on the flags.
        g.lineStyle(14, 0x3a3020, 0.16); g.lineBetween(a.x + 4, a.y + 10, b.x + 4, b.y + 10);
        const s = l.sweep;
        if (!s) continue;
        const pv = l.ends[s.pivot];
        const k = time < s.startAt ? 1 - (s.startAt - time) / WARN_MS : 1;
        // The chalked sweep: the sector it will cover, edged, with arrowheads the way it turns.
        g.fillStyle(CANVAS, 0.12 + 0.15 * k);
        g.slice(pv.x, pv.y, l.len + 14, s.dir > 0 ? s.a0 : s.a0 - s.total, s.dir > 0 ? s.a0 + s.total : s.a0, false); g.fillPath();
        g.lineStyle(2, STONE_DARK, 0.5 + 0.4 * k);
        g.beginPath(); g.arc(pv.x, pv.y, l.len + 14, s.dir > 0 ? s.a0 : s.a0 - s.total, s.dir > 0 ? s.a0 + s.total : s.a0, false); g.strokePath();
        for (let t = 0.3; t < s.total; t += 0.55) {
          const aa = s.a0 + s.dir * t, r = l.len * 0.75;
          const px = pv.x + Math.cos(aa) * r, py = pv.y + Math.sin(aa) * r;
          const tx = -Math.sin(aa) * s.dir, ty = Math.cos(aa) * s.dir;
          g.lineStyle(3, STONE_DARK, 0.6 * k + 0.2);
          g.lineBetween(px, py, px - tx * 10 + Math.cos(aa) * 7, py - ty * 10 + Math.sin(aa) * 7);
          g.lineBetween(px, py, px - tx * 10 - Math.cos(aa) * 7, py - ty * 10 - Math.sin(aa) * 7);
        }
      }
    },

    drawAir(g, time) {
      for (const l of ladders) {
        const [a, b] = l.ends;
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
        const lift = 30;
        const A = { x: a.x, y: a.y - lift }, B = { x: b.x, y: b.y - lift };
        // Two rails and the rungs between them, paint-spattered, its wet stripe of the job's colour.
        for (const s of [-1, 1]) {
          g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(A.x + nx * 9 * s, A.y + ny * 9 * s, B.x + nx * 9 * s, B.y + ny * 9 * s);
          g.lineStyle(2.5, TIMBER_LIT, 1); g.lineBetween(A.x + nx * 9 * s - 1, A.y + ny * 9 * s - 1, B.x + nx * 9 * s - 1, B.y + ny * 9 * s - 1);
        }
        g.lineStyle(3, TIMBER, 1);
        for (let t = 14; t < len - 8; t += 21) g.lineBetween(A.x + ux * t + nx * 9, A.y + uy * t + ny * 9, A.x + ux * t - nx * 9, A.y + uy * t - ny * 9);
        for (let t = 30; t < len - 20; t += 47) {
          g.fillStyle(l.coat, 0.85); g.fillCircle(A.x + ux * t + nx * 10, A.y + uy * t + ny * 10, 2.5);
          g.fillStyle(t % 2 ? CADMIUM : VIRIDIAN, 0.7); g.fillCircle(A.x + ux * (t + 9) - nx * 8, A.y + uy * (t + 9) - ny * 8, 1.8);
        }
        // The two lads under it: smocks, caps, arms up to the rails; dazed, they clutch their heads.
        for (const i of [0, 1] as const) {
          const p = l.ends[i];
          const dazed = time < l.dazed[i];
          const bob = dazed ? 0 : Math.sin(l.bob + i * Math.PI) * 2;
          g.fillStyle(0x000000, 0.2); g.fillEllipse(p.x, p.y + 14, 26, 8);
          g.fillStyle(dim(CANVAS, 0.12), 1); g.fillEllipse(p.x, p.y + 1 + bob, 22, 26);
          g.fillStyle(CANVAS, 1); g.fillEllipse(p.x - 2, p.y - 1 + bob, 18, 22);
          g.fillStyle(l.coat, 0.8); g.fillCircle(p.x + 4, p.y + 4 + bob, 3);
          g.fillStyle(0xe0b894, 1); g.fillCircle(p.x, p.y - 16 + bob, 8);
          g.fillStyle(l.coat, 1); g.fillEllipse(p.x, p.y - 21 + bob, 17, 7);
          g.fillStyle(0x30343a, 1); g.fillCircle(p.x - 3, p.y - 15 + bob, 1.3); g.fillCircle(p.x + 3, p.y - 15 + bob, 1.3);
          if (dazed) {
            g.lineStyle(3, 0xe0b894, 1); g.lineBetween(p.x - 8, p.y - 4, p.x - 6, p.y - 20); g.lineBetween(p.x + 8, p.y - 4, p.x + 6, p.y - 20);
            for (let k = 0; k < 3; k++) {
              const aa = time / 160 + k * 2.09;
              g.fillStyle([VERMILION, CADMIUM, ULTRAMARINE][k], 1); g.fillCircle(p.x + Math.cos(aa) * 13, p.y - 30 + Math.sin(aa) * 4, 2.6);
            }
          } else {
            g.lineStyle(3, 0xe0b894, 1);
            g.lineBetween(p.x - 7, p.y - 4 + bob, p.x + nx * 9, p.y - lift + ny * 9);
            g.lineBetween(p.x + 7, p.y - 4 + bob, p.x - nx * 9, p.y - lift - ny * 9);
          }
        }
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 4;
      const w = 64 + ladders.length * 78;
      framePlate(g, x, y, w, 34);
      // A tiny ladder icon per pair, the two lads as pips: lit while walking, dark while dazed.
      ladders.forEach((l, k) => {
        const lx = x - w / 2 + 40 + k * 78, ly = y + 17;
        g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(lx, ly - 4, lx + 40, ly - 4); g.lineBetween(lx, ly + 4, lx + 40, ly + 4);
        for (let t = 4; t < 40; t += 7) g.lineBetween(lx + t, ly - 4, lx + t, ly + 4);
        g.fillStyle(l.coat, 1); g.fillRect(lx + 16, ly - 4, 6, 8);
        pip(g, lx - 6, ly, 4, time >= l.dazed[0], l.sweep ? GOLD : SIDE_PLAYER);
        pip(g, lx + 46, ly, 4, time >= l.dazed[1], l.sweep ? GOLD : SIDE_PLAYER);
        if (l.sweep) { g.lineStyle(2, SIDE_NPC, 0.6 + 0.4 * Math.sin(time / 90)); g.strokeRect(lx - 12, ly - 10, 64, 20); }
        else if (time < l.restAt) { g.fillStyle(CANVAS_DARK, 0.6); g.fillRect(lx, ly - 4, 40 * ((l.restAt - time) / 1400), 8); }
      });
    },

    destroy() { for (const l of ladders) for (const t of l.targets) t?.remove(); ladders.length = 0; },
  };
}

export const FALLEN_MIND_THE_LADDER: GimmickDef = {
  id: ID,
  rules: 'Two lads carry a ladder after you; it clouts whoever it swings into. Strike a lad: he stops, and the far end sweeps round him at your foe.',
  make,
};
