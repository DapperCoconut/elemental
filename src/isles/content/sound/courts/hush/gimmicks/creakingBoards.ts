import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Rect } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { IRON, LAMP, LAMP_GLOW, SNOW_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT, WARDEN } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Creaking Boards — Sneak Tiptoe.
 *
 * Tiptoe walks the boardwalk by the mere at night, and the wardens' great lantern hangs over it on
 * a gallows-arm. The room is dark. Loose boards are chalked across the floor; **walk the length of
 * one and it creaks**, and the lantern's hood swings to the creak and throws its beam down on the
 * spot a moment later — a blow of hard light on whoever is standing there.
 *
 * A dash keeps your feet off the boards (no creak), and stepping on and off a corner is too short
 * to make one sing. Better: creak a board right beside Tiptoe and step away — the lantern doesn't
 * care whose foot it was.
 */

const CREAK_LEN = 46;
const RUN_SPEED = 120;
const DASH_SPEED = 520;
const STRIKE_R = 66;
const SWING_MS = 420;
const HOLD_MS = 560;

interface Board { r: Rect; vertical: boolean; seed: number; creakAt: number }
interface Strike { x: number; y: number; at: number; fireAt: number; done: boolean }
interface Feet { x: number; y: number; acc: number; on: Board | null; lastCreak: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const boards: Board[] = [];
  const strikes: Strike[] = [];
  const lamp: Pt = { x: W / 2, y: top + 26 };
  /** Where the beam is pointing (eases toward the newest strike). */
  let aim: Pt = { x: W / 2, y: (top + H) / 2 };
  let started = false;
  let relayAt = 0;
  const feet = new Map<Fighter, Feet>();

  function layBoards(): void {
    boards.length = 0;
    const count = ctx.hard ? 11 : 9;
    let tries = 0;
    while (boards.length < count && tries++ < 300) {
      const vertical = rng() < 0.4;
      const w = vertical ? 36 : 128, h = vertical ? 128 : 36;
      const x = 60 + rng() * (W - 120 - w), y = top + 60 + rng() * (H - top - 100 - h);
      const r = { x, y, w, h };
      if (boards.some((b) => r.x < b.r.x + b.r.w + 30 && r.x + r.w + 30 > b.r.x && r.y < b.r.y + b.r.h + 30 && r.y + r.h + 30 > b.r.y)) continue;
      boards.push({ r, vertical, seed: rng() * 10, creakAt: -9999 });
    }
  }

  const boardAt = (x: number, y: number): Board | null => {
    for (const b of boards) if (x > b.r.x - 4 && x < b.r.x + b.r.w + 4 && y > b.r.y - 4 && y < b.r.y + b.r.h + 4) return b;
    return null;
  };

