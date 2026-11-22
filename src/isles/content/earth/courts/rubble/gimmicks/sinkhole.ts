import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { mixC, type G } from '../../../../../art/IsleArt';
import { crack } from '../art';
import { DUST, DUST_DARK, DUST_LIT, LIME, LIME_DARK, SCREE, SCREE_DARK, STRATA_BUFF, STRATA_GREY, STRATA_RED, WATER_DEEP } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Sinkhole — Delver Moth.
 *
 * The old capital's cellars run three deep under this square, and the Regent's spoil sits on
 * them like a lid on rotten boards. Stand anywhere too long and it gives: the dust spiders with
 * cracks under your feet, and a moment later a sinkhole opens there. Its edges keep crumbling
 * outward as the cellar roof goes, wider and wider, until the hole fills itself with its own
 * rubble. Whoever is over a hole when its edge reaches them drops in — hurt, held a moment at the
 * bottom — and climbs out at the rim.
 *
 * Moth is a delver: he can hear the cellars under the floor. Every few seconds he plants his pick
 * and taps, and for a while the ground under *you* gives twice as fast (even shuffling won't save
 * you). But a delver tapping is a delver standing still, and the floor does not care whose feet
 * are on it. Keep moving, and catch him while he listens.
 */

const DWELL_S = 1.5;
const STILL_R = 34;
const CRACK_MS = 900;
const HOLE_R0 = 40;
const HOLE_MAX = 96;
const HOLE_GROW = 6.5;
const HOLE_LIFE = 13000;
const FALL_DMG = 12;
const MAX_HOLES = 6;

interface Hole { x: number; y: number; r: number; crackAt: number; openAt: number; fillAt: number; seed: number }
interface Feet { ax: number; ay: number; dwell: number; fallUntil: number; climbFrom: Hole | null; lastFall: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const holes: Hole[] = [];
  const feet = new Map<Fighter, Feet>([
    [player, { ax: player.x, ay: player.y, dwell: 0, fallUntil: 0, climbFrom: null, lastFall: -9999 }],
    [npc, { ax: npc.x, ay: npc.y, dwell: 0, fallUntil: 0, climbFrom: null, lastFall: -9999 }],
  ]);
  const tapEvery = ctx.hard ? 5200 : 6600;
  const TAP_MS = 4000;
  let nextTap = 0;
  let tapAt = -9999;
  let started = false;

  const isOpen = (h: Hole, time: number) => time >= h.openAt && time < h.fillAt;
  const holeAt = (x: number, y: number, time: number, pad = 0) => holes.find((h) => isOpen(h, time) && dist(h.x, h.y, x, y) < h.r + pad);

  function openUnder(x: number, y: number, time: number): void {
    if (holes.length >= MAX_HOLES) return;
    if (holes.some((h) => dist(h.x, h.y, x, y) < (time < h.openAt ? 50 : h.r + 20))) return;
    holes.push({ x, y, r: HOLE_R0, crackAt: time, openAt: time + CRACK_MS, fillAt: time + CRACK_MS + HOLE_LIFE, seed: rng() * 10 });
    ctx.sfx('stone-slam');
  }

  function drop(f: Fighter, h: Hole, time: number): void {
    const s = feet.get(f);
    if (!s) return;
    s.fallUntil = time + 800;
    s.climbFrom = h;
    s.lastFall = time;
    s.dwell = -0.8;
    ctx.stun(f, 800);
    ctx.hit(f, ctx.hard ? FALL_DMG + 3 : FALL_DMG, f.x, f.y);
    ctx.float(f.x, f.y - 40, 'FELL IN', '#d8c8a0');
    ctx.sfx('land');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextTap = time + 3200; }
      // Moth taps: plants his pick and listens; the ground under you starts to give.
      if (time >= nextTap && alive(npc)) {
        nextTap = time + tapEvery;
        tapAt = time;
        ctx.root(npc, 1300);
        ctx.banner('MOTH TAPS THE FLOOR — KEEP MOVING', '#e6d2a8');
        ctx.sfx('drum-hit');
      }
      const tapping = time - tapAt < TAP_MS;

