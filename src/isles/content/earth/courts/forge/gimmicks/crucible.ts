import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { poly, rivets } from '../art';
import {
  BRICK, BRICK_DARK, HEAT_ORANGE, HEAT_RED, HEAT_WHITE, HEAT_YELLOW, IRON, IRON_DARK, IRON_LIT, IRON_SHEEN, OCHRE_DARK,
} from '../palette';
import { alive, clamp, dist, heatColor, segsCross, stepDt } from '../util';

/**
 * Crucible — Pourmaster Brannoc.
 *
 * Four channels are cut in the casting floor, running down from the gantry rail. A crucible of
 * molten iron rides the rail, and Brannoc steers it over whichever channel you are nearest; it
 * tilts (the lip glows, the channel is outlined) and pours. The iron runs down the channel: stand
 * in it and you burn.
 *
 * Poured iron cools in place into a wall of iron — nobody walks through it, and while a wall
 * stands between the two fighters it takes most of what is thrown across it, both ways. Then it
 * cracks (the cracks glow) and bursts sideways in a spray of hot shards. The crucible follows *you*
 * — so drag it over him, hide behind your own walls, and stand clear of the cracking.
 */

const CH_X = [180, 400, 620, 840];
const HEAD_Y = 150;
const FOOT_Y = 500;
const HALF = 24;
const RAIL_Y = 112;

const MOVE_MS = 2600;
const TILT_MS = 1150;
const FLOW_SPEED = 330;
const MOLTEN_MS = 1500;
const WALL_MS = 5200;
const CRACK_MS = 700;

const BURN_DMG = 6;
const BURN_TICK = 450;
const SHARD_DMG = 8;
const COVER_MULT = 0.45;

