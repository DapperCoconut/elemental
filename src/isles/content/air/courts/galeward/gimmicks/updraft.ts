import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { updraftShimmer, ventGrate } from '../art';
import { CANVAS, CANVAS_SHADE, KITE_OCHRE, TIMBER_DARK } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Updraft — Glider Swift.
 *
 * Swift jumps off the cliffs for a living, and this yard is cut over the fissures where the
 * spire breathes out. Four vent grates are set in the floor, and each one blows in turn — the
 * grille shimmers, then roars. Step onto a blowing vent and the updraft throws you up into the
 * sky on a canvas wing: while you are aloft nothing can touch you, and you cannot touch anything,
 * but you can steer, fast, wherever you like.
 *
 * And then you come down. A shadow grows on the floor under the glider — a ring that closes as
 * you fall — and you land in a slam that hurts everyone near the shadow but you. Glide over your
 * foe and drop on them; or watch for their shadow and step out of it. Swift has done this all her
 * life, and she is very good at the falling part.
 */

const VENT_R = 34;
const BLOW_MS = 3000;
const REST_MS = 2400;
const BUILD_MS = 900;
const AIR_MS = 2300;
const FALL_MS = 750;
const AIR_SPEED = 1.55;
const SLAM_R = 105;
const SLAM_DMG = 15;
const RELAUNCH_MS = 2600;

interface Vent { x: number; y: number; phase: number }
interface Flight { f: Fighter; at: number; landAt: number; landed: boolean; nextOk: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const midY = (top + H) / 2 + 10;
  const vents: Vent[] = [
    { x: W * 0.22, y: top + 120, phase: 0 }, { x: W * 0.78, y: top + 130, phase: 0.5 },
    { x: W * 0.3, y: H - 90, phase: 0.75 }, { x: W * 0.72, y: H - 80, phase: 0.25 },
  ];
  const period = BLOW_MS + REST_MS;
  let t0 = -1;
  const flights = new Map<Fighter, Flight>();
  for (const f of [player, npc]) flights.set(f, { f, at: -1, landAt: 0, landed: true, nextOk: 0 });
  let slams: { x: number; y: number; at: number }[] = [];

  /** 0 resting, 0..1 building, 1 blowing. */
  const ventState = (v: Vent, time: number): number => {
    const ph = (((time - t0) / period + v.phase) % 1) * period;
    if (ph < BLOW_MS) return 1;
    const toBlow = period - ph;
    return toBlow < BUILD_MS ? 1 - toBlow / BUILD_MS : 0;
  };
  const aloft = (f: Fighter, time: number): boolean => {
    const fl = flights.get(f);
    return !!fl && !fl.landed && time < fl.landAt;
  };

  function land(fl: Flight, time: number): void {
    fl.landed = true;
    fl.nextOk = time + RELAUNCH_MS;
    const f = fl.f;
    slams.push({ x: f.x, y: f.y, at: time });
    ctx.sfx('stone-slam');
    ctx.flash(f.x, f.y, 0xffffff);
    const other = f === player ? npc : player;
    if (alive(other) && !aloft(other, time) && dist(other.x, other.y, f.x, f.y) < SLAM_R) {
      ctx.hit(other, ctx.hard ? SLAM_DMG + 3 : SLAM_DMG, other.x, other.y);
      const d = dist(other.x, other.y, f.x, f.y) || 1;
      ctx.nudge(other, ((other.x - f.x) / d) * 60, ((other.y - f.y) / d) * 60);
      ctx.float(other.x, other.y - 50, other === player ? 'DROPPED ON' : 'LANDED ON HER', other === player ? '#ff9a7a' : '#ffe08a');
    }
  }

