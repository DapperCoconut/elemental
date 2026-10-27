import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { crabPots } from '../art';
import { BUOY, WETSAND_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Crab Season — Crabber Dunwick.
 *
 * Shore crabs scuttle sideways across the flats in their own lanes. Walk into one and it clamps
 * on to your ankle: every clamped crab slows you hard and pinches a little each second. The
 * crabs are terrified of Dunwick — they veer away from him and run — so he *herds* them: he
 * walks round behind a crab and drives it at you. Every so often he blows his horn and every
 * crab on the flats turns on you at once.
 *
 * The answer is the crab itself. Land a hit and the crab on you lets go — it's *flung* at the
 * other fighter, and clamps on to him. Crabs never walk into Dunwick, but they can be thrown at
 * him, and a crab on his ankle slows him exactly as much as one on yours. He shakes his off the
 * same way: by hitting you.
 */

const MAX_LIVE = 7;
const CLAMP_R = 24;
const PINCH_PER_S = 2.2;
const FEAR_R = 150;
const THROW_SPEED = 430;
const PER_CRAB_SLOW = 0.6;
const RELEASE_ICD = 380;

type CrabState = 'scuttle' | 'clamped' | 'thrown';

interface Crab {
  x: number; y: number;
  /** Lateral heading along x: +1 east, -1 west. */
  dir: number;
  speed: number;
  /** Lane it drifts back to. */
  lane: number;
  state: CrabState;
  on: Fighter | null;
  /** In flight: where it was thrown from and at whom. */
  fromX: number; fromY: number; target: Fighter | null; flightAt: number;
  seed: number;
  size: number;
  /** Turned toward the player by the horn. */
  herdUntil: number;
  bornAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const crabs: Crab[] = [];
  const spawnEvery = ctx.hard ? 1200 : 1650;
  const hornEvery = ctx.hard ? 9000 : 11500;
  let nextSpawn = 0;
  let nextHorn = 0;
  let hornFx = 0;
  let hornWarned = false;
  let started = false;
  let lastPRelease = 0;
  let lastNRelease = 0;
  let pinchAcc = 0;
  let pinchAccN = 0;
  /** Footprint dots the crabs leave in the wet sand. */
  const prints: { x: number; y: number; at: number }[] = [];
  const pots: Pt[] = [{ x: 46, y: top + 40 }, { x: W - 46, y: H - 30 }];

  const clampedOn = (f: Fighter) => crabs.filter((c) => c.state === 'clamped' && c.on === f).length;

  function spawn(time: number): void {
    const dir = rng() < 0.5 ? 1 : -1;
    const lane = top + 50 + rng() * (H - top - 100);
    const fast = ctx.hard ? 1.25 : 1;
    crabs.push({
      x: dir > 0 ? -20 : W + 20, y: lane, dir, speed: (70 + rng() * 40) * fast, lane, state: 'scuttle', on: null,
      fromX: 0, fromY: 0, target: null, flightAt: 0, seed: rng() * 10, size: 0.85 + rng() * 0.35, herdUntil: 0, bornAt: time,
    });
  }

  /** Shake the crab nearest the hit loose and fling it at the other fighter. */
  function release(from: Fighter, at: Fighter, time: number): void {
    const c = crabs.find((k) => k.state === 'clamped' && k.on === from);
    if (!c) return;
    c.state = 'thrown';
    c.on = null;
    c.fromX = from.x; c.fromY = from.y + 10;
    c.x = c.fromX; c.y = c.fromY;
    c.target = at;
    c.flightAt = time;
    ctx.float(from.x, from.y - 44, 'SHAKEN OFF', '#ffd2b0');
    ctx.sfx('whoosh');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextSpawn = time + 500;
        nextHorn = time + hornEvery;
        for (let i = 0; i < 3; i++) spawn(time);
        for (const c of crabs) c.x = 120 + rng() * (W - 240);
      }
      if (time >= nextSpawn) {
        nextSpawn = time + spawnEvery;
        if (crabs.filter((c) => c.state === 'scuttle').length < MAX_LIVE) spawn(time);
      }
      // Dunwick's horn: every crab turns on you.
      if (!hornWarned && time >= nextHorn - 1400) {
        hornWarned = true;
        ctx.banner('DUNWICK SHOULDERS HIS HORN', '#ffd2b0');
      }
      if (time >= nextHorn) {
        nextHorn = time + hornEvery;
        hornWarned = false;
        hornFx = time;
        ctx.sfx('train-horn');
        ctx.banner('HERD \'EM!', '#ff9a7a');
        for (const c of crabs) if (c.state === 'scuttle') c.herdUntil = time + 2400;
      }

      for (let i = crabs.length - 1; i >= 0; i--) {
        const c = crabs[i];
        if (c.state === 'scuttle') {
          let vx = c.dir * c.speed;
          let vy = (c.lane - c.y) * 1.2;
          // Fear of the crabber: veer away and run.
          if (alive(npc)) {
            const d = dist(c.x, c.y, npc.x, npc.y);
            if (d < FEAR_R) {
              const k = 1 - d / FEAR_R;
              const ax = (c.x - npc.x) / (d || 1), ay = (c.y - npc.y) / (d || 1);
              vx += ax * 230 * k;
              vy += ay * 230 * k;
              c.lane = clamp(c.lane + ay * 90 * dt, top + 40, H - 40);
              if (Math.sign(ax) !== c.dir && Math.abs(ax) > 0.6) c.dir = Math.sign(ax);
            }
          }
          // The horn: a straight run at the player.
          if (time < c.herdUntil && alive(player)) {
            const d = dist(c.x, c.y, player.x, player.y);
            vx = ((player.x - c.x) / (d || 1)) * c.speed * 1.5;
            vy = ((player.y - c.y) / (d || 1)) * c.speed * 1.5;
            c.lane = c.y;
          }
          c.x += vx * dt;
          c.y = clamp(c.y + vy * dt, top + 30, H - 24);
          if (rng() < dt * 8) prints.push({ x: c.x, y: c.y + 6, at: time });
          // Walked into: it clamps on. Never Dunwick — they would sooner die.
          if (alive(player) && clampedOn(player) < 3 && dist(c.x, c.y, player.x, player.y + 10) < CLAMP_R) {
            c.state = 'clamped';
            c.on = player;
            ctx.float(player.x, player.y - 40, 'CLAMPED!', '#ff9a7a');
            ctx.sfx('trap-snap');
          }
          if (c.x < -60 || c.x > W + 60) crabs.splice(i, 1);
        } else if (c.state === 'thrown') {
          const tgt = c.target;
          if (!tgt || !alive(tgt)) { c.state = 'scuttle'; c.lane = c.y; continue; }
          const d = dist(c.x, c.y, tgt.x, tgt.y);
          const step = THROW_SPEED * dt;
          if (d <= step + 18) {
            c.state = 'clamped';
            c.on = tgt;
            c.target = null;
            ctx.float(tgt.x, tgt.y - 40, tgt === npc ? 'CRAB ON DUNWICK!' : 'CLAMPED!', tgt === npc ? '#ffd27a' : '#ff9a7a');
            ctx.sfx('trap-snap');
          } else {
            c.x += ((tgt.x - c.x) / d) * step;
            c.y += ((tgt.y - c.y) / d) * step;
            // Thrown crabs that miss the mark for long enough drop and scuttle.
            if (time - c.flightAt > 1600) { c.state = 'scuttle'; c.lane = c.y; }
          }
        } else if (c.on && !alive(c.on)) {
          c.state = 'scuttle'; c.on = null; c.lane = c.y;
        }
      }
      // Pinching.
      const pc = clampedOn(player);
      if (pc && alive(player)) {
        pinchAcc += PINCH_PER_S * pc * dt;
        if (pinchAcc >= 2) { ctx.hit(player, Math.floor(pinchAcc), player.x, player.y + 10); pinchAcc -= Math.floor(pinchAcc); }
      } else pinchAcc = 0;
      const nc = clampedOn(npc);
      if (nc && alive(npc)) {
        pinchAccN += PINCH_PER_S * nc * dt;
        if (pinchAccN >= 2) { ctx.hit(npc, Math.floor(pinchAccN), npc.x, npc.y + 10); pinchAccN -= Math.floor(pinchAccN); }
      } else pinchAccN = 0;
      for (let i = prints.length - 1; i >= 0; i--) if (time - prints[i].at > 1800) prints.splice(i, 1);
      if (prints.length > 160) prints.splice(0, prints.length - 160);
    },

    // Real hits shake a crab loose — not the pinching itself.
    onNpcHurt(amount) {
      const time = ctx.scene.time.now;
      if (amount < 3 || time - lastPRelease < RELEASE_ICD) return;
      if (clampedOn(player)) { lastPRelease = time; release(player, npc, time); }
    },
    onPlayerHurt(amount) {
      const time = ctx.scene.time.now;
      if (amount < 3 || time - lastNRelease < RELEASE_ICD) return;
      if (clampedOn(npc)) { lastNRelease = time; release(npc, player, time); }
    },

    playerSpeedMult: () => Math.pow(PER_CRAB_SLOW, Math.min(2, clampedOn(player))),
    npcSpeedMult: () => Math.pow(PER_CRAB_SLOW, Math.min(2, clampedOn(npc))),

    npcSeek() {
      // A crab on his own ankle: go and hit you to shake it.
      if (clampedOn(npc)) return { x: player.x, y: player.y };
      // Otherwise herd: stand behind the crab nearest you, on the far side from you.
      let best: Crab | null = null;
      let bd = 380;
      for (const c of crabs) {
        if (c.state !== 'scuttle') continue;
        const d = dist(c.x, c.y, player.x, player.y);
        if (d < bd && d > 60) { bd = d; best = c; }
      }
      if (!best) return null;
      const ax = (best.x - player.x) / bd, ay = (best.y - player.y) / bd;
      return { x: clamp(best.x + ax * 90, 50, W - 50), y: clamp(best.y + ay * 90, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const p of pots) crabPots(g, p.x, p.y, () => 0.3);
      for (const p of prints) {
        const a = 1 - (time - p.at) / 1800;
        g.fillStyle(WETSAND_DARK, 0.5 * a);
        g.fillCircle(p.x - 5, p.y, 1.3); g.fillCircle(p.x + 5, p.y, 1.3);
      }
      for (const c of crabs) {
        if (c.state === 'thrown') continue;
        g.fillStyle(0x000000, 0.25); g.fillEllipse(c.x, c.y + 6, 28 * c.size, 8 * c.size);
      }
      if (hornFx && time - hornFx < 900) {
        const k = (time - hornFx) / 900;
        g.lineStyle(4 * (1 - k), 0xffd2b0, 0.6 * (1 - k));
        g.strokeCircle(npc.x, npc.y, 40 + k * 260);
        g.strokeCircle(npc.x, npc.y, 20 + k * 180);
      }
    },

    drawAir(g, time) {
      for (const c of crabs) {
        if (c.state === 'scuttle') {
          drawCrab(g, c.x, c.y, c.size, time, c.seed, c.dir, time < c.herdUntil, false);
        } else if (c.state === 'thrown') {
          // Tumbling through the air in a little arc.
          const k = clamp((time - c.flightAt) / 450, 0, 1);
          const hop = Math.sin(k * Math.PI) * 30;
          drawCrab(g, c.x, c.y - hop, c.size, time * 3, c.seed, c.dir, false, true);
        } else if (c.on) {
          // Hanging off the ankle, legs going, claws shut.
          const n = crabs.filter((k) => k.state === 'clamped' && k.on === c.on).indexOf(c);
          const ox = (n % 2 ? 14 : -14), oy = 16 + Math.sin(time / 90 + c.seed) * 2;
          drawCrab(g, c.on.x + ox, c.on.y + oy, c.size * 0.85, time * 2, c.seed, ox > 0 ? 1 : -1, true, true);
        }
      }
    },

    drawHud(g) {
      // Clamp counts as crab pips under each side's corner.
      for (const [f, x, d] of [[player, 24, 1], [npc, W - 24, -1]] as [Fighter, number, number][]) {
        const n = clampedOn(f);
        for (let i = 0; i < 3; i++) {
          const px = x + d * i * 18, py = top + 16;
          g.fillStyle(0x000000, 0.45); g.fillCircle(px, py, 7);
          g.fillStyle(i < n ? BUOY : 0x3a3030, 1); g.fillEllipse(px, py, 11, 7);
        }
      }
    },
  };
}

