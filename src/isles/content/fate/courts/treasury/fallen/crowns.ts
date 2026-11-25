import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { coin, coinFlat } from '../art';
import { GOLD, GOLD_DARK, GOLD_DEEP, GOLD_LIT, GOLD_PALE, IRON, IRON_DARK, IRON_LIT, PAPER, SOOT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Runaway Sovereigns — Chute-Hand Tobit Rimwell, in the King's telling the mint boy who sent the
 * crown's great presentation sovereigns rolling down the chutes to the vault, and learned to make
 * them curl round a corner by the lean he gave them.
 *
 * From the iron chutes in the yard's side walls come sovereigns the size of cartwheels, rolling on
 * their rims. A rolling coin leans, and a leaning coin curves: each one's path is chalked ahead of
 * it, curling the way it leans. It runs down whoever it meets and rings off the walls. As it slows
 * it begins to wobble — faster, louder, lower, the ring on the floor shrinking — and then it slaps
 * flat with a crash that throws everyone round it.
 *
 * Strike a rolling sovereign and you knock its lean the other way: it curls the other way, and a
 * little faster. Read the chalk, flip the curl, roll it through him. Halfway down both chutes fire
 * at once, and the slap goes wider.
 */

const ID = fallenId('treasury', 'crowns');
const R = 26;
const ROLL_DMG = 12;
const SLAP_DMG = 14;
const CURL = 0.0028;
const SPEED0 = 270;
const DRAG = 26;
const WOBBLE_AT = 120;
const WOBBLE_MS = 1300;
const MAX_LIVE = 4;

/** One sovereign: rolling (with a heading and a curl), wobbling down, or lying flat. */
interface Crown {
  x: number; y: number; a: number; v: number; curl: number; roll: number;
  wobbleAt: number; slapAt: number; hitAt: Map<Fighter, number>; target: StrikeTarget; flippedAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const midY = (top + H) / 2;
  const chutes: Pt[] = [{ x: 34, y: midY }, { x: W - 34, y: midY }];
  const crowns: Crown[] = [];
  const flat: { x: number; y: number; at: number; r: number }[] = [];
  let nextLaunch = 0;
  let both = false;
  let started = false;
  const chuteFlash = [-9999, -9999];

  /** Where a coin goes over the next `ms`, rolling with this heading, speed and curl. */
  function path(x: number, y: number, a: number, v: number, curl: number, ms: number, step = 50): Pt[] {
    const pts: Pt[] = [{ x, y }];
    for (let t = 0; t < ms; t += step) {
      const dt = step / 1000;
      a += curl * v * dt; x += Math.cos(a) * v * dt; y += Math.sin(a) * v * dt;
      if (x < 40 || x > W - 40) { a = Math.PI - a; x = clamp(x, 40, W - 40); }
      if (y < top + 30 || y > H - 30) { a = -a; y = clamp(y, top + 30, H - 30); }
      v = Math.max(0, v - DRAG * dt);
      pts.push({ x, y });
    }
    return pts;
  }
  const closest = (pts: Pt[], p: Pt) => pts.reduce((m, q) => Math.min(m, dist(q.x, q.y, p.x, p.y)), Infinity);

  function launch(side: number, time: number): void {
    if (crowns.length >= MAX_LIVE) return;
    const c0 = chutes[side];
    const curl = (rng() < 0.5 ? -1 : 1) * CURL;
    // Aim the curl through you: try headings across the chute's mouth, keep the one that passes closest.
    let best = side === 0 ? 0 : Math.PI, bd = Infinity;
    for (let i = 0; i < 20; i++) {
      const a = (side === 0 ? 0 : Math.PI) + (i / 19 - 0.5) * 1.6;
      const d = closest(path(c0.x, c0.y, a, SPEED0, curl, 2200, 80), player);
      if (d < bd) { bd = d; best = a; }
    }
    const crown: Crown = {
      x: c0.x, y: c0.y, a: best, v: SPEED0, curl, roll: 0, wobbleAt: -1, slapAt: -1, hitAt: new Map(), flippedAt: -9999,
      target: ctx.target({ x: c0.x, y: c0.y - 20, r: R + 4, onStruck: () => flip(crown, ctx.scene.time.now) }),
    };
    crowns.push(crown);
    chuteFlash[side] = time;
    ctx.sfx('boing');
  }

  function flip(c: Crown, time: number): void {
    if (c.wobbleAt >= 0 || time - c.flippedAt < 350) return;
    c.flippedAt = time;
    c.curl = -c.curl;
    c.v = Math.min(SPEED0 + 40, c.v + 60);
    ctx.sfx('clang');
    ctx.flash(c.x, c.y - 20, GOLD_LIT);
  }

  function slap(c: Crown, time: number): void {
    const r = both ? 116 : 86;
    flat.push({ x: c.x, y: c.y, at: time, r });
    ctx.sfx('gravity-slam'); ctx.sfx('jackpot');
    for (const f of [player, npc]) {
      if (!alive(f) || dist(f.x, f.y, c.x, c.y) > r) continue;
      ctx.hit(f, SLAP_DMG, f.x, f.y);
      const a = Math.atan2(f.y - c.y, f.x - c.x);
      ctx.nudge(f, Math.cos(a) * 60, Math.sin(a) * 60);
      ctx.stun(f, 450);
    }
    c.target.remove();
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextLaunch = time + 1400; ctx.banner('SOVEREIGNS IN THE CHUTES', '#ffe27a'); }
      if (!both && alive(npc) && npc.hp < npc.maxHp * 0.5) { both = true; ctx.banner('BOTH CHUTES OPEN', '#ffcf6a'); }
      if (time >= nextLaunch && alive(player)) {
        if (both) { launch(0, time); launch(1, time); } else launch(player.x < W / 2 ? 1 : 0, time);
        nextLaunch = time + (both ? 3600 : 2900);
      }
      for (let i = crowns.length - 1; i >= 0; i--) {
        const c = crowns[i];
        if (c.wobbleAt < 0) {
          c.a += c.curl * c.v * dt;
          c.x += Math.cos(c.a) * c.v * dt; c.y += Math.sin(c.a) * c.v * dt;
          if (c.x < 40 || c.x > W - 40) { c.a = Math.PI - c.a; c.x = clamp(c.x, 40, W - 40); ctx.sfx('clang'); }
          if (c.y < top + 30 || c.y > H - 30) { c.a = -c.a; c.y = clamp(c.y, top + 30, H - 30); ctx.sfx('clang'); }
          c.v = Math.max(0, c.v - DRAG * dt);
          c.roll += (c.v * dt) / R;
          if (c.v < WOBBLE_AT) { c.wobbleAt = time; c.slapAt = time + WOBBLE_MS; ctx.sfx('crystal-chime'); }
          // Running down whoever it meets.
          for (const f of [player, npc]) {
            if (!alive(f) || dist(f.x, f.y, c.x, c.y) > R + 18 || time - (c.hitAt.get(f) ?? -9999) < 700) continue;
            c.hitAt.set(f, time);
            ctx.hit(f, ROLL_DMG, f.x, f.y);
            const side = Math.sign((f.x - c.x) * -Math.sin(c.a) + (f.y - c.y) * Math.cos(c.a)) || 1;
            ctx.nudge(f, -Math.sin(c.a) * 50 * side, Math.cos(c.a) * 50 * side);
            ctx.sfx('hit-medium');
          }
        } else {
          // Spinning down: the last of its way, then the slap.
          c.v = Math.max(0, c.v - 160 * dt);
          c.x += Math.cos(c.a) * c.v * dt; c.y += Math.sin(c.a) * c.v * dt;
          if (time >= c.slapAt) { slap(c, time); crowns.splice(i, 1); continue; }
        }
        c.target.moveTo(c.x, c.y - 20);
      }
      for (let i = flat.length - 1; i >= 0; i--) if (time - flat[i].at > 2400) flat.splice(i, 1);
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      // A coin that, flipped, would curl through you: go and strike it.
      for (const c of crowns) {
        if (c.wobbleAt >= 0 || dist(c.x, c.y, npc.x, npc.y) > 320) continue;
        const flipped = path(c.x, c.y, c.a, Math.min(SPEED0 + 40, c.v + 60), -c.curl, 1500);
        const asIs = path(c.x, c.y, c.a, c.v, c.curl, 1500);
        if (closest(flipped, player) < 40 && closest(asIs, player) > 60 && closest(flipped, npc) > 70) {
          const ahead = { x: c.x + Math.cos(c.a) * 70 - Math.sin(c.a) * 60, y: c.y + Math.sin(c.a) * 70 + Math.cos(c.a) * 60 };
          return { x: clamp(ahead.x, 50, W - 50), y: clamp(ahead.y, top + 40, H - 40) };
        }
      }
      // Otherwise stay off every chalked path and every wobbling ring, at range.
      const unsafe = (x: number, y: number) => crowns.some((c) => (c.wobbleAt >= 0 ? dist(c.x, c.y, x, y) < (both ? 140 : 110) : closest(path(c.x, c.y, c.a, c.v, c.curl, 1200, 100), { x, y }) < 64));
      const dp = dist(npc.x, npc.y, player.x, player.y);
      if (!unsafe(npc.x, npc.y) && dp > 160 && dp < 340) return null;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + now * 0.0002;
        const x = clamp(player.x + Math.cos(a) * 240, 60, W - 60), y = clamp(player.y + Math.sin(a) * 190, top + 50, H - 50);
        if (!unsafe(x, y)) return { x, y };
      }
      return null;
    },

    drawGround(g, time) {
      // The two chutes' mouths in the side walls.
      chutes.forEach((p, i) => chuteMouth(g, p.x, p.y, i === 0 ? 1 : -1, clamp(1 - (time - chuteFlash[i]) / 400, 0, 1)));
      // Fallen sovereigns lie where they slapped, the dust ring spreading.
      for (const f of flat) {
        const k = (time - f.at) / 2400;
        if (k < 0.25) { const q = k / 0.25; g.lineStyle(6 * (1 - q), GOLD_PALE, 1 - q); g.strokeCircle(f.x, f.y, 30 + q * f.r); }
        g.fillStyle(0x000000, 0.25 * (1 - k)); g.fillEllipse(f.x, f.y + 3, 64, 30);
        coinFlat(g, f.x, f.y, 30);
        if (k > 0.7) { g.fillStyle(SOOT, (k - 0.7) * 2); g.fillEllipse(f.x, f.y, 62, 32); }
      }
      for (const c of crowns) {
        if (c.wobbleAt < 0) {
          // The chalked curl ahead, flipped-side ghost faintly beside it.
          const pts = path(c.x, c.y, c.a, c.v, c.curl, 1500, 60);
          pts.forEach((p, k) => { if (k % 2 === 0 && k > 0) { g.fillStyle(PAPER, 0.65 - k * 0.022); g.fillCircle(p.x, p.y, 2.6); } });
          const ghost = path(c.x, c.y, c.a, Math.min(SPEED0 + 40, c.v + 60), -c.curl, 900, 90);
          ghost.forEach((p, k) => { if (k > 1 && k % 2 === 1) { g.fillStyle(PAPER, 0.15); g.fillCircle(p.x, p.y, 1.8); } });
          shadow(g, c.x, c.y + 2, 54, 12, 0.35);
        } else {
          // The wobble ring: it shrinks as the whine climbs, and lands where it shows.
          const k = clamp((time - c.wobbleAt) / WOBBLE_MS, 0, 1);
          const r = both ? 116 : 86;
          g.fillStyle(GOLD_DEEP, 0.1 + k * 0.18); g.fillCircle(c.x, c.y, r);
          g.lineStyle(2 + k * 2, GOLD, 0.5 + k * 0.5); g.strokeCircle(c.x, c.y, r);
          g.lineStyle(2, GOLD_LIT, 0.8); g.strokeCircle(c.x, c.y, r * (1 - k) + 26);
        }
      }
    },

    drawAir(g, time) {
      for (const c of crowns) {
        if (c.wobbleAt < 0) rollingSovereign(g, c.x, c.y, c.a, c.roll, c.curl, time - c.flippedAt);
        else wobblingSovereign(g, c.x, c.y, clamp((time - c.wobbleAt) / WOBBLE_MS, 0, 1), time);
      }
    },

    drawHud(g, time) {
      // The chute's next sovereign, inching down the rack.
      const k = clamp(1 - (nextLaunch - time) / (both ? 3600 : 2900), 0, 1);
      const x = 24, y = H - 28;
      g.fillStyle(IRON_DARK, 0.85); g.fillRect(x - 4, y - 4, 128, 16);
      g.lineStyle(1, IRON_LIT, 1); g.lineBetween(x - 4, y + 12, x + 124, y + 12);
      coin(g, x + 6 + k * 108, y + 4, 7, 'gold', 0.45, 'head');
      for (let i = 0; i < MAX_LIVE; i++) {
        const live = i < crowns.length;
        if (live) coinFlat(g, x + 142 + i * 18, y + 4, 6); else { g.lineStyle(1, GOLD_DARK, 0.4); g.strokeEllipse(x + 142 + i * 18, y + 4, 12, 6); }
      }
    },

    destroy() { for (const c of crowns) c.target.remove(); },
  };
}

