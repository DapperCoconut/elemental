import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CRUDE, CRUDE_AMBER, GILT, GILT_DARK, LAMP_LIT, SAFETY_RED, SAFETY_WHITE, STEEL_DARK, STEEL_LIT, TIMBER,
  TIMBER_DARK, TIMBER_LIT, clamp, dist, drumEnd, frameClock, noise, oilDrum, queensMark, sheenAt,
} from '../util';

/**
 * Short Weight — Gauger Prudence Tallow keeps the Weighhouse scale, the one that decides which
 * households paid their barrel and which are "short at the spring tide" and left under. The fight
 * is fought ON the scale: the floor is its two great brass pans with the fulcrum walk between them.
 *
 * Every fighter and every barrel on a pan is weight. The scale tips toward the heavier pan, and a
 * pan that sinks is **left under** — crude floods into it, slowing and scalding whoever stands
 * there. Tallow drops tithe barrels onto your pan from the hook (a shadow marks each one), so the
 * scale keeps going against you.
 *
 * The turn the player can make: **strike a resting barrel** and it rolls at the gauger — over to
 * her pan, bowling her if it catches her. Load her side and she is the one left under. At half
 * health she puts her **thumb on the scale**: her own weight stops counting and she drops two
 * barrels at a time.
 */

const ID = fallenId('slickharbor', 'short-weight');
const MID_HALF = 40;
const ROLL_SPEED = 380;
const WIND_MS = 320;

type BarrelState = 'falling' | 'resting' | 'winding' | 'rolling';
interface Barrel {
  x: number; y: number; state: BarrelState; at: number; seed: number;
  tx: number; ty: number; fx: number; fy: number; by: 'player' | 'npc'; struckAt: number;
  target: StrikeTarget | null; hitDone: boolean;
}

