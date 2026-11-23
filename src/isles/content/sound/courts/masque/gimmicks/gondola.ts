import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { lit } from '../../../../../art/IsleArt';
import { bridge, gondola, kerb, palina } from '../art';
import { CANAL, CANAL_DEEP, CANAL_LIT, CANDLE, FW_RED, ISTRIA_LIT, STUCCO_OCHRE, VELVET } from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * Gondola — Gondolier Remo.
 *
 * Two canals cross the floor from wall to wall, each spanned by two humpbacked bridges. Off the
 * bridges, the canals must be waded: knee-deep and slow. And the canals are working water — on a
 * timetable, a gondola comes gliding down each one at speed, and whoever is standing in its way in
 * the water is knocked aside onto the bank, bruised and dazed. The bridges are safe; the hull
 * passes underneath. Before each run the canal-head lantern turns red and a bow-wave runs ahead
 * along the water.
 *
 * Remo is a gondolier: the mooring pole at the head of each canal is his to call from. Strike a
 * pole and a gondola puts off down that canal at once — "Oe, premi!" — with only a moment's
 * warning. Catch him wading, and call one on him. He'll do the same to you.
 */

const CANAL_HALF = 40;
const BRIDGE_HALF = 46;
const HULL_HALF = 60;
const SPEED = 430;
const WARN_MS = 1300;
const CALL_WARN_MS = 700;
const EVERY_MS = 5600;
const KNOCK_DMG = 10;

interface Run { dir: number; warnAt: number; goAt: number; hit: Set<Fighter>; called: boolean }
interface Canal { y: number; bridges: number[]; pole: { x: number; y: number }; target: StrikeTarget | null; run: Run | null; nextAt: number; dir: number; calledAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const canals: Canal[] = [top + 150, H - 140].map((y, i) => ({
    y, bridges: [W * 0.28, W * 0.72], pole: { x: 70, y: y - CANAL_HALF - 26 }, target: null, run: null,
    nextAt: 0, dir: i % 2 ? -1 : 1, calledAt: -9999,
  }));
  let started = false;
  const knocked: { x: number; y: number; at: number }[] = [];

  const onBridge = (c: Canal, x: number) => c.bridges.some((b) => Math.abs(x - b) < BRIDGE_HALF);
  const inCanal = (c: Canal, f: Fighter) => Math.abs(f.y - c.y) < CANAL_HALF && !onBridge(c, f.x);
  const wading = (f: Fighter) => alive(f) && canals.some((c) => inCanal(c, f));
  const hullX = (c: Canal, time: number) => {
    const r = c.run;
    if (!r || time < r.goAt) return null;
    const d = ((time - r.goAt) / 1000) * SPEED - 120;
    return r.dir > 0 ? d : W - d;
  };

  function launch(c: Canal, time: number, warn: number, called: boolean): void {
    c.run = { dir: c.dir, warnAt: time, goAt: time + warn, hit: new Set(), called };
    c.dir = -c.dir;
    ctx.sfx(called ? 'train-horn' : 'splash');
  }

  function call(c: Canal, by: 'player' | 'npc'): void {
    const time = ctx.scene.time.now;
    if (c.run || time - c.calledAt < 2500) return;
    c.calledAt = time;
    c.dir = 1; // from the pole's end
    launch(c, time, CALL_WARN_MS, true);
    c.nextAt = time + EVERY_MS;
    ctx.float(c.pole.x + 30, c.pole.y - 60, by === 'player' ? 'OE, PREMI!' : 'REMO CALLS A BOAT!', '#ffd890');
  }

