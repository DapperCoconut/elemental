import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { bellBuoyBody } from '../art';
import { BRASS, BRASS_LIT, FOAM, PILE, ROPE_DARK, SEA, SEA_DEEP, SEA_LIT, SEA_SHALLOW } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Bell Buoy — Buoy-Keeper Rook.
 *
 * A bell buoy rides at its mooring in the middle of the flats, turning slowly on its chain.
 * Shoulder into it and the bell tolls: the sound rolls out of the bell's *mouth* — two loud
 * fans, fore and aft along the line it swings on — and whoever the toll catches is rung like a
 * bell themselves: stunned (rooted to the spot, no casting) and jarred for a little damage. Side-on to the swing it is quiet. Whoever rang it stands at the
 * heart of the sound and is never caught by their own toll.
 *
 * Then the bell has to swing back, which takes a while — you can see it settle.
 *
 * Rook keeps the buoy. He rings it when you stand in one of its loud fans, and otherwise waits
 * in its quiet lee. Two can play: the swing line is painted faintly on the water at all times,
 * and the bell does not know whose shoulder it felt.
 */

const BUMP_R = 50;
const FLOAT_R = 34;
const RING_SPEED = 290;
const RING_MAX = 460;
const BAND = 24;
/** Half-width of each loud fan. */
const FAN_HALF = 0.62;
const DAZE_MS = 1300;
const TOLL_DMG = 6;