  return {
    update(time) {
      if (t0 < 0) t0 = time;
      for (const fl of flights.values()) {
        const f = fl.f;
        if (!alive(f)) continue;
        if (!fl.landed && time >= fl.landAt) land(fl, time);
        if (fl.landed && time >= fl.nextOk) {
          for (const v of vents) {
            if (ventState(v, time) < 1 || dist(f.x, f.y, v.x, v.y) > VENT_R) continue;
            fl.at = time; fl.landAt = time + AIR_MS; fl.landed = false;
            ctx.float(f.x, f.y - 50, 'UPDRAFT!', '#ffffff');
            ctx.sfx('wings');
            break;
          }
        }
      }
      slams = slams.filter((s) => time - s.at < 500);
    },

    playerSpeedMult: () => (aloft(player, ctx.scene.time.now) ? AIR_SPEED : 1),
    npcSpeedMult: () => (aloft(npc, ctx.scene.time.now) ? AIR_SPEED : 1),
    // Aloft, nothing touches you — and nothing you throw from up there lands either.
    playerTakenMult: () => {
      const t = ctx.scene.time.now;
      return aloft(player, t) || aloft(npc, t) ? 0 : 1;
    },
    npcTakenMult: () => {
      const t = ctx.scene.time.now;
      return aloft(npc, t) || aloft(player, t) ? 0 : 1;
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      if (t0 < 0) return null;
      // Aloft: glide over you to drop.
      if (aloft(npc, time)) return { x: player.x, y: player.y };
      // Your shadow is falling: get out of it.
      const pf = flights.get(player);
      if (pf && aloft(player, time) && pf.landAt - time < FALL_MS + 300 && dist(npc.x, npc.y, player.x, player.y) < SLAM_R + 30) {
        const d = dist(npc.x, npc.y, player.x, player.y) || 1;
        return { x: clamp(npc.x + ((npc.x - player.x) / d) * 200, 60, W - 60), y: clamp(npc.y + ((npc.y - player.y) / d) * 200, top + 50, H - 40) };
      }
      // Otherwise a vent that is about to blow or blowing, if she can launch.
      const nf = flights.get(npc);
      if (nf && time < nf.nextOk) return null;
      let best: Vent | null = null, bd = Infinity;
      for (const v of vents) {
        if (ventState(v, time) <= 0.3) continue;
        const d = dist(npc.x, npc.y, v.x, v.y);
        if (d < bd) { bd = d; best = v; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      if (t0 < 0) return;
      // The fissure the vents sit on, a dark seam through the yard.
      g.lineStyle(6, 0x1e2230, 0.35);
      g.beginPath(); g.moveTo(vents[0].x, vents[0].y); g.lineTo(W / 2, midY); g.lineTo(vents[3].x, vents[3].y); g.strokePath();
      g.beginPath(); g.moveTo(vents[1].x, vents[1].y); g.lineTo(W / 2, midY); g.lineTo(vents[2].x, vents[2].y); g.strokePath();
      for (const v of vents) {
        const s = ventState(v, time);
        if (s >= 1) { g.fillStyle(0xffffff, 0.12 + Math.sin(time / 80) * 0.04); g.fillCircle(v.x, v.y, VENT_R + 10); }
        else if (s > 0) { g.lineStyle(3, 0xffffff, 0.3 + s * 0.5); g.beginPath(); g.arc(v.x, v.y, VENT_R + 6, -Math.PI / 2, -Math.PI / 2 + s * Math.PI * 2, false); g.strokePath(); }
        ventGrate(g, v.x, v.y, VENT_R);
      }
      // Each glider's falling shadow: a ring that closes in as they come down.
      for (const fl of flights.values()) {
        if (fl.landed || !alive(fl.f)) continue;
        const f = fl.f;
        const toLand = fl.landAt - time;
        const fall = clamp(1 - toLand / FALL_MS, 0, 1);
        g.fillStyle(0x000000, 0.12 + fall * 0.2); g.fillEllipse(f.x, f.y + 6, 50 + fall * 20, 18 + fall * 8);
        if (toLand < FALL_MS + 200) {
          const col = f === player ? 0x9fd0f2 : 0xff8a5a;
          g.fillStyle(col, 0.08 + fall * 0.14); g.fillCircle(f.x, f.y, SLAM_R);
          g.lineStyle(2, col, 0.5 + fall * 0.4); g.strokeCircle(f.x, f.y, SLAM_R * (1.4 - fall * 0.4));
        }
      }
      for (const s of slams) {
        const k = (time - s.at) / 500;
        g.lineStyle(4 * (1 - k), 0xffffff, 1 - k); g.strokeCircle(s.x, s.y, SLAM_R * (0.4 + k * 0.7));
      }
    },

    drawAir(g, time) {
      if (t0 < 0) return;
      for (const v of vents) {
        const s = ventState(v, time);
        if (s > 0) updraftShimmer(g, v.x, v.y, VENT_R, time / 1000, s);
        if (s >= 1) {
          // Grit and a feather riding the column.
          for (let i = 0; i < 4; i++) {
            const ph = (time / 700 + i / 4) % 1;
            g.fillStyle(0xe8e0c8, 0.8 * (1 - ph)); g.fillCircle(v.x + Math.sin(time / 120 + i) * 10, v.y - ph * 110, 2);
          }
        }
      }
      // Gliders: a canvas wing held over the fighter, high above them while aloft.
      for (const fl of flights.values()) {
        if (fl.landed || !alive(fl.f)) continue;
        const f = fl.f;
        const k = clamp((time - fl.at) / 400, 0, 1);
        const fall = clamp(1 - (fl.landAt - time) / FALL_MS, 0, 1);
        const lift = 70 * k * (1 - fall * 0.85);
        drawWing(g, f.x, f.y - 40 - lift, time, f === player ? 0x9fd0f2 : KITE_OCHRE);
        // A streak of wind under them.
        g.lineStyle(1.5, 0xffffff, 0.4); g.lineBetween(f.x - 30, f.y - 30 - lift * 0.5, f.x - 60, f.y - 28 - lift * 0.5);
        // The lift line from the wing down to the fighter so you can tell who is up there.
        g.lineStyle(1, TIMBER_DARK, 0.6); g.lineBetween(f.x, f.y - 40 - lift, f.x, f.y - 22);
      }
    },

    drawHud(g, time) {
      // Vent clocks: four little dials, lit while they blow.
      vents.forEach((v, i) => {
        const x = 30 + i * 26, y = top + 16;
        const s = ventState(v, time);
        g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 9);
        g.fillStyle(s >= 1 ? 0xffffff : 0x4a4e5c, 1); g.fillCircle(x, y, 6);
        if (s > 0 && s < 1) { g.lineStyle(2, 0xffffff, 1); g.beginPath(); g.arc(x, y, 8, -Math.PI / 2, -Math.PI / 2 + s * Math.PI * 2, false); g.strokePath(); }
      });
    },
  };
}

/** A hang-glider wing: a canvas delta over a timber frame, banking with the time. */
function drawWing(g: Phaser.GameObjects.Graphics, x: number, y: number, time: number, stripe: number): void {
  const bank = Math.sin(time / 300) * 0.12;
  const span = 46;
  g.fillStyle(0x000000, 0.15); g.fillTriangle(x - span, y + 8, x + span, y + 8 + bank * 40, x, y - 10);
  g.fillStyle(CANVAS_SHADE, 1); g.fillTriangle(x - span, y + 4 - bank * 20, x + span, y + 4 + bank * 20, x, y - 16);
  g.fillStyle(CANVAS, 1); g.fillTriangle(x - span + 6, y + 2 - bank * 18, x, y - 14, x, y + 2);
  g.fillStyle(stripe, 1); g.fillTriangle(x - 8, y - 2, x + 8, y - 2, x, y - 14);
  g.lineStyle(1.5, TIMBER_DARK, 1);
  g.lineBetween(x - span, y + 4 - bank * 20, x + span, y + 4 + bank * 20);
  g.lineBetween(x, y - 16, x, y + 4);
}

export const UPDRAFT: GimmickDef = {
  id: 'galeward-updraft',
  rules: 'Four vents blow in turn. Step on a blowing vent to be thrown aloft for 2.3s: fast, steerable, and untouchable — but you cannot hit anyone either. You land in a slam (15) round your shadow. Watch for falling shadows.',
  make,
};