function makeShortWeight(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const tick = frameClock();
  const cy = (top + H) / 2;
  const landDmg = 10;
  const rollDmg = 11;
  const floodDmg = 5;
  const barrels: Barrel[] = [];
  const tickAt = new Map<Fighter, number>();
  const flood = [0, 0];
  let tilt = 0;
  let thumb = false;
  let nextDrop = ctx.scene.time.now + 2600;

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  /** 0 = west pan, 1 = east pan, -1 = the fulcrum walk. */
  const sideOf = (x: number): number => (x < W / 2 - MID_HALF ? 0 : x > W / 2 + MID_HALF ? 1 : -1);
  const downSide = (): number => (tilt > 0.45 ? 1 : tilt < -0.45 ? 0 : -1);
  const panX = (s: number): number => (s === 0 ? W * 0.25 : W * 0.75);

  const weigh = (): number => {
    const w = [0, 0];
    for (const b of barrels) if (b.state === 'resting' || b.state === 'winding') { const s = sideOf(b.x); if (s >= 0) w[s] += 1; }
    const ps = sideOf(ctx.player.x); if (ps >= 0 && alive(ctx.player)) w[ps] += 1;
    const ns = sideOf(ctx.npc.x); if (ns >= 0 && alive(ctx.npc) && !thumb) w[ns] += 1;
    return w[1] - w[0];
  };

  const makeTarget = (b: Barrel): StrikeTarget => ctx.target({
    x: b.x, y: b.y - 12, r: 22,
    onStruck(by) {
      const time = ctx.scene.time.now;
      if (b.state !== 'resting' || time - b.struckAt < 400) return;
      const foe = by === 'player' ? ctx.npc : ctx.player;
      b.state = 'winding'; b.at = time; b.by = by; b.struckAt = time; b.hitDone = false;
      b.fx = b.x; b.fy = b.y;
      // It rolls through where the foe stands and on a little, to the wall.
      const a = Math.atan2(foe.y - b.y, foe.x - b.x);
      const reach = Math.min(dist(b.x, b.y, foe.x, foe.y) + 60, 640);
      b.tx = clamp(b.x + Math.cos(a) * reach, 50, W - 50);
      b.ty = clamp(b.y + Math.sin(a) * reach, top + 40, H - 34);
      ctx.sfx('clang');
    },
  });

  const drop = (time: number, aimX: number, aimY: number, k: number): void => {
    const s = sideOf(aimX) >= 0 ? sideOf(aimX) : (aimX < W / 2 ? 0 : 1);
    const lo = s === 0 ? 60 : W / 2 + MID_HALF + 30, hi = s === 0 ? W / 2 - MID_HALF - 30 : W - 60;
    const x = clamp(aimX + (ctx.rng() - 0.5) * 120, lo, hi);
    const y = clamp(aimY + (ctx.rng() - 0.5) * 90, top + 60, H - 40);
    barrels.push({ x, y, state: 'falling', at: time + 1050 + k * 260, seed: ctx.rng() * 50, tx: x, ty: y, fx: x, fy: y, by: 'npc', struckAt: 0, target: null, hitDone: false });
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;
      const P = ctx.player, N = ctx.npc;

      if (!thumb && N.hp < N.maxHp * 0.5) {
        thumb = true;
        ctx.banner('THUMB ON THE SCALE — the gauger weighs nothing now', '#ffc860');
        ctx.sfx('anvil');
      }
      const resting = barrels.filter((b) => b.state !== 'falling').length;
      if (time >= nextDrop && alive(P) && alive(N)) {
        nextDrop = time + (thumb ? 3900 : 4600);
        const n = Math.min(thumb ? 2 : 1, 6 - resting);
        for (let k = 0; k < n; k++) drop(time, P.x, P.y, k);
        if (n > 0) ctx.sfx('chain');
      }

      for (let i = barrels.length - 1; i >= 0; i--) {
        const b = barrels[i];
        if (b.state === 'falling' && time >= b.at) {
          b.state = 'resting';
          ctx.sfx('hit-heavy');
          ctx.flash(b.x, b.y, CRUDE_AMBER);
          for (const f of [P, N]) if (alive(f) && dist(f.x, f.y, b.x, b.y) < 38) ctx.hit(f, landDmg, b.x, b.y);
          b.target = makeTarget(b);
        } else if (b.state === 'winding' && time - b.at >= WIND_MS) {
          b.state = 'rolling'; b.at = time; ctx.sfx('whoosh');
        } else if (b.state === 'rolling') {
          const len = dist(b.fx, b.fy, b.tx, b.ty);
          const k = clamp(((time - b.at) / 1000) * ROLL_SPEED / Math.max(1, len), 0, 1);
          b.x = b.fx + (b.tx - b.fx) * k; b.y = b.fy + (b.ty - b.fy) * k;
          b.target?.moveTo(b.x, b.y - 12);
          const foe = b.by === 'player' ? N : P;
          if (!b.hitDone && alive(foe) && dist(foe.x, foe.y, b.x, b.y) < 34) {
            b.hitDone = true;
            ctx.hit(foe, rollDmg, foe.x, foe.y);
            ctx.nudge(foe, (b.tx - b.fx) / Math.max(1, len) * 40, (b.ty - b.fy) / Math.max(1, len) * 40);
            if (foe === N) ctx.float(N.x, N.y - 50, 'SHORT WEIGHT!', '#ffc860');
          }
          if (k >= 1) { b.state = 'resting'; ctx.sfx('clang'); }
        }
      }

      // The scale settles toward the heavier pan.
      const want = clamp(weigh() / 2, -1, 1);
      tilt += clamp(want - tilt, -0.55 * dt, 0.55 * dt);
      const down = downSide();
      for (let s = 0; s < 2; s++) flood[s] = clamp(flood[s] + (s === down ? 0.45 : -0.8) * dt, 0, 1);

      for (const f of [P, N]) {
        if (!alive(f)) continue;
        const s = sideOf(f.x);
        if (s < 0 || flood[s] < 0.35) continue;
        const last = tickAt.get(f) ?? 0;
        if (time - last < 650) continue;
        tickAt.set(f, time);
        ctx.hit(f, floodDmg, f.x, f.y);
        if (f === P) ctx.sfx('slime-splat');
      }
    },

    playerSpeedMult() { const s = sideOf(ctx.player.x); return s >= 0 && flood[s] >= 0.35 ? 0.72 : 1; },
    npcSpeedMult() { const s = sideOf(ctx.npc.x); return s >= 0 && flood[s] >= 0.35 ? 0.72 : 1; },

    npcSeek(): Pt | null {
      const N = ctx.npc, P = ctx.player;
      const mine = sideOf(N.x);
      // Flooding under her: cross the fulcrum to the dry pan.
      if (mine >= 0 && (flood[mine] > 0.2 || downSide() === mine)) {
        return { x: panX(1 - mine), y: clamp(N.y, top + 70, H - 60) };
      }
      // A barrel on her own pan: walk up to it and send it at the player.
      let best: Barrel | null = null, bd = 1e9;
      for (const b of barrels) {
        if (b.state !== 'resting' || sideOf(b.x) !== mine) continue;
        const d = dist(N.x, N.y, b.x, b.y);
        if (d < bd) { bd = d; best = b; }
      }
      if (best) {
        const a = Math.atan2(best.y - P.y, best.x - P.x);
        return { x: clamp(best.x + Math.cos(a) * 40, 50, W - 50), y: clamp(best.y + Math.sin(a) * 40, top + 40, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      const ts = time / 1000;
      // The fulcrum walk: tarred timber between the pans, the post's iron shoe at its middle.
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(W / 2 - MID_HALF, top, MID_HALF * 2, H - top);
      for (let y = top; y < H; y += 16) {
        g.fillStyle(noise(y) > 0.5 ? TIMBER : TIMBER_LIT, 0.9); g.fillRect(W / 2 - MID_HALF + 3, y + 1, MID_HALF * 2 - 6, 13);
        g.fillStyle(0x000000, 0.4); g.fillCircle(W / 2 - MID_HALF + 8, y + 7, 1.2); g.fillCircle(W / 2 + MID_HALF - 8, y + 7, 1.2);
      }
      g.fillStyle(STEEL_DARK, 1); g.fillTriangle(W / 2 - 30, cy + 26, W / 2 + 30, cy + 26, W / 2, cy - 22);
      g.fillStyle(STEEL_LIT, 0.5); g.fillTriangle(W / 2 - 8, cy + 20, W / 2, cy + 20, W / 2, cy - 12);
      for (let s = 0; s < 2; s++) drawPan(g, s, ts);
    },

    drawAir(g, time) {
      const ts = time / 1000;
      // Barrels: falling (shadow + hook), resting (tithe drums), winding and rolling (on their sides).
      for (const b of barrels) {
        if (b.state === 'falling') {
          const c = clamp(1 - (b.at - time) / 1050, 0, 1);
          g.fillStyle(0x000000, 0.18 + c * 0.35); g.fillEllipse(b.x, b.y, 18 + c * 30, 6 + c * 10);
          g.lineStyle(2, SAFETY_RED, 0.5 + c * 0.4); g.strokeCircle(b.x, b.y, 44 - c * 18);
          const hy = b.y - 300 * (1 - c) - 30;
          g.lineStyle(2, STEEL_DARK, 0.9); g.lineBetween(b.x, top, b.x, hy - 30);
          oilDrum(g, b.x, hy, 13, 0x6a2a20, true);
        } else if (b.state === 'resting') {
          oilDrum(g, b.x, b.y, 13, 0x6a2a20, true);
        } else {
          const spin = b.state === 'rolling' ? (time - b.at) / 70 : Math.sin(ts * 40) * 0.3;
          if (b.state === 'winding') {
            g.lineStyle(2, b.by === 'player' ? 0xffc860 : SAFETY_RED, 0.55);
            g.lineBetween(b.x, b.y - 10, b.tx, b.ty - 10);
          }
          g.fillStyle(0x000000, 0.3); g.fillEllipse(b.x, b.y + 2, 34, 9);
          drumEnd(g, b.x, b.y - 13, 14, 0x6a2a20);
          g.lineStyle(2, SAFETY_WHITE, 0.8);
          g.lineBetween(b.x + Math.cos(spin) * 10, b.y - 13 + Math.sin(spin) * 10, b.x - Math.cos(spin) * 10, b.y - 13 - Math.sin(spin) * 10);
        }
      }
      // The great beam overhead, tilting; its chains drop to the pans' rims.
      const a = tilt * 0.07;
      const bx = W / 2, byy = top + 18, half = W * 0.42;
      const end = (sgn: number): Pt => ({ x: bx + Math.cos(a) * half * sgn, y: byy + Math.sin(a) * half * sgn });
      const L = end(-1), R = end(1);
      for (const [e, s] of [[L, 0], [R, 1]] as const) {
        for (const off of [-150, 150]) {
          const tx = panX(s) + off, ty = top + 46;
          for (let k = 0; k < 8; k++) {
            const t0 = k / 8;
            const lx = e.x + (tx - e.x) * t0, ly = e.y + (ty - e.y) * t0;
            g.lineStyle(1.6, STEEL_DARK, 0.7); g.strokeEllipse(lx, ly, 4, 6);
          }
        }
      }
      g.lineStyle(10, STEEL_DARK, 1); g.lineBetween(L.x, L.y, R.x, R.y);
      g.lineStyle(4, 0x3a3e44, 1); g.lineBetween(L.x, L.y - 2, R.x, R.y - 2);
      g.fillStyle(GILT_DARK, 1); g.fillCircle(bx, byy, 9);
      g.fillStyle(GILT, 1); g.fillCircle(bx, byy, 5);
      // The pointer, and — once she cheats — the brass thumb-poise slid out along her arm.
      g.fillStyle(GILT, 1); g.fillTriangle(bx - 4, byy, bx + 4, byy, bx - Math.sin(a) * 40, byy + Math.cos(a) * 40);
      if (thumb) {
        const s = sideOf(ctx.npc.x) === 1 ? -1 : 1;
        const p = { x: bx + Math.cos(a) * half * 0.6 * s, y: byy + Math.sin(a) * half * 0.6 * s };
        g.fillStyle(GILT_DARK, 1); g.fillRoundedRect(p.x - 13, p.y - 4, 26, 26, 6);
        g.fillStyle(GILT, 1); g.fillRoundedRect(p.x - 10, p.y - 2, 20, 18, 5);
        g.fillStyle(LAMP_LIT, 0.6); g.fillEllipse(p.x - 3, p.y + 2, 7, 4);
      }
    },

    drawHud(g) {
      // The weighhouse dial: a half-moon of brass, red "UNDER" at both ends, the needle on the tilt.
      const x = W / 2, y = top + 62, r = 34;
      g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, r + 6);
      g.fillStyle(SAFETY_WHITE, 0.95); g.beginPath(); g.arc(x, y, r, Math.PI, 0, false); g.closePath(); g.fillPath();
      g.lineStyle(5, SAFETY_RED, 0.9);
      g.beginPath(); g.arc(x, y, r - 4, Math.PI, Math.PI * 1.28, false); g.strokePath();
      g.beginPath(); g.arc(x, y, r - 4, Math.PI * 1.72, Math.PI * 2, false); g.strokePath();
      for (let i = 0; i <= 8; i++) {
        const t = Math.PI + (i / 8) * Math.PI;
        g.lineStyle(1, STEEL_DARK, 1); g.lineBetween(x + Math.cos(t) * (r - 9), y + Math.sin(t) * (r - 9), x + Math.cos(t) * (r - 2), y + Math.sin(t) * (r - 2));
      }
      const na = -Math.PI / 2 + tilt * (Math.PI / 2) * 0.95;
      g.lineStyle(2.5, STEEL_DARK, 1); g.lineBetween(x, y, x + Math.cos(na) * (r - 6), y + Math.sin(na) * (r - 6));
      g.fillStyle(GILT, 1); g.fillCircle(x, y, 4);
      g.lineStyle(2, GILT_DARK, 1); g.strokeCircle(x, y, r + 2);
      // Flood pips under each end.
      for (let s = 0; s < 2; s++) {
        const px = x + (s === 0 ? -r : r) - 14;
        g.fillStyle(0x000000, 0.5); g.fillRect(px, y + 6, 28, 6);
        g.fillStyle(CRUDE_AMBER, 1); g.fillRect(px + 1, y + 7, 26 * flood[s], 4);
      }
    },

    destroy() {
      for (const b of barrels) b.target?.remove();
      barrels.length = 0; tickAt.clear();
    },
  };

  /** One brass pan: rivets, the Queen's mark stamped in its well, and the crude that floods it when it sinks. */
  function drawPan(g: G, s: number, ts: number): void {
    const x0 = s === 0 ? 14 : W / 2 + MID_HALF + 6, x1 = s === 0 ? W / 2 - MID_HALF - 6 : W - 14;
    const sink = (s === 1 ? tilt : -tilt) * 8;
    const pw = x1 - x0, ph = H - top - 28, px = x0, py = top + 14 + sink;
    g.fillStyle(0x000000, 0.45); g.fillRoundedRect(px + 4, py + 6, pw, ph, 40);
    g.fillStyle(GILT_DARK, 1); g.fillRoundedRect(px, py, pw, ph, 40);
    g.fillStyle(0x9a7a3a, 1); g.fillRoundedRect(px + 8, py + 8, pw - 16, ph - 16, 34);
    g.fillStyle(0xb89448, 0.5); g.fillRoundedRect(px + 26, py + 20, pw - 52, ph * 0.28, 28);
    for (let i = 0; i < 22; i++) {
      const t = i / 22;
      const rx = t < 0.5 ? px + 18 + t * 2 * (pw - 36) : px + 18 + (1 - (t - 0.5) * 2) * (pw - 36);
      const ry = t < 0.5 ? py + 16 : py + ph - 16;
      g.fillStyle(GILT, 1); g.fillCircle(rx, ry, 2.4); g.fillStyle(0x3a2a10, 0.6); g.fillCircle(rx + 0.8, ry + 0.8, 1);
    }
    queensMark(g, px + pw / 2, py + ph / 2 - 10, 46, GILT_DARK, 0.55);
    const f = flood[s];
    if (f > 0.01) {
      const cx = px + pw / 2, cyy = py + ph / 2;
      g.fillStyle(CRUDE, 0.55 + f * 0.35); g.fillEllipse(cx, cyy, (pw - 30) * f, (ph - 30) * f);
      for (let k = 0; k < 4; k++) {
        g.lineStyle(3, sheenAt(ts * 0.5 + k + s), 0.25 * f);
        g.strokeEllipse(cx + k * 2, cyy - k, (pw - 40) * f * (0.92 - k * 0.15), (ph - 40) * f * (0.92 - k * 0.15));
      }
      if (f >= 0.35) {
        for (let k = 0; k < 6; k++) {
          const bx = cx + (noise(k + s * 9) - 0.5) * pw * 0.6 * f, by = cyy + (noise(k * 3 + s) - 0.5) * ph * 0.6 * f;
          const ph2 = (ts * 0.7 + noise(k * 7)) % 1;
          g.lineStyle(1.2, CRUDE_AMBER, 0.6 * (1 - ph2)); g.strokeCircle(bx, by, 3 + ph2 * 8);
        }
        g.lineStyle(3, SAFETY_RED, 0.5 + 0.3 * Math.sin(ts * 6)); g.strokeRoundedRect(px + 4, py + 4, pw - 8, ph - 8, 36);
      }
    }
  }
}

export const FALLEN_SHORT_WEIGHT: GimmickDef = {
  id: ID,
  rules: 'You fight on the tithe scale: the heavier pan sinks and floods with crude. Strike a barrel to roll it at Tallow and weigh her side down.',
  make: makeShortWeight,
};