/** A shore crab: wide carapace, eight scuttling legs, two claws, eyes on stalks. */
function drawCrab(
  g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, time: number, seed: number, dir: number,
  angry: boolean, clamped: boolean,
): void {
  const shell = angry ? 0xd2462e : 0xc0642f;
  const leg = dim(shell, 0.35);
  const ph = time / 70 + seed;
  // Legs: four a side, alternating.
  g.lineStyle(2 * s, leg, 1);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const a = (i - 1.5) * 0.35;
      const lift = Math.sin(ph + i * 1.6 + (side > 0 ? 0 : Math.PI)) * 3;
      const bx = x + side * 8 * s, by = y + a * 10 * s;
      const kx = x + side * 16 * s, ky = by - 5 * s + lift;
      const fx = x + side * 21 * s, fy = by + 5 * s + lift * 0.4;
      g.lineBetween(bx, by, kx, ky);
      g.lineBetween(kx, ky, fx, fy);
    }
  }
  // Claws, forward on the side it is heading.
  for (const side of [-1, 1]) {
    const cx = x + side * 15 * s + dir * 2, cy = y - 9 * s;
    g.lineStyle(2.4 * s, leg, 1); g.lineBetween(x + side * 7 * s, y - 3 * s, cx, cy);
    g.fillStyle(shell, 1); g.fillEllipse(cx, cy - 2 * s, 9 * s, 7 * s);
    const open = clamped ? 0.05 : 0.35 + Math.sin(ph * 0.7 + side) * 0.2;
    g.fillStyle(lit(shell, 0.15), 1);
    g.fillTriangle(cx - 3 * s, cy - 4 * s, cx + 3 * s, cy - 4 * s, cx + side * 2 * s, cy - (8 + open * 8) * s);
  }
  // Carapace.
  g.fillStyle(dim(shell, 0.3), 1); g.fillEllipse(x, y + 1, 22 * s, 15 * s);
  g.fillStyle(shell, 1); g.fillEllipse(x, y, 20 * s, 13 * s);
  g.fillStyle(lit(shell, 0.25), 0.8); g.fillEllipse(x - 3 * s, y - 3 * s, 9 * s, 4 * s);
  // Eye stalks.
  for (const side of [-1, 1]) {
    g.lineStyle(1.4 * s, leg, 1); g.lineBetween(x + side * 3 * s, y - 5 * s, x + side * 4 * s, y - 10 * s);
    g.fillStyle(angry ? 0xffe0a0 : 0x141414, 1); g.fillCircle(x + side * 4 * s, y - 11 * s, 1.9 * s);
  }
}

export const CRAB_SEASON: GimmickDef = {
  id: 'tidewater-crab-season',
  rules: 'Crabs clamp whoever walks into them (slowed, pinched). Land a hit to shake one off — it is flung at the other fighter. Crabs flee Dunwick; he herds them at you.',
  make,
};
