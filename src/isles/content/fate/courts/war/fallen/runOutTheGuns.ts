import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget, Striker } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, BRONZE, BRONZE_LIT, IRON, IRON_DARK, IRON_LIT, IVORY, LAMP, MUD_DARK, MUD_LIT, RED, RED_LIT, TIMBER, TIMBER_DARK,
  TIMBER_LIT,
} from '../palette';
import { alive, clamp, dist, segDist, wrapAngle } from '../util';

/**
 * Run Out the Guns — Bombardier Hodge Ferrant, who in the King's telling laid the saluting guns
 * on the crowd the Sunday the drafted boys' mothers came up the slope to the Wheel.
 *
 * Three field guns stand in the yard on their trails. The crown's crew lays one on you — its
 * muzzle lane chalked across the mud and the rut it will run back down hatched in red behind it —
 * and fires: the shot crosses the whole yard down the lane, and the gun *recoils*, its carriage
 * hurled back down its trail-line and over whoever stands behind it. The crew then run it up to
 * its mark and lay it afresh where you were.
 *
 * Any gun at rest can be fired by striking its breech: the port-fire is put to the vent and it
 * goes a second later. So a clever player fires the gun laid on where the Bombardier is walking —
 * but whoever struck the breech is standing exactly where the carriage is about to come. Strike,
 * then step off the trail. Past half the guns are double-shotted: a wider lane, a longer recoil.
 * The bot steps out of any laid lane and trail, and goes to the flank of a breech when you stand
 * in that gun's lane.
 */

const ID = fallenId('war', 'run-out');
type State = 'ready' | 'laying' | 'primed' | 'recoil' | 'running';
const LAY_MS = 1300;
const PRIME_MS = 1000;
const RECOIL_MS = 340;
const RUNUP_MS = 1700;
const TRAIL_R = 34;

interface Gun {
  hx: number; hy: number; base: number; a: number; x: number; y: number;
  state: State; fireAt: number; runFrom: number; recoil: number; by: Striker | 'crown';
  hitP: boolean; hitN: boolean; shotAt: number; t: StrikeTarget | null;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  let double = false;
  let nextLay = 0;
  let started = false;
  const half = () => (double ? 46 : 34);
  const recoilLen = () => (double ? 290 : 210);
  const guns: Gun[] = [
    { hx: 230, hy: 230, base: 0.55 },
    { hx: 750, hy: 250, base: 2.6 },
    { hx: 480, hy: 560, base: -1.45 },
  ].map((g) => ({ ...g, a: g.base, x: g.hx, y: g.hy, state: 'ready' as State, fireAt: 0, runFrom: 0, recoil: 0, by: 'crown' as const, hitP: false, hitN: false, shotAt: -1e9, t: null }));

  const dir = (g: Gun) => ({ dx: Math.cos(g.a), dy: Math.sin(g.a) });
  const muzzle = (g: Gun) => ({ x: g.hx + Math.cos(g.a) * 46, y: g.hy + Math.sin(g.a) * 46 });
  /** How far a ray from (x,y) runs before it leaves the yard. */
  const rayLen = (x: number, y: number, dx: number, dy: number): number => {
    let t = 2000;
    if (dx > 1e-4) t = Math.min(t, (W - x) / dx); else if (dx < -1e-4) t = Math.min(t, -x / dx);
    if (dy > 1e-4) t = Math.min(t, (H - y) / dy); else if (dy < -1e-4) t = Math.min(t, (top - y) / dy);
    return Math.max(0, t);
  };
  /** Where the carriage fetches up: back down the trail-line, stopped short by the yard's edge. */
  const recoilEnd = (g: Gun) => {
    const { dx, dy } = dir(g);
    const L = Math.min(recoilLen(), rayLen(g.hx, g.hy, -dx, -dy) - 40);
    return { x: g.hx - dx * Math.max(40, L), y: g.hy - dy * Math.max(40, L), L: Math.max(40, L) };
  };
  const inLane = (g: Gun, f: Fighter, pad = 20) => {
    const m = muzzle(g), { dx, dy } = dir(g);
    const along = (f.x - m.x) * dx + (f.y - m.y) * dy;
    const perp = Math.abs((f.x - m.x) * -dy + (f.y - m.y) * dx);
    return along > -24 && perp < half() + pad;
  };
  const onTrail = (g: Gun, f: Fighter, pad = 20) => {
    const e = recoilEnd(g);
    return segDist(f.x, f.y, g.hx, g.hy, e.x, e.y) < TRAIL_R + pad;
  };