/** A chute's iron mouth in the side wall: a riveted hood and a rolling-ramp tongue; it flashes as a coin leaves. */
function chuteMouth(g: G, x: number, y: number, dir: number, flash: number): void {
  const bx = x - dir * 22;
  g.fillStyle(IRON_DARK, 1); g.fillRect(Math.min(bx, bx + dir * 40), y - 40, 40, 80);
  g.fillStyle(IRON, 1); g.fillRect(Math.min(bx, bx + dir * 34), y - 36, 34, 72);
  g.fillStyle(0x0c0a0c, 1); g.fillRect(Math.min(bx + dir * 6, bx + dir * 30), y - 30, 24, 60);
  for (let i = 0; i < 4; i++) { g.fillStyle(IRON_LIT, 1); g.fillCircle(bx + dir * 4, y - 32 + i * 21, 1.8); }
  g.fillStyle(GOLD_DARK, 0.6); g.fillTriangle(x + dir * 18, y - 22, x + dir * 18, y + 22, x + dir * 46, y);
  if (flash > 0) glow(g, x + dir * 10, y, 40, GOLD_LIT, 0.12 * flash, 3);
}

/** A cartwheel sovereign on its rim: edge-on body squashed by its heading, the face turning as it rolls, a lean. */
function rollingSovereign(g: G, x: number, y: number, a: number, roll: number, curl: number, sinceFlip: number): void {
  // Rolling across the view we see its face; rolling toward or away, its edge.
  const squash = 0.16 + Math.abs(Math.cos(a)) * 0.84;
  const lean = Math.sign(curl) * 8;
  coin(g, x + lean, y - R, R, 'gold', squash, Math.cos(roll * 0.5) > 0 ? 'head' : 'tail');
  // The milled rim ticking round as it rolls (the bright notch is the top of its turn).
  for (let i = 0; i < 6; i++) {
    const t = roll + (i / 6) * Math.PI * 2;
    g.fillStyle(i === 0 ? GOLD_PALE : GOLD_DEEP, i === 0 ? 0.95 : 0.5);
    g.fillCircle(x + lean + Math.sin(t) * R * 0.9 * squash * Math.sign(Math.cos(a) || 1), y - R - Math.cos(t) * R * 0.9, i === 0 ? 2.4 : 1.4);
  }
  // The lean: a thin bright edge on the side it curls toward.
  g.lineStyle(2, GOLD_LIT, 0.6); g.strokeEllipse(x + lean * 1.25, y - R, R * 2 * squash, R * 2);
  if (sinceFlip < 300) { const k = sinceFlip / 300; g.lineStyle(3 * (1 - k), GOLD_LIT, 1 - k); g.strokeCircle(x, y - R, R + 6 + k * 16); }
}