type ChState = 'empty' | 'pour' | 'molten' | 'wall' | 'crack';
interface Channel { x: number; state: ChState; front: number; since: number; seed: number }
interface Shard { x: number; y: number; vx: number; vy: number; born: number; hit: Set<Fighter> }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { tk, player, npc, W, H, top } = ctx;
  const channels: Channel[] = CH_X.map((x, i) => ({ x, state: 'empty', front: HEAD_Y, since: 0, seed: i * 1.7 }));
  const shards: Shard[] = [];
  const burnAt = new Map<Fighter, number>();
  const side = new Map<Fighter, number[]>();
  let trolleyX = W / 2;
  let phase: 'move' | 'tilt' | 'pour' = 'move';
  let phaseAt = 0;
  let target = 1;
  let started = false;
  const speed = ctx.hard ? 175 : 140;

  const nearestCh = (x: number) => CH_X.reduce((b, cx, i) => (Math.abs(cx - x) < Math.abs(CH_X[b] - x) ? i : b), 0);
  const solid = (c: Channel) => c.state === 'wall' || c.state === 'crack';
  /** A wall standing between the fighters? */
  const covered = () => channels.some((c) => solid(c) && segsCross(player.x, player.y, npc.x, npc.y, c.x, HEAD_Y, c.x, FOOT_Y));

  function burn(f: Fighter, time: number): void {
    if (time - (burnAt.get(f) ?? -9999) < BURN_TICK) return;
    burnAt.set(f, time);
    if (f === player) { tk.hitPlayer(BURN_DMG, f.x, f.y); tk.slowPlayer(0.6, 500); }
    else ctx.hit(f, BURN_DMG + 1, f.x, f.y);
    ctx.flash(f.x, f.y, HEAT_ORANGE);
  }

  function shatter(c: Channel, time: number): void {
    c.state = 'empty';
    c.front = HEAD_Y;
    ctx.sfx('explosion-small');
    const n = ctx.hard ? 7 : 6;
    for (let i = 0; i < n; i++) {
      const y = HEAD_Y + 20 + (i / (n - 1)) * (FOOT_Y - HEAD_Y - 40);
      for (const k of [-1, 1]) {
        const a = (k > 0 ? 0 : Math.PI) + (ctx.rng() - 0.5) * 0.5;
        shards.push({ x: c.x + k * 10, y, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, born: time, hit: new Set() });
      }
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; phaseAt = time; }

      // The crucible: track the player's channel, tilt, pour.
      if (phase === 'move') {
        target = nearestCh(player.x);
        const tx = CH_X[target];
        trolleyX += clamp(tx - trolleyX, -speed * dt, speed * dt);
        if (time - phaseAt > MOVE_MS && Math.abs(trolleyX - tx) < 8 && channels[target].state === 'empty') {
          phase = 'tilt'; phaseAt = time;
          ctx.sfx('beam-charge');
        } else if (time - phaseAt > MOVE_MS + 2500 && channels[target].state !== 'empty') {
          // That channel is still busy: try the next free one along.
          const free = channels.findIndex((c) => c.state === 'empty');
          if (free >= 0) target = free;
        }
      } else if (phase === 'tilt') {
        if (time - phaseAt > tk.warn(TILT_MS)) {
          phase = 'pour'; phaseAt = time;
          const c = channels[target];
          c.state = 'pour'; c.front = HEAD_Y; c.since = time;
          ctx.sfx('oil-splash');
        }
      } else if (time - phaseAt > 1100) {
        phase = 'move'; phaseAt = time;
      }

      for (const c of channels) {
        if (c.state === 'pour') {
          c.front = Math.min(FOOT_Y, c.front + FLOW_SPEED * dt);
          if (c.front >= FOOT_Y) { c.state = 'molten'; c.since = time; }
        } else if (c.state === 'molten' && time - c.since > MOLTEN_MS) {
          c.state = 'wall'; c.since = time;
          ctx.sfx('stone-rise');
        } else if (c.state === 'wall' && time - c.since > WALL_MS) {
          c.state = 'crack'; c.since = time;
          ctx.sfx('crystal-shatter');
        } else if (c.state === 'crack' && time - c.since > tk.warn(CRACK_MS)) {
          shatter(c, time);
        }
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const inBand = Math.abs(f.x - c.x) < HALF + 6 && f.y > HEAD_Y - 10;
          if ((c.state === 'pour' || c.state === 'molten') && inBand && f.y < c.front + 10) burn(f, time);
          // A wall: shoved back out to the side you came from.
          const i = channels.indexOf(c);
          const sides = side.get(f) ?? CH_X.map(() => 1);
          if (!solid(c)) sides[i] = f.x >= c.x ? 1 : -1;
          else if (f.y > HEAD_Y - 16 && f.y < FOOT_Y + 16) {
            const reach = HALF + 18;
            if (Math.abs(f.x - c.x) < reach) ctx.nudge(f, c.x + sides[i] * reach - f.x, 0);
          }
          side.set(f, sides);
        }
      }

      // Shards.
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.vy += 120 * dt;
        for (const f of [player, npc]) {
          if (!alive(f) || s.hit.has(f)) continue;
          if (dist(s.x, s.y, f.x, f.y) < 22) {
            s.hit.add(f);
            if (f === player) tk.hitPlayer(SHARD_DMG, s.x, s.y); else ctx.hit(f, SHARD_DMG, s.x, s.y);
          }
        }
        if (time - s.born > 1400 || s.x < -20 || s.x > W + 20 || s.y > H + 20) shards.splice(i, 1);
      }
    },

    playerTakenMult: () => (covered() ? COVER_MULT : 1),
    npcTakenMult: () => (covered() ? COVER_MULT : 1),
    npcSpeedMult: () => (channels.some((c) => (c.state === 'pour' || c.state === 'molten') && Math.abs(npc.x - c.x) < HALF + 6 && npc.y < c.front + 10 && npc.y > HEAD_Y - 10) ? 0.6 : 1),

    npcSeek() {
      // Pick open ground: clear of hot or cracking channels, at range from the player — and behind a
      // wall from the player when hurt worse than they are.
      const hurt = npc.hp / Math.max(1, npc.maxHp) < player.hp / Math.max(1, player.maxHp);
      let best: Pt | null = null;
      let bs = -Infinity;
      for (let x = 70; x <= W - 70; x += 55) {
        for (const y of [top + 90, 260, 360, 450, 560]) {
          let s = -Math.abs(dist(x, y, player.x, player.y) - 210) * 0.6;
          for (const c of channels) {
            const near = Math.abs(x - c.x) < 70;
            if (near && (c.state === 'pour' || c.state === 'molten' || c.state === 'crack') && y < FOOT_Y + 40) s -= 400;
            if (near && phase === 'tilt' && c === channels[target]) s -= 400;
            if (hurt && solid(c) && segsCross(player.x, player.y, x, y, c.x, HEAD_Y, c.x, FOOT_Y)) s += 160;
          }
          s -= dist(x, y, npc.x, npc.y) * 0.15;
          if (s > bs) { bs = s; best = { x, y }; }
        }
      }
      return best;
    },

    drawGround(g, time) {
      for (const c of channels) {
        // The cut channel: brick lips, sand floor, a scorched run where iron has been.
        g.fillStyle(BRICK_DARK, 1); g.fillRect(c.x - HALF - 6, HEAD_Y - 8, HALF * 2 + 12, FOOT_Y - HEAD_Y + 16);
        for (let y = HEAD_Y - 6; y < FOOT_Y + 6; y += 10) {
          g.fillStyle(((y / 10) | 0) % 2 ? BRICK : dim(BRICK, 0.15), 1);
          g.fillRect(c.x - HALF - 5, y, 5, 9); g.fillRect(c.x + HALF, y, 5, 9);
        }
        g.fillStyle(dim(OCHRE_DARK, 0.4), 1); g.fillRect(c.x - HALF, HEAD_Y, HALF * 2, FOOT_Y - HEAD_Y);
        g.fillStyle(0x000000, 0.25); g.fillRect(c.x - HALF, HEAD_Y, 6, FOOT_Y - HEAD_Y);
        // The sprue cup at the head.
        g.fillStyle(IRON_DARK, 1); g.fillCircle(c.x, HEAD_Y, HALF + 4);
        g.fillStyle(0x140806, 1); g.fillCircle(c.x, HEAD_Y, HALF - 4);
        if (c.state === 'pour' || c.state === 'molten') {
          const heat = c.state === 'pour' ? 1 : 1 - (time - c.since) / MOLTEN_MS * 0.35;
          g.fillStyle(heatColor(heat * 0.85), 1); g.fillRect(c.x - HALF + 3, HEAD_Y, HALF * 2 - 6, c.front - HEAD_Y);
          g.fillStyle(heatColor(heat), 0.8); g.fillRect(c.x - 6, HEAD_Y, 12, c.front - HEAD_Y);
          // A skin of crust drifting on it.
          for (let i = 0; i < 6; i++) {
            const y = HEAD_Y + ((i * 63 + time / 12) % Math.max(1, c.front - HEAD_Y));
            g.fillStyle(dim(HEAT_RED, 0.3), 0.5); g.fillEllipse(c.x + Math.sin(i + c.seed) * 8, y, 12, 5);
          }
          if (c.state === 'pour') {
            glow(g, c.x, c.front, 34, HEAT_YELLOW, 0.08, 3);
            g.fillStyle(HEAT_WHITE, 0.9); g.fillEllipse(c.x, c.front, HALF * 2 - 6, 14);
          }
        }
        // A tilting crucible marks its channel before it pours.
        if (phase === 'tilt' && c === channels[target]) {
          const k = clamp((time - phaseAt) / tk.warn(TILT_MS), 0, 1);
          g.lineStyle(3, HEAT_YELLOW, 0.3 + k * 0.6); g.strokeRect(c.x - HALF - 8, HEAD_Y - 10, HALF * 2 + 16, FOOT_Y - HEAD_Y + 20);
          g.fillStyle(HEAT_ORANGE, 0.1 + k * 0.18); g.fillRect(c.x - HALF, HEAD_Y, HALF * 2, FOOT_Y - HEAD_Y);
        }
      }
    },

    drawAir(g, time) {
      // Walls of cooled iron stand up out of their channels.
      for (const c of channels) {
        if (!solid(c)) continue;
        const age = time - c.since;
        const heat = c.state === 'wall' ? clamp(0.45 - age / WALL_MS * 0.45, 0, 0.45) : 0;
        const wallH = 26;
        const body = heat > 0.05 ? heatColor(heat) : IRON;
        // Side face, then top face.
        g.fillStyle(IRON_DARK, 1); g.fillRect(c.x - HALF, HEAD_Y - wallH + 6, HALF * 2, FOOT_Y - HEAD_Y + wallH - 6);
        g.fillStyle(body, 1); g.fillRect(c.x - HALF + 2, HEAD_Y - wallH, HALF * 2 - 4, FOOT_Y - HEAD_Y);
        g.fillStyle(lit(body, 0.2), 0.8); g.fillRect(c.x - HALF + 4, HEAD_Y - wallH, 5, FOOT_Y - HEAD_Y);
        g.fillStyle(dim(body, 0.25), 1); g.fillRect(c.x - HALF + 2, FOOT_Y - wallH, HALF * 2 - 4, wallH);
        rivets(g, c.x, HEAD_Y - wallH + 12, c.x, FOOT_Y - wallH - 8, 8, 1.5, IRON_SHEEN);
        // Casting flash along the edges.
        for (let y = HEAD_Y - wallH + 10; y < FOOT_Y - wallH; y += 24) {
          poly(g, [{ x: c.x + HALF - 2, y }, { x: c.x + HALF + 4, y: y + 5 }, { x: c.x + HALF - 2, y: y + 11 }], dim(body, 0.15));
        }
        if (c.state === 'crack') {
          const k = clamp(age / tk.warn(CRACK_MS), 0, 1);
          for (let i = 0; i < 6; i++) {
            const y = HEAD_Y - wallH + 20 + i * ((FOOT_Y - HEAD_Y - 40) / 6);
            g.lineStyle(2, HEAT_YELLOW, 0.4 + k * 0.6);
            g.lineBetween(c.x - HALF + 4, y, c.x - 4, y + 10); g.lineBetween(c.x - 4, y + 10, c.x + 6, y - 2); g.lineBetween(c.x + 6, y - 2, c.x + HALF - 4, y + 8);
          }
          glow(g, c.x, (HEAD_Y + FOOT_Y) / 2, 60, HEAT_ORANGE, 0.03 + k * 0.04, 3);
        }
      }
      // Cover: a faint line between the fighters when a wall takes the blows.
      if (covered() && alive(player) && alive(npc)) {
        g.lineStyle(1, IRON_SHEEN, 0.18); g.lineBetween(player.x, player.y, npc.x, npc.y);
        ctxShieldMarks(g, player, time); ctxShieldMarks(g, npc, time);
      }
      // Shards.
      for (const s of shards) {
        const a = Math.atan2(s.vy, s.vx);
        poly(g, [
          { x: s.x + Math.cos(a) * 9, y: s.y + Math.sin(a) * 9 },
          { x: s.x + Math.cos(a + 2.4) * 5, y: s.y + Math.sin(a + 2.4) * 5 },
          { x: s.x + Math.cos(a - 2.4) * 5, y: s.y + Math.sin(a - 2.4) * 5 },
        ], heatColor(0.6));
        g.lineStyle(1.5, HEAT_YELLOW, 0.5); g.lineBetween(s.x, s.y, s.x - s.vx * 0.03, s.y - s.vy * 0.03);
      }
      // The gantry rail, the trolley, the crucible.
      g.fillStyle(IRON_DARK, 1); g.fillRect(0, RAIL_Y - 7, W, 12);
      g.fillStyle(IRON, 1); g.fillRect(0, RAIL_Y - 7, W, 4);
      rivets(g, 10, RAIL_Y, W - 10, RAIL_Y, 24, 1.2, IRON_SHEEN);
      const tilt = phase === 'tilt' ? clamp((time - phaseAt) / tk.warn(TILT_MS), 0, 1) * 0.7 : phase === 'pour' ? 0.9 : 0;
      drawCrucible(g, trolleyX, RAIL_Y, tilt, time);
      if (phase === 'pour') {
        const c = channels[target];
        const lipX = trolleyX + 22, lipY = RAIL_Y + 30;
        g.lineStyle(7, HEAT_ORANGE, 0.9); g.lineBetween(lipX, lipY, c.x, HEAD_Y);
        g.lineStyle(3, HEAT_WHITE, 0.9); g.lineBetween(lipX, lipY, c.x, HEAD_Y);
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i - 2.5) * 0.5, ph = (time / 200 + i / 6) % 1;
          g.fillStyle(HEAT_YELLOW, 1 - ph); g.fillCircle(c.x + Math.cos(a) * ph * 30, HEAD_Y + Math.sin(a) * ph * 20, 1.6);
        }
      }
    },
  };
}