  function arm(g: Gun): void {
    g.t = ctx.target({
      x: g.hx - Math.cos(g.a) * 26, y: g.hy - Math.sin(g.a) * 26, r: 22,
      onStruck(by: Striker) {
        if (g.state !== 'ready') return;
        g.state = 'primed'; g.by = by; g.fireAt = tk.now + PRIME_MS;
        ctx.sfx('sizzle');
        ctx.float(g.hx, g.hy - 40, by === 'player' ? 'PORT-FIRE!' : 'HE FIRES IT', by === 'player' ? '#ffe2a8' : '#ff9a7a');
      },
    });
  }
  guns.forEach(arm);

  function fire(g: Gun, time: number): void {
    const m = muzzle(g);
    const dmg = double ? 26 : 21;
    g.shotAt = time; g.hitP = false; g.hitN = false;
    ctx.sfx(double ? 'explosion-large' : 'explosion-medium');
    if (alive(player) && inLane(g, player)) tk.hitPlayer(dmg, player.x, player.y);
    if (alive(npc) && inLane(g, npc)) { ctx.hit(npc, dmg + 8, npc.x, npc.y); ctx.float(npc.x, npc.y - 56, 'IN THE LINE', '#ffb070'); }
    ctx.flash(m.x, m.y, LAMP);
    g.state = 'recoil'; g.recoil = recoilEnd(g).L;
  }