interface Toll { at: number; axis: number; ringer: Fighter; caught: Set<Fighter> }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const buoy: Pt = { x: W / 2, y: top + (H - top) * 0.54 };
  const recharge = ctx.hard ? 5000 : 6500;
  const spin = ctx.hard ? 0.32 : 0.24;
  let readyAt = 0;
  let tolls: Toll[] = [];
  let started = false;
  let t0 = 0;
  let swingKick = 0;
  const dazed = new Map<Fighter, number>();

  const axisAt = (time: number): number => ((time - t0) / 1000) * spin;
  /** Is the angle from the buoy to a point inside one of the loud fans of `axis`? */
  const inFan = (axis: number, x: number, y: number): boolean => {
    let d = Math.atan2(y - buoy.y, x - buoy.x) - axis;
    d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
    return d < FAN_HALF || Math.PI - d < FAN_HALF;
  };

  function ring(by: Fighter, time: number): void {
    readyAt = time + recharge;
    swingKick = 1;
    const axis = axisAt(time);
    tolls.push({ at: time, axis, ringer: by, caught: new Set() });
    ctx.sfx('sonic-pulse');
    ctx.sfx('crystal-chime');
    ctx.float(buoy.x, buoy.y - 80, by === player ? 'YOU RING THE BELL' : 'ROOK RINGS THE BELL', by === player ? '#a6cfc6' : '#f2d58a');
  }

  function daze(f: Fighter, time: number): void {
    dazed.set(f, time + DAZE_MS);
    ctx.stun(f, DAZE_MS);
    ctx.hit(f, ctx.hard ? TOLL_DMG + 3 : TOLL_DMG, f.x, f.y);
    ctx.float(f.x, f.y - 46, 'TOLLED', '#f2d58a');
    ctx.sfx('status-stun');
  }

  const isDazed = (f: Fighter) => (dazed.get(f) ?? 0) > ctx.scene.time.now;

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; t0 = time; readyAt = time + 2000; }
      swingKick = Math.max(0, swingKick - dt * 0.45);
      // The float is solid: shoulder into it, never through it.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const d = dist(f.x, f.y, buoy.x, buoy.y);
        if (d < FLOAT_R) {
          const ux = (f.x - buoy.x) / (d || 1), uy = (f.y - buoy.y) / (d || 1);
          ctx.nudge(f, ux * (FLOAT_R - d), uy * (FLOAT_R - d));
        }
        if (time >= readyAt && d < BUMP_R) ring(f, time);
      }
      // Tolls roll outward through their fans.
      for (const t of tolls) {
        const r = 40 + ((time - t.at) / 1000) * RING_SPEED;
        for (const f of [player, npc]) {
          if (!alive(f) || f === t.ringer || t.caught.has(f)) continue;
          const d = dist(f.x, f.y, buoy.x, buoy.y);
          if (Math.abs(d - r) < BAND && inFan(t.axis, f.x, f.y)) {
            t.caught.add(f);
            daze(f, time);
          }
        }
      }
      tolls = tolls.filter((t) => 40 + ((time - t.at) / 1000) * RING_SPEED < RING_MAX + BAND);
    },

    // A rung fighter is jarred open: hits on them land a little harder while dazed.
    playerTakenMult: () => (isDazed(player) ? 1.2 : 1),
    npcTakenMult: () => (isDazed(npc) ? 1.2 : 1),

    npcSeek() {
      const time = ctx.scene.time.now;
      const axis = axisAt(time);
      const pd = dist(player.x, player.y, buoy.x, buoy.y);
      // You are in a loud fan, within reach of the toll: go and ring it.
      if (time >= readyAt - 400 && pd > 90 && pd < RING_MAX - 40 && inFan(axis, player.x, player.y)) {
        const a = Math.atan2(npc.y - buoy.y, npc.x - buoy.x);
        return { x: buoy.x + Math.cos(a) * 30, y: buoy.y + Math.sin(a) * 30 };
      }
      // Otherwise wait in the quiet lee, on your side of the buoy.
      const lee = axis + Math.PI / 2;
      const side = Math.cos(lee) * (player.x - buoy.x) + Math.sin(lee) * (player.y - buoy.y) > 0 ? 1 : -1;
      return {
        x: clamp(buoy.x + Math.cos(lee) * side * 150, 60, W - 60),
        y: clamp(buoy.y + Math.sin(lee) * side * 150, top + 60, H - 50),
      };
    },

    drawGround(g, time) {
      const axis = axisAt(time);
      // The mooring: a patch of open water round the buoy, the chain running down.
      g.fillStyle(SEA_DEEP, 0.6); g.fillEllipse(buoy.x, buoy.y + 6, 190, 90);
      g.fillStyle(SEA, 0.65); g.fillEllipse(buoy.x, buoy.y + 4, 160, 70);
      g.fillStyle(SEA_SHALLOW, 0.4); g.fillEllipse(buoy.x - 20, buoy.y - 4, 80, 22);
      for (let i = 0; i < 3; i++) {
        const k = ((time / 1800) + i / 3) % 1;
        g.lineStyle(1.4, SEA_LIT, 0.55 * (1 - k)); g.strokeEllipse(buoy.x, buoy.y + 6, 60 + k * 130, 24 + k * 50);
      }
      g.lineStyle(2, ROPE_DARK, 0.8);
      for (let k = 0; k < 6; k++) g.strokeEllipse(buoy.x + 30 + k * 7, buoy.y + 16 + k * 3, 6, 4);
      // The swing line: two faint fans on the water, always showing where the toll will be loud.
      for (const s of [0, Math.PI]) {
        const a = axis + s;
        g.fillStyle(BRASS_LIT, 0.06);
        g.beginPath(); g.moveTo(buoy.x, buoy.y);
        g.arc(buoy.x, buoy.y, RING_MAX, a - FAN_HALF, a + FAN_HALF, false);
        g.closePath(); g.fillPath();
        g.lineStyle(1.5, BRASS, 0.25);
        g.lineBetween(buoy.x + Math.cos(a - FAN_HALF) * 70, buoy.y + Math.sin(a - FAN_HALF) * 70, buoy.x + Math.cos(a - FAN_HALF) * RING_MAX, buoy.y + Math.sin(a - FAN_HALF) * RING_MAX);
        g.lineBetween(buoy.x + Math.cos(a + FAN_HALF) * 70, buoy.y + Math.sin(a + FAN_HALF) * 70, buoy.x + Math.cos(a + FAN_HALF) * RING_MAX, buoy.y + Math.sin(a + FAN_HALF) * RING_MAX);
      }
      // Recharge: a brass arc closing round the float as the bell swings back to rest.
      const k = time >= readyAt ? 1 : 1 - (readyAt - time) / recharge;
      g.lineStyle(4, k >= 1 ? BRASS_LIT : BRASS, k >= 1 ? 0.9 : 0.6);
      g.beginPath(); g.arc(buoy.x, buoy.y + 4, BUMP_R + 4, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      if (k >= 1) { g.lineStyle(1.5, FOAM, 0.4 + Math.sin(time / 200) * 0.2); g.strokeCircle(buoy.x, buoy.y + 4, BUMP_R + 10); }
      // Tolls: bright brass arcs in the two fans, with sound-lines trailing.
      for (const t of tolls) {
        const r = 40 + ((time - t.at) / 1000) * RING_SPEED;
        const fade = clamp(1 - r / (RING_MAX + BAND), 0, 1);
        for (const s of [0, Math.PI]) {
          const a = t.axis + s;
          g.lineStyle(BAND * 1.4, BRASS, 0.18 * fade);
          g.beginPath(); g.arc(buoy.x, buoy.y, r, a - FAN_HALF, a + FAN_HALF, false); g.strokePath();
          g.lineStyle(5, BRASS_LIT, 0.9 * fade);
          g.beginPath(); g.arc(buoy.x, buoy.y, r, a - FAN_HALF, a + FAN_HALF, false); g.strokePath();
          for (const back of [16, 30]) {
            if (r - back < 40) continue;
            g.lineStyle(2, BRASS_LIT, 0.45 * fade);
            g.beginPath(); g.arc(buoy.x, buoy.y, r - back, a - FAN_HALF * 0.8, a + FAN_HALF * 0.8, false); g.strokePath();
          }
        }
      }
    },

    drawAir(g, time) {
      const swing = Math.sin(time / 170) * (0.15 + swingKick * 1.1) + Math.sin(time / 900) * 0.1;
      const tilt = Math.sin(time / 1300) * 0.1 + swingKick * Math.sin(time / 120) * 0.12;
      bellBuoyBody(g, buoy.x, buoy.y, 1.35, swing, tilt);
      // Dazed fighters: a little ring of bell-notes circling the head.
      for (const f of [player, npc]) {
        if (!isDazed(f)) continue;
        for (let i = 0; i < 3; i++) {
          const a = time / 180 + (i * Math.PI * 2) / 3;
          const x = f.x + Math.cos(a) * 20, y = f.y - 40 + Math.sin(a) * 6;
          g.fillStyle(BRASS_LIT, 1); g.fillEllipse(x, y, 7, 5);
          g.lineStyle(1.5, PILE, 1); g.lineBetween(x + 3, y, x + 3, y - 9);
        }
      }
    },

    drawHud(g, time) {
      // Bell readiness in the top-centre: a small brass bell, filling as it settles.
      const x = W / 2, y = top + 18;
      const k = time >= readyAt ? 1 : clamp(1 - (readyAt - time) / recharge, 0, 1);
      g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 15);
      g.fillStyle(k >= 1 ? BRASS_LIT : 0x4a3e26, 1);
      g.fillTriangle(x - 8, y + 6, x + 8, y + 6, x, y - 9);
      g.fillCircle(x, y - 3, 5);
      g.lineStyle(2.5, BRASS, 0.9);
      g.beginPath(); g.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
    },

    destroy() {
      dazed.clear();
    },
  };
}

export const BELL_BUOY: GimmickDef = {
  id: 'tidewater-bell-buoy',
  rules: 'Shoulder the buoy to toll its bell: the sound rolls out along the swing line and dazes whoever it catches. Side-on is quiet. The ringer is safe. Rook rings it too.',
  make,
};