  function knock(c: Canal, f: Fighter): void {
    // Thrown out onto the nearer bank.
    const side = f.y < c.y ? -1 : 1;
    const to = c.y + side * (CANAL_HALF + 26);
    ctx.nudge(f, 0, to - f.y);
    ctx.hit(f, ctx.hard ? 13 : KNOCK_DMG, f.x, f.y);
    ctx.stun(f, 450);
    knocked.push({ x: f.x, y: c.y, at: ctx.scene.time.now });
    ctx.sfx('hit-heavy');
    if (f === npc) ctx.float(f.x, f.y - 46, 'KNOCKED ASIDE!', '#9ad4ff');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        canals.forEach((c, i) => {
          c.nextAt = time + 2600 + i * (EVERY_MS / 2);
          c.target = ctx.target({ x: c.pole.x, y: c.pole.y - 20, r: 20, onStruck: (by) => call(c, by) });
        });
      }
      for (const c of canals) {
        if (!c.run && time >= c.nextAt - WARN_MS) {
          launch(c, time, WARN_MS, false);
          c.nextAt = time + WARN_MS + (ctx.hard ? 4600 : EVERY_MS);
        }
        const hx = hullX(c, time);
        if (hx == null || !c.run) continue;
        for (const f of [player, npc]) {
          if (!alive(f) || c.run.hit.has(f) || !inCanal(c, f)) continue;
          if (Math.abs(f.x - hx) < HULL_HALF) { c.run.hit.add(f); knock(c, f); }
        }
        if (hx < -200 || hx > W + 200) c.run = null;
      }
      for (let i = knocked.length - 1; i >= 0; i--) if (time - knocked[i].at > 600) knocked.splice(i, 1);
    },

    playerSpeedMult() { return wading(player) ? 0.55 : 1; },
    // Remo has waded these canals all his life.
    npcSpeedMult() { return wading(npc) ? 0.75 : 1; },

    npcSeek() {
      const time = ctx.scene.time.now;
      // Out of any canal with a boat coming.
      for (const c of canals) {
        if (!inCanal(c, npc) || !c.run) continue;
        const side = npc.y < c.y ? -1 : 1;
        return { x: npc.x, y: clamp(c.y + side * (CANAL_HALF + 50), top + 40, H - 40) };
      }
      // You are wading: call a boat on you.
      for (const c of canals) {
        if (!inCanal(c, player) || c.run || time - c.calledAt < 2500) continue;
        return { x: c.pole.x + 34, y: c.pole.y + 10 };
      }
      return null;
    },

    drawGround(g, time) {
      for (const c of canals) {
        // Water, banks and kerbs.
        g.fillStyle(CANAL_DEEP, 1); g.fillRect(0, c.y - CANAL_HALF, W, CANAL_HALF * 2);
        g.fillStyle(CANAL, 0.85); g.fillRect(0, c.y - CANAL_HALF + 6, W, CANAL_HALF * 2 - 12);
        for (let i = 0; i < 14; i++) {
          const x = ((i * 89 + time / 30) % (W + 60)) - 30, y = c.y - CANAL_HALF + 12 + ((i * 23) % (CANAL_HALF * 2 - 24));
          g.lineStyle(1, CANAL_LIT, 0.35); g.lineBetween(x, y, x + 20, y);
        }
        kerb(g, 0, c.y - CANAL_HALF - 6, W, 6);
        kerb(g, 0, c.y + CANAL_HALF, W, 6);
        // Waders' rings in the water.
        for (const f of [player, npc]) {
          if (!alive(f) || !inCanal(c, f)) continue;
          const ph = (time / 500) % 1;
          g.lineStyle(1.5, lit(CANAL, 0.4), 0.6 * (1 - ph)); g.strokeEllipse(f.x, f.y + 4, 30 + ph * 30, 10 + ph * 10);
        }
        // The warning: the bow-wave running ahead along the canal.
        const r = c.run;
        if (r && time < r.goAt) {
          const k = clamp((time - r.warnAt) / Math.max(1, r.goAt - r.warnAt), 0, 1);
          const from = r.dir > 0 ? 0 : W;
          for (let i = 0; i < 8; i++) {
            const x = from + r.dir * ((k * W + i * 40) % W);
            g.lineStyle(2, ISTRIA_LIT, 0.2 + k * 0.5);
            g.lineBetween(x, c.y - 14, x - r.dir * 16, c.y - 26); g.lineBetween(x, c.y + 14, x - r.dir * 16, c.y + 26);
          }
          g.fillStyle(FW_RED, 0.08 + k * 0.14); g.fillRect(0, c.y - CANAL_HALF, W, CANAL_HALF * 2);
        }
        // The gondola itself, gliding under the bridges.
        const hx = hullX(c, time);
        if (hx != null && r) {
          g.lineStyle(2, ISTRIA_LIT, 0.5);
          g.lineBetween(hx - r.dir * 70, c.y - 10, hx - r.dir * 140, c.y - 28); g.lineBetween(hx - r.dir * 70, c.y + 10, hx - r.dir * 140, c.y + 28);
          gondola(g, hx, c.y + 6, 1.1, r.dir, true, time / 1000);
        }
        for (const b of c.bridges) bridge(g, b, c.y, CANAL_HALF * 2 + 30, BRIDGE_HALF * 2, false);
      }
      for (const k of knocked) {
        const kk = (time - k.at) / 600;
        for (let i = 0; i < 8; i++) { const a = Math.PI + (i / 7) * Math.PI; g.fillStyle(0xcfeff0, 1 - kk); g.fillCircle(k.x + Math.cos(a) * kk * 40, k.y + Math.sin(a) * kk * 30, 2.4); }
      }
    },

    drawAir(g, time) {
      // The mooring poles and their lanterns: gold at rest, red when a boat is due.
      for (const c of canals) {
        palina(g, c.pole.x, c.pole.y, VELVET, STUCCO_OCHRE);
        const due = c.run != null;
        g.fillStyle(due ? FW_RED : CANDLE, due ? 0.6 + Math.sin(time / 70) * 0.4 : 0.8);
        g.fillRect(c.pole.x + 6, c.pole.y - 70, 9, 11);
        g.lineStyle(1, 0x2a2830, 1); g.strokeRect(c.pole.x + 6, c.pole.y - 70, 9, 11);
        const far = W - 40;
        g.fillStyle(due ? FW_RED : CANDLE, 0.7); g.fillCircle(far, c.y - CANAL_HALF - 14, 5);
      }
    },

    destroy() { for (const c of canals) c.target?.remove(); },
  };
}

export const GONDOLA: GimmickDef = {
  id: 'masque-gondola',
  rules: 'Two canals cross the floor: wading is slow, bridges are dry. Gondolas glide down on a timetable and knock aside whoever is in the water. Strike a mooring pole to call one at once.',
  make,
};