/** Two little iron chevrons over a fighter in cover. */
function ctxShieldMarks(g: Phaser.GameObjects.Graphics, f: Fighter, time: number): void {
  const y = f.y - 44 + Math.sin(time / 200) * 2;
  g.lineStyle(2, IRON_SHEEN, 0.7);
  g.lineBetween(f.x - 8, y, f.x, y - 5); g.lineBetween(f.x, y - 5, f.x + 8, y);
}

/** The crucible on its trolley: wheels on the rail, a chain hoist, a tapered pot of white-hot iron. */
function drawCrucible(g: Phaser.GameObjects.Graphics, x: number, railY: number, tilt: number, time: number): void {
  for (const k of [-1, 1]) { g.fillStyle(IRON_DARK, 1); g.fillCircle(x + k * 16, railY - 8, 6); g.fillStyle(IRON_LIT, 1); g.fillCircle(x + k * 16, railY - 8, 2); }
  g.fillStyle(IRON, 1); g.fillRect(x - 24, railY - 2, 48, 8);
  g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x - 10, railY + 6, x - 14, railY + 14); g.lineBetween(x + 10, railY + 6, x + 14, railY + 14);
  // The pot, rotated by `tilt` about its trunnions.
  const cx = x, cy = railY + 30;
  const rot = (px: number, py: number): Pt => ({ x: cx + px * Math.cos(tilt) - py * Math.sin(tilt), y: cy + px * Math.sin(tilt) + py * Math.cos(tilt) });
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x - 14, railY + 14, rot(-18, -4).x, rot(-18, -4).y); g.lineBetween(x + 14, railY + 14, rot(18, -4).x, rot(18, -4).y);
  poly(g, [rot(-20, -14), rot(20, -14), rot(26, -18), rot(14, 18), rot(-14, 18)], IRON_DARK);
  poly(g, [rot(-17, -12), rot(17, -12), rot(12, 15), rot(-12, 15)], IRON);
  for (const yy of [-6, 6]) { const a = rot(-16, yy), b = rot(16, yy); g.lineStyle(2, IRON_LIT, 0.8); g.lineBetween(a.x, a.y, b.x, b.y); }
  const m1 = rot(-15, -13), m2 = rot(15, -13);
  g.lineStyle(5, heatColor(0.85 + Math.sin(time / 90) * 0.1), 1); g.lineBetween(m1.x, m1.y, m2.x, m2.y);
  glow(g, cx, cy - 10, 28, HEAT_ORANGE, 0.05, 3);
  for (const k of [-1, 1]) { const p = rot(k * 19, -4); g.fillStyle(IRON_SHEEN, 1); g.fillCircle(p.x, p.y, 3); }
}

export const CRUCIBLE: GimmickDef = {
  id: 'forge-crucible',
  rules: 'The crucible follows you and pours molten iron down a channel — it burns. Poured iron cools into a wall that blocks the way and takes blows across it, then cracks into shards.',
  make,
};