/** A sovereign spinning down on its rim, Euler-fashion: tipping lower and spinning faster till it lies flat. */
function wobblingSovereign(g: G, x: number, y: number, k: number, time: number): void {
  const spin = time / (90 - k * 70);
  const tilt = 0.25 + k * 0.7;
  const wx = Math.cos(spin) * (1 - k) * 10, wy = Math.sin(spin) * (1 - k) * 4;
  shadow(g, x, y + 2, 50 + k * 14, 14 + k * 10, 0.4);
  g.fillStyle(GOLD_DARK, 1); g.fillEllipse(x + wx, y - R * (1 - k * 0.8) + wy + 2, R * 2, R * 2 * (1 - tilt * 0.8) + 4);
  coin(g, x + wx, y - R * (1 - k * 0.8) + wy, R, 'gold', 1, Math.sin(spin * 2) > 0 ? 'head' : 'tail');
  g.fillStyle(0x000000, 0.12 * tilt); g.fillEllipse(x + wx, y - R * (1 - k * 0.8) + wy, R * 2, R * 2 * tilt);
  g.lineStyle(1.5, GOLD_PALE, 0.4 + k * 0.5); g.strokeEllipse(x, y - 6, 44 + k * 20, 14 + k * 8);
}

export const FALLEN_CROWNS: GimmickDef = {
  id: ID,
  rules: 'Sovereigns roll from the chutes, curling the way they lean, then wobble down and slap flat. Strike one to flip its curl — roll it through him.',
  make,
};