  return {
    update(time) {
      if (!started) { started = true; nextLay = time + 2000; }
      if (!double && npc.hp < npc.maxHp * 0.5) { double = true; ctx.banner('DOUBLE-SHOTTED', '#ffb070'); ctx.sfx('reload'); }
      // The crown lays the gun whose lane best finds you.
      if (time >= nextLay && alive(player)) {
        let best: Gun | null = null, bestCost = 1e9;
        for (const g of guns) {
          if (g.state !== 'ready') continue;
          const want = Math.atan2(player.y - g.hy, player.x - g.hx);
          const turn = Math.abs(wrapAngle(want - g.base));
          if (turn > 1.25) continue;
          const cost = turn + dist(g.hx, g.hy, player.x, player.y) / 900;
          if (cost < bestCost) { bestCost = cost; best = g; }
        }
        if (best) {
          const want = Math.atan2(player.y - best.hy, player.x - best.hx);
          best.a = best.base + clamp(wrapAngle(want - best.base), -1.25, 1.25);
          best.state = 'laying'; best.by = 'crown'; best.fireAt = time + tk.warn(LAY_MS);
          best.t?.moveTo(best.hx - Math.cos(best.a) * 26, best.hy - Math.sin(best.a) * 26);
          ctx.sfx('gear-turn');
        }
        nextLay = time + (double ? 2300 : 3000);
      }
      for (const g of guns) {
        if ((g.state === 'laying' || g.state === 'primed') && time >= g.fireAt) fire(g, time);
        if (g.state === 'recoil') {
          const k = clamp((time - g.shotAt) / RECOIL_MS, 0, 1);
          const e = 1 - (1 - k) * (1 - k);
          g.x = g.hx - Math.cos(g.a) * g.recoil * e; g.y = g.hy - Math.sin(g.a) * g.recoil * e;
          const crush = (f: Fighter, isP: boolean) => {
            if (!alive(f) || (isP ? g.hitP : g.hitN) || dist(f.x, f.y, g.x, g.y) > TRAIL_R + 22) return;
            if (isP) { g.hitP = true; tk.hitPlayer(double ? 20 : 16, f.x, f.y); }
            else { g.hitN = true; ctx.hit(npc, double ? 30 : 24, f.x, f.y); ctx.float(f.x, f.y - 56, 'RUN DOWN', '#ffb070'); }
            ctx.stun(f, 550);
            ctx.nudge(f, -Math.cos(g.a) * 46, -Math.sin(g.a) * 46);
            ctx.sfx('hit-heavy');
          };
          crush(player, true); crush(npc, false);
          if (k >= 1) { g.state = 'running'; g.runFrom = time; }
        } else if (g.state === 'running') {
          const k = clamp((time - g.runFrom) / RUNUP_MS, 0, 1);
          g.x = g.hx - Math.cos(g.a) * g.recoil * (1 - k); g.y = g.hy - Math.sin(g.a) * g.recoil * (1 - k);
          if (k >= 1) { g.state = 'ready'; g.x = g.hx; g.y = g.hy; }
        }
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      for (const g of guns) {
        if (g.state !== 'laying' && g.state !== 'primed') continue;
        const danger = inLane(g, npc, 44) || onTrail(g, npc, 40);
        if (!danger) continue;
        const nx = -Math.sin(g.a), ny = Math.cos(g.a);
        const side = (npc.x - g.hx) * nx + (npc.y - g.hy) * ny >= 0 ? 1 : -1;
        return { x: tk.clampX(npc.x + nx * side * 110), y: tk.clampY(npc.y + ny * side * 110) };
      }
      if (!alive(player)) return null;
      for (const g of guns) {
        if (g.state !== 'ready' || !inLane(g, player, -6)) continue;
        const nx = -Math.sin(g.a), ny = Math.cos(g.a);
        const side = (npc.x - g.hx) * nx + (npc.y - g.hy) * ny >= 0 ? 1 : -1;
        return { x: tk.clampX(g.hx - Math.cos(g.a) * 26 + nx * side * 62), y: tk.clampY(g.hy - Math.sin(g.a) * 26 + ny * side * 62) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const gun of guns) {
        drawRuts(g, gun, recoilEnd(gun));
        if (gun.state === 'laying' || gun.state === 'primed') {
          const span = gun.state === 'laying' ? tk.warn(LAY_MS) : PRIME_MS;
          const k = clamp(1 - (gun.fireAt - time) / span, 0, 1);
          const m = muzzle(gun), d = dir(gun);
          drawLane(g, m.x, m.y, d.dx, d.dy, rayLen(m.x, m.y, d.dx, d.dy), half(), k, gun.by === 'player');
          drawTrailWarn(g, gun, recoilEnd(gun), k, time);
        }
      }
    },

    drawAir(g, time) {
      for (const gun of guns) {
        const sk = (time - gun.shotAt) / 900;
        if (sk >= 0 && sk < 1) {
          const m = muzzle(gun), d = dir(gun);
          if (sk < 0.2) drawShot(g, m.x, m.y, d.dx, d.dy, rayLen(m.x, m.y, d.dx, d.dy), half(), 1 - sk / 0.2);
          drawSmoke(g, m.x, m.y, d.dx, d.dy, sk, gun.hx);
        }
        drawGun(g, gun, time);
      }
    },

    drawHud(g, time) {
      const x0 = W / 2 - 66, y = top + 18;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x0 - 10, y - 14, 152, 28, 6);
      guns.forEach((gun, i) => {
        const x = x0 + i * 46;
        const c = gun.state === 'ready' ? BRONZE_LIT : gun.state === 'laying' ? RED_LIT : gun.state === 'primed' ? LAMP : IRON_LIT;
        g.lineStyle(5, c, 1); g.lineBetween(x, y + 3, x + 22, y - 3);
        g.fillStyle(TIMBER, 1); g.fillTriangle(x - 6, y + 8, x + 2, y + 2, x + 10, y + 6);
        g.lineStyle(1.5, TIMBER_DARK, 1); g.strokeCircle(x + 6, y + 5, 5);
        if (gun.state === 'laying' || gun.state === 'primed') { const p = 0.5 + Math.sin(time / 70) * 0.5; g.fillStyle(LAMP, p); g.fillCircle(x + 24, y - 4, 3); }
      });
      for (let i = 0; i < (double ? 2 : 1); i++) { g.fillStyle(IRON_DARK, 1); g.fillCircle(x0 + 134, y - 5 + i * 10, 4); g.fillStyle(IRON_LIT, 0.7); g.fillCircle(x0 + 133, y - 6 + i * 10, 1.4); }
    },

    destroy() { for (const g of guns) g.t?.remove(); },
  };
}

/** Old wheel-ruts and drag marks scored down each trail-line: the yard remembers every recoil. */
function drawRuts(g: G, gun: Gun, e: { x: number; y: number }): void {
  const nx = -Math.sin(gun.a), ny = Math.cos(gun.a);
  for (const s of [-1, 1]) {
    g.lineStyle(5, MUD_DARK, 0.45); g.lineBetween(gun.hx + nx * 26 * s, gun.hy + ny * 26 * s, e.x + nx * 26 * s, e.y + ny * 26 * s);
    g.lineStyle(1.5, MUD_LIT, 0.35); g.lineBetween(gun.hx + nx * 23 * s, gun.hy + ny * 23 * s, e.x + nx * 23 * s, e.y + ny * 23 * s);
  }
  g.fillStyle(MUD_DARK, 0.5); g.fillEllipse(e.x, e.y, 34, 18);
}

/** The laid lane: a chalked line either side of the shot's path, filling red as the port-fire nears the vent. */
function drawLane(g: G, x: number, y: number, dx: number, dy: number, len: number, hw: number, k: number, mine: boolean): void {
  const nx = -dy, ny = dx;
  const col = mine ? LAMP : RED;
  g.fillStyle(col, 0.06 + k * 0.12);
  g.fillPoints([{ x: x + nx * hw, y: y + ny * hw }, { x: x + dx * len + nx * hw, y: y + dy * len + ny * hw }, { x: x + dx * len - nx * hw, y: y + dy * len - ny * hw }, { x: x - nx * hw, y: y - ny * hw }], true);
  for (const s of [-1, 1]) for (let d = 0; d < len; d += 26) {
    const e = Math.min(len, d + 14);
    g.lineStyle(2, IVORY, 0.35 + k * 0.5);
    g.lineBetween(x + dx * d + nx * hw * s, y + dy * d + ny * hw * s, x + dx * e + nx * hw * s, y + dy * e + ny * hw * s);
  }
  // Range marks along the line, as the bombardier paces them.
  for (let d = 80; d < len; d += 80) {
    const px = x + dx * d, py = y + dy * d;
    g.lineStyle(2, col, 0.25 + k * 0.5); g.lineBetween(px + nx * 10, py + ny * 10, px - nx * 10, py - ny * 10);
  }
}

/** Where the carriage will run: hatched red behind the trail, chevrons pointing back. */
function drawTrailWarn(g: G, gun: Gun, e: { x: number; y: number; L: number }, k: number, time: number): void {
  const dx = -Math.cos(gun.a), dy = -Math.sin(gun.a), nx = -dy, ny = dx;
  const hw = TRAIL_R;
  g.fillStyle(RED, 0.08 + k * 0.14);
  g.fillPoints([{ x: gun.hx + nx * hw, y: gun.hy + ny * hw }, { x: e.x + nx * hw, y: e.y + ny * hw }, { x: e.x - nx * hw, y: e.y - ny * hw }, { x: gun.hx - nx * hw, y: gun.hy - ny * hw }], true);
  const ph = (time / 400) % 1;
  for (let d = 30 + ph * 36; d < e.L; d += 36) {
    const px = gun.hx + dx * d, py = gun.hy + dy * d;
    g.lineStyle(3, RED_LIT, 0.3 + k * 0.6);
    g.lineBetween(px - dx * 8 + nx * 14, py - dy * 8 + ny * 14, px, py); g.lineBetween(px, py, px - dx * 8 - nx * 14, py - dy * 8 - ny * 14);
  }
  g.lineStyle(3, RED_LIT, 0.4 + k * 0.5); g.lineBetween(e.x + nx * hw, e.y + ny * hw, e.x - nx * hw, e.y - ny * hw);
}

/** The shot itself: a streak of fire and a dark ball down the lane, gone in a fifth of a second. */
function drawShot(g: G, x: number, y: number, dx: number, dy: number, len: number, hw: number, k: number): void {
  g.lineStyle(hw * 1.2 * k, 0xfff0c8, 0.35 * k); g.lineBetween(x, y, x + dx * len, y + dy * len);
  g.lineStyle(6, LAMP, 0.9 * k); g.lineBetween(x, y, x + dx * len, y + dy * len);
  const b = len * (1 - k);
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x + dx * b, y + dy * b, 8);
  glow(g, x, y, 60, LAMP, 0.08 * k, 3);
}