  function creak(f: Fighter, b: Board, time: number): void {
    b.creakAt = time;
    const ft = feet.get(f);
    if (ft) ft.lastCreak = time;
    if (strikes.filter((s) => !s.done).length >= 2) return;
    strikes.push({ x: f.x, y: f.y, at: time, fireAt: time + ctx.tk.warn(SWING_MS + HOLD_MS), done: false });
    ctx.float(f.x, f.y - 40, 'CREAK', '#c8a070');
    ctx.sfx('snap-back');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        layBoards();
        relayAt = time + 16000;
        for (const f of [player, npc]) feet.set(f, { x: f.x, y: f.y, acc: 0, on: null, lastCreak: -9999 });
      }
      // The wardens re-lay the floor now and then (the old boards fade, new chalk appears).
      if (time >= relayAt) { relayAt = time + 16000; layBoards(); ctx.banner('THE BOARDS ARE RE-LAID', '#c8a070'); }
      // Footfalls.
      for (const [f, ft] of feet) {
        if (!alive(f)) continue;
        const step = dist(ft.x, ft.y, f.x, f.y);
        const speed = dt > 0 ? step / dt : 0;
        ft.x = f.x; ft.y = f.y;
        const b = boardAt(f.x, f.y);
        if (b !== ft.on) { ft.on = b; ft.acc = 0; }
        if (!b || speed < RUN_SPEED || speed > DASH_SPEED || time - ft.lastCreak < 900) continue;
        ft.acc += step;
        if (ft.acc >= CREAK_LEN) { ft.acc = 0; creak(f, b, time); }
      }
      // The lantern's beam.
      const next = strikes.find((s) => !s.done);
      if (next) { const k = Math.min(1, dt * 7); aim = { x: aim.x + (next.x - aim.x) * k, y: aim.y + (next.y - aim.y) * k }; }
      for (const s of strikes) {
        if (s.done || time < s.fireAt) continue;
        s.done = true;
        ctx.sfx('light-beam');
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, s.x, s.y) > STRIKE_R) continue;
          ctx.hit(f, ctx.hard ? 17 : 14, f.x, f.y);
          const d = Math.max(1, dist(f.x, f.y, s.x, s.y));
          ctx.nudge(f, ((f.x - s.x) / d) * 60, ((f.y - s.y) / d) * 60);
          ctx.float(f.x, f.y - 50, 'CAUGHT', '#ffd88a');
        }
      }
      for (let i = strikes.length - 1; i >= 0; i--) if (strikes[i].done && time > strikes[i].fireAt + 500) strikes.splice(i, 1);
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Out from under a beam that is coming down.
      for (const s of strikes) {
        if (s.done || dist(npc.x, npc.y, s.x, s.y) > STRIKE_R + 40) continue;
        const d = Math.max(1, dist(npc.x, npc.y, s.x, s.y));
        return { x: clamp(s.x + ((npc.x - s.x) / d) * (STRIKE_R + 90), 60, W - 60), y: clamp(s.y + ((npc.y - s.y) / d) * (STRIKE_R + 90), top + 50, H - 40) };
      }
      // You beside a board: walk it, to bring the light down on you.
      let best: Board | null = null, bd = 150;
      for (const b of boards) {
        const c = { x: b.r.x + b.r.w / 2, y: b.r.y + b.r.h / 2 };
        const d = dist(c.x, c.y, player.x, player.y);
        if (d < bd) { bd = d; best = b; }
      }
      if (best) {
        const ft = feet.get(npc);
        const onIt = ft?.on === best;
        // Walk from one end of it to the other.
        const end = (Math.floor(ctx.scene.time.now / 900) % 2) === 0;
        if (best.vertical) return { x: best.r.x + best.r.w / 2, y: end ? best.r.y + 10 : best.r.y + best.r.h - 10 };
        return { x: end || onIt ? best.r.x + 10 : best.r.x + best.r.w - 10, y: best.r.y + best.r.h / 2 };
      }
      return null;
    },

    drawGround(g, time) {
      // The dark floor of the boardwalk: planks running the width, the loose ones chalked.
      for (const b of boards) {
        const fade = clamp((time - (relayAt - 16000)) / 500, 0, 1);
        const n = Math.round((b.vertical ? b.r.w : b.r.h) / 12);
        for (let i = 0; i < n; i++) {
          const c = mixPlank(i + b.seed);
          if (b.vertical) { g.fillStyle(c, fade); g.fillRect(b.r.x + i * 12, b.r.y, 11, b.r.h); }
          else { g.fillStyle(c, fade); g.fillRect(b.r.x, b.r.y + i * 12, b.r.w, 11); }
        }
        g.lineStyle(2, TIMBER_DARK, fade); g.strokeRect(b.r.x, b.r.y, b.r.w, b.r.h);
        // Nails sprung, and the chalk cross that marks a loose board.
        const cx = b.r.x + b.r.w / 2, cy = b.r.y + b.r.h / 2;
        g.lineStyle(2, SNOW_LIT, 0.7 * fade);
        g.lineBetween(cx - 9, cy - 9, cx + 9, cy + 9); g.lineBetween(cx + 9, cy - 9, cx - 9, cy + 9);
        for (const [nx, ny] of [[b.r.x + 6, b.r.y + 6], [b.r.x + b.r.w - 6, b.r.y + b.r.h - 6]] as [number, number][]) { g.fillStyle(IRON, fade); g.fillCircle(nx, ny, 2); }
        // A creak: the board bows and dust jumps from its cracks.
        if (time - b.creakAt < 450) {
          const k = (time - b.creakAt) / 450;
          g.lineStyle(3, lit(TIMBER_LIT, 0.4), 1 - k); g.strokeRect(b.r.x - k * 6, b.r.y - k * 6, b.r.w + k * 12, b.r.h + k * 12);
          for (let i = 0; i < 6; i++) { g.fillStyle(0xd8c8a8, 0.7 * (1 - k)); g.fillCircle(b.r.x + ((i * 37) % b.r.w), b.r.y + ((i * 23) % b.r.h) - k * 16, 2); }
        }
      }
      // Where the beam will fall: a ring of light tightening on the spot.
      for (const s of strikes) {
        if (s.done) {
          const k = clamp((time - s.fireAt) / 500, 0, 1);
          g.fillStyle(LAMP, 0.55 * (1 - k)); g.fillCircle(s.x, s.y, STRIKE_R * (1 + k * 0.2));
          continue;
        }
        const k = clamp((time - s.at) / Math.max(1, s.fireAt - s.at), 0, 1);
        g.fillStyle(LAMP_GLOW, 0.08 + k * 0.18); g.fillCircle(s.x, s.y, STRIKE_R);
        g.lineStyle(2, LAMP, 0.5 + k * 0.4); g.strokeCircle(s.x, s.y, STRIKE_R * (1.5 - k * 0.5));
      }
    },

    drawAir(g, time) {
      // The dark: a dim veil over the room, lifted where the lantern looks.
      g.fillStyle(0x0c1018, 0.3); g.fillRect(0, top, W, H - top);
      glow(g, aim.x, aim.y, 120, LAMP_GLOW, 0.04, 4);
      // The lantern on its gallows-arm at the top, hood turned toward the aim.
      const a = Math.atan2(aim.y - lamp.y, aim.x - lamp.x);
      g.lineStyle(6, TIMBER_DARK, 1); g.lineBetween(lamp.x - 120, top - 4, lamp.x, top - 4);
      g.lineStyle(2, IRON, 1); g.lineBetween(lamp.x, top - 4, lamp.x, lamp.y - 12);
      const live = strikes.some((s) => !s.done);
      if (live) {
        // The beam: a long cone of light down to the spot.
        const d = dist(lamp.x, lamp.y, aim.x, aim.y);
        const nx = -Math.sin(a), ny = Math.cos(a);
        g.fillStyle(LAMP, 0.12);
        g.fillTriangle(lamp.x + nx * 6, lamp.y + ny * 6, lamp.x - nx * 6, lamp.y - ny * 6, lamp.x + Math.cos(a) * d + nx * STRIKE_R, lamp.y + Math.sin(a) * d + ny * STRIKE_R);
        g.fillTriangle(lamp.x - nx * 6, lamp.y - ny * 6, lamp.x + Math.cos(a) * d + nx * STRIKE_R, lamp.y + Math.sin(a) * d + ny * STRIKE_R, lamp.x + Math.cos(a) * d - nx * STRIKE_R, lamp.y + Math.sin(a) * d - ny * STRIKE_R);
      }
      glow(g, lamp.x, lamp.y, 30, LAMP_GLOW, live ? 0.1 : 0.05, 3);
      g.fillStyle(WARDEN, 1); g.fillRect(lamp.x - 9, lamp.y - 14, 18, 5);
      g.fillStyle(LAMP, 1); g.fillRect(lamp.x - 8, lamp.y - 10, 16, 18);
      g.lineStyle(2, IRON, 1); g.strokeRect(lamp.x - 9, lamp.y - 11, 18, 20);
      // The hood: an iron cowl that turns to face where the light falls.
      const hx = lamp.x - Math.cos(a) * 10, hy = lamp.y - Math.sin(a) * 10;
      g.fillStyle(IRON, 1);
      g.fillTriangle(hx - Math.sin(a) * 16, hy + Math.cos(a) * 16, hx + Math.sin(a) * 16, hy - Math.cos(a) * 16, hx - Math.cos(a) * 14, hy - Math.sin(a) * 14);
      // A footfall meter over each fighter on a board: how close the board is to singing.
      for (const [f, ft] of feet) {
        if (!alive(f) || !ft.on || ft.acc <= 0) continue;
        const k = ft.acc / CREAK_LEN;
        g.lineStyle(3, dim(TIMBER_LIT, 0.1), 0.85);
        g.beginPath(); g.arc(f.x, f.y - 44, 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },
  };

  function mixPlank(i: number): number {
    return [TIMBER, dim(TIMBER, 0.12), TIMBER_LIT, dim(TIMBER, 0.06)][Math.floor(i) % 4];
  }
}

export const CREAKING_BOARDS: GimmickDef = {
  id: 'hush-creaking-boards',
  rules: 'Loose boards are chalked across a dark floor. Walk the length of one and it creaks — the warden\'s lantern swings to the creak and strikes. Dash over them, or creak one beside the foe.',
  make,
};