      for (const [f, s] of feet) {
        if (!alive(f)) continue;
        // Climbing out at the rim once the fall is done.
        if (s.climbFrom && time >= s.fallUntil) {
          const h = s.climbFrom;
          const a = Math.atan2(f.y - h.y, f.x - h.x) || rng() * Math.PI * 2;
          const tx = h.x + Math.cos(a) * (h.r + 26), ty = h.y + Math.sin(a) * (h.r + 26);
          ctx.nudge(f, tx - f.x, ty - f.y);
          s.climbFrom = null;
          ctx.sfx('whoosh');
        }
        if (s.climbFrom) continue;
        // Standing too long: the floor gives under that spot.
        const r = f === player && tapping ? STILL_R * 1.8 : STILL_R;
        if (dist(s.ax, s.ay, f.x, f.y) > r) { s.ax = f.x; s.ay = f.y; s.dwell = Math.min(s.dwell, 0); }
        else s.dwell += dt * (f === player && tapping ? 2.2 : 1);
        if (s.dwell >= DWELL_S) { s.dwell = -0.6; openUnder(s.ax, s.ay, time); }
        // Over an open hole (its crumbling edge has reached you): in you go.
        const h = holeAt(f.x, f.y, time, -8);
        if (h && time - s.lastFall > 1600) drop(f, h, time);
      }

      // Edges crumble outward; old holes fill with their own rubble.
      for (let i = holes.length - 1; i >= 0; i--) {
        const h = holes[i];
        if (isOpen(h, time)) h.r = Math.min(HOLE_MAX, h.r + HOLE_GROW * dt * (ctx.hard ? 1.25 : 1));
        if (time > h.fillAt + 900) holes.splice(i, 1);
      }
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      const s = feet.get(npc);
      // Around you at fighting range, never over a hole, and on the move once he's been still.
      const base = time / 1400;
      let best = { x: player.x, y: player.y }, bs = -Infinity;
      for (let i = 0; i < 10; i++) {
        const a = base + (i / 10) * Math.PI * 2;
        const x = clamp(player.x + Math.cos(a) * 230, 60, W - 60), y = clamp(player.y + Math.sin(a) * 190, top + 50, H - 40);
        let sc = -Math.abs(dist(npc.x, npc.y, x, y) - 120) * 0.2;
        for (const h of holes) { const d = dist(h.x, h.y, x, y) - (isOpen(h, time) ? h.r : 50); if (d < 60) sc -= 200 - d; }
        if (s && s.dwell > 0.9) sc += dist(s.ax, s.ay, x, y) * 0.5;
        if (sc > bs) { bs = sc; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // Tremor cracks under anyone who has stood too long.
      for (const [f, s] of feet) {
        if (!alive(f) || s.dwell < DWELL_S * 0.45 || s.climbFrom) continue;
        const k = clamp((s.dwell - DWELL_S * 0.45) / (DWELL_S * 0.55), 0, 1);
        for (let i = 0; i < 5; i++) crack(g, s.ax, s.ay + 6, 10 + k * 26, i * 1.25 + f.x * 0.01, DUST_DARK, 0.3 + k * 0.6, 1.2);
        g.lineStyle(1.5, DUST_LIT, 0.2 + k * 0.4); g.strokeEllipse(s.ax, s.ay + 6, 30 + k * 30, 12 + k * 12);
      }
      // Moth's tap: rings running out from his pick toward you.
      if (time - tapAt < 1300 && alive(npc)) {
        for (let i = 0; i < 3; i++) {
          const ph = ((time - tapAt) / 900 + i / 3) % 1;
          g.lineStyle(2, DUST_LIT, 0.5 * (1 - ph)); g.strokeEllipse(npc.x, npc.y + 8, 40 + ph * 260, 16 + ph * 104);
        }
      }
      if (time - tapAt < 4000 && alive(player)) {
        const k = 1 - (time - tapAt) / 4000;
        g.lineStyle(2, 0xd8a060, 0.3 + k * 0.4); g.strokeEllipse(player.x, player.y + 8, 64 + Math.sin(time / 80) * 4, 26);
      }
      for (const h of holes) drawHole(g, h, time);
    },

    drawAir(g, time) {
      // Dust thrown up from a fresh fall.
      for (const [f, s] of feet) {
        if (!alive(f) || time - s.lastFall > 900) continue;
        const k = (time - s.lastFall) / 900;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.fillStyle(DUST, 0.5 * (1 - k)); g.fillCircle(f.x + Math.cos(a) * (12 + k * 40), f.y - k * 30 + Math.sin(a) * 10, 8 + k * 10);
        }
      }
    },
  };
}