/** Powder smoke rolling out of the muzzle and settling. */
function drawSmoke(g: G, x: number, y: number, dx: number, dy: number, k: number, seed: number): void {
  for (let i = 0; i < 7; i++) {
    const d = 18 + i * 14 * (0.4 + k), s = (i * 13 + seed) % 7 - 3;
    const r = 12 + i * 3 + k * 16;
    g.fillStyle(i % 2 ? 0xd8d0c4 : 0xb8b0a4, 0.5 * (1 - k));
    g.fillCircle(x + dx * d - dy * s * 5, y + dy * d + dx * s * 5 - k * 20, r);
  }
}

/** A field gun seen from above: trail, axle, iron-tyred wheels, a banded bronze barrel, the vent. */
function drawGun(g: G, gun: Gun, time: number): void {
  const ux = Math.cos(gun.a), uy = Math.sin(gun.a), nx = -uy, ny = ux;
  const P = (u: number, n: number) => ({ x: gun.x + ux * u + nx * n, y: gun.y + uy * u + ny * n });
  shadow(g, gun.x - ux * 18, gun.y + 8, 110, 40, 0.3);
  // Trail beam with its eye and the handspike socket.
  const t0 = P(-78, 0), t1 = P(0, 0);
  g.lineStyle(13, TIMBER_DARK, 1); g.lineBetween(t0.x, t0.y, t1.x, t1.y);
  g.lineStyle(8, TIMBER, 1); g.lineBetween(t0.x, t0.y, t1.x, t1.y);
  g.lineStyle(2, TIMBER_LIT, 0.8); g.lineBetween(P(-74, -2).x, P(-74, -2).y, P(-4, -2).x, P(-4, -2).y);
  g.lineStyle(3, IRON, 1); g.strokeCircle(t0.x, t0.y, 6);
  const hs = P(-60, 0), he = P(-80, 18); g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(hs.x, hs.y, he.x, he.y);
  // Axle and wheels.
  const a0 = P(0, -30), a1 = P(0, 30); g.lineStyle(6, IRON_DARK, 1); g.lineBetween(a0.x, a0.y, a1.x, a1.y);
  const spin = gun.state === 'recoil' || gun.state === 'running' ? time / 40 : 0;
  for (const s of [-1, 1]) {
    const w0 = P(-17, s * 30), w1 = P(17, s * 30);
    g.lineStyle(10, IRON, 1); g.lineBetween(w0.x, w0.y, w1.x, w1.y);
    g.lineStyle(6, TIMBER_DARK, 1); g.lineBetween(w0.x, w0.y, w1.x, w1.y);
    for (let i = 0; i < 4; i++) { const u = -14 + ((i * 9 + spin) % 28); const p = P(u, s * 30); g.fillStyle(TIMBER_LIT, 1); g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
    const hub = P(0, s * 33); g.fillStyle(BRASS, 1); g.fillCircle(hub.x, hub.y, 4);
  }
  // The barrel: cascabel, reinforce, chase, muzzle swell.
  const outline = [P(-24, -9), P(30, -6.5), P(40, -7.5), P(46, -6), P(46, 6), P(40, 7.5), P(30, 6.5), P(-24, 9)];
  g.fillStyle(BRONZE, 1); g.fillPoints(outline, true);
  g.lineStyle(1.5, 0x5a3c1a, 1); g.strokePoints(outline, true);
  const hl = [P(-22, -5), P(44, -3.5)]; g.lineStyle(2, BRONZE_LIT, 0.9); g.lineBetween(hl[0].x, hl[0].y, hl[1].x, hl[1].y);
  for (const u of [-14, 4, 30]) { const p0 = P(u, -8.5), p1 = P(u, 8.5); g.lineStyle(2.5, 0x6a4a22, 1); g.lineBetween(p0.x, p0.y, p1.x, p1.y); }
  const kn = P(-30, 0); g.fillStyle(BRONZE, 1); g.fillCircle(kn.x, kn.y, 5); g.lineStyle(1, 0x5a3c1a, 1); g.strokeCircle(kn.x, kn.y, 5);
  for (const s of [-1, 1]) { const tr = P(0, s * 11); g.fillStyle(BRONZE_LIT, 1); g.fillCircle(tr.x, tr.y, 3.5); }
  const mz = P(46, 0); g.fillStyle(IRON_DARK, 1); g.fillCircle(mz.x, mz.y, 4.5);
  // The vent, smoking when the port-fire is put to it.
  const v = P(-16, 0);
  g.fillStyle(0x1a1410, 1); g.fillCircle(v.x, v.y, 2);
  if (gun.state === 'primed' || gun.state === 'laying') {
    const fl = 0.6 + Math.sin(time / 45) * 0.4;
    glow(g, v.x, v.y, 16, LAMP, 0.1 * fl, 3);
    for (let i = 0; i < 5; i++) { const ph = ((time / 500 + i / 5) % 1); g.fillStyle(0xc8c0b4, 0.5 * (1 - ph)); g.fillCircle(v.x + Math.sin(i * 2 + time / 300) * 4, v.y - ph * 30, 3 + ph * 6); }
    g.fillStyle(gun.state === 'primed' ? 0xfff0a0 : RED_LIT, fl); g.fillCircle(v.x, v.y, 3);
  }
  // A rammer-and-sponge laid beside the carriage, and three balls stacked at its mark.
  if (gun.state === 'ready' || gun.state === 'laying') {
    const r0 = P(-50, -44), r1 = P(30, -44); g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(r0.x, r0.y, r1.x, r1.y);
    g.fillStyle(0x3a2e24, 1); g.fillEllipse(r1.x, r1.y, 12, 12); g.fillStyle(IVORY, 0.4); g.fillEllipse(r0.x, r0.y, 9, 9);
  }
  for (const [u, n] of [[-40, 44], [-30, 44], [-35, 36]] as [number, number][]) {
    const b = { x: gun.hx + ux * u + nx * n, y: gun.hy + uy * u + ny * n };
    g.fillStyle(IRON_DARK, 1); g.fillCircle(b.x, b.y, 5); g.fillStyle(IRON_LIT, 0.6); g.fillCircle(b.x - 1.5, b.y - 1.5, 1.6);
  }
}

export const FALLEN_RUN_OUT: GimmickDef = {
  id: ID,
  rules: 'Field guns fire down their lanes, then recoil and roll back over whoever stands behind. Strike a breech to fire it — then get off its trail.',
  make,
};