/** A sinkhole: spidering cracks while it gives, then a pit whose walls go down in strata to black, its rim crumbling. */
function drawHole(g: G, h: Hole, time: number): void {
  if (time < h.openAt) {
    const k = clamp((time - h.crackAt) / CRACK_MS, 0, 1);
    g.fillStyle(DUST_DARK, 0.25 + k * 0.35); g.fillEllipse(h.x, h.y, HOLE_R0 * 2 * k, HOLE_R0 * 1.4 * k);
    for (let i = 0; i < 7; i++) crack(g, h.x, h.y, 14 + k * HOLE_R0, i * 0.9 + h.seed, SCREE_DARK, 0.5 + k * 0.5, 1.6);
    g.lineStyle(2, 0xffd0a0, 0.3 + k * 0.5); g.strokeEllipse(h.x, h.y, HOLE_R0 * 2.2, HOLE_R0 * 1.5);
    return;
  }
  const filling = time > h.fillAt ? clamp((time - h.fillAt) / 900, 0, 1) : 0;
  const r = h.r * (1 - filling * 0.3);
  const ry = r * 0.72;
  // The rim: broken paving tipping in.
  g.fillStyle(DUST_DARK, 0.9); g.fillEllipse(h.x, h.y, r * 2 + 18, ry * 2 + 14);
  // The walls: strata going down, each ring darker.
  const bands = [STRATA_BUFF, STRATA_RED, STRATA_GREY, STRATA_BUFF, STRATA_GREY];
  for (let i = 0; i < bands.length; i++) {
    const k = i / bands.length;
    g.fillStyle(mixC(bands[i], WATER_DEEP, 0.15 + k * 0.7), 1);
    g.fillEllipse(h.x, h.y + k * 8, r * 2 * (1 - k * 0.38), ry * 2 * (1 - k * 0.38));
  }
  g.fillStyle(0x080604, 1); g.fillEllipse(h.x, h.y + 10, r * 0.9, ry * 0.8);
  // A cellar's broken vault showing in the wall.
  g.lineStyle(3, LIME_DARK, 0.9); g.beginPath(); g.arc(h.x - r * 0.25, h.y + ry * 0.2, r * 0.32, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
  // Chips falling off the rim.
  for (let i = 0; i < 6; i++) {
    const a = h.seed + i * 1.05;
    const ph = ((time / 800) + i * 0.29) % 1;
    const rx = h.x + Math.cos(a) * r * (1 - ph * 0.5), rr = h.y + Math.sin(a) * ry * (1 - ph * 0.5) + ph * 10;
    g.fillStyle(i % 2 ? SCREE : LIME, 1 - ph); g.fillRect(rx - 2, rr - 2, 4, 3);
  }
  // Rim stones.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + h.seed;
    g.fillStyle(i % 3 ? DUST : LIME, 1); g.fillRect(h.x + Math.cos(a) * (r + 4) - 5, h.y + Math.sin(a) * (ry + 3) - 3, 10, 5);
  }
  if (filling > 0) { g.fillStyle(SCREE_DARK, filling); g.fillEllipse(h.x, h.y, r * 2, ry * 2); }
}

export const SINKHOLE: GimmickDef = {
  id: 'rubble-sinkhole',
  rules: 'Stand still too long and the ground gives: a sinkhole opens and its edge crumbles outward; fall in and you are hurt and held. Moth taps the floor to make yours give faster.',
  make,
};
