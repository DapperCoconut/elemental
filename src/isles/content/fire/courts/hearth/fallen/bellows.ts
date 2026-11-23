import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { ASH_LIT, BRAND, EMBER, EMBER_DARK, EMBER_LIT, GLOW, IRON, SMOKE, SOOT, SOOT_SOFT } from '../palette';
import { alive, clamp, dist, frameClock } from '../gimmicks/util';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Bellows Breathe — Grue, Bellows-Hand of the Great Hearth: the strongest back on the terraces,
 * who in the King's telling was paid in gold to pump the tithe fires hotter on the nights the
 * Prince's men came counting.
 *
 * A great leather bellows is set into the wall, its iron nozzle aimed down a broad band of the
 * floor, and coal-beds lie banked across the room. Grue works it: the bellows *draws* (leather
 * rising, air streaming back into the nozzle, the band marked on the cobbles), then *blows* —
 * everyone in the band is shoved hard down it, and every coal-bed in the band flares into a
 * column of flame. Step out of the band sideways and the blast misses you.
 *
 * It shoves Grue too. The exploit is to stand so a coal-bed lies downwind of *him*: the breath
 * throws him onto the flare. Halfway down, a second bellows wakes in the north wall and the two
 * take turns, so the band swings a quarter-turn every breath. The bot steps out of the band while
 * it draws, and otherwise stands upwind of you, so the breath carries you toward the coals.
 */

const ID = fallenId('hearth', 'bellows');
const BAND = 115;
const DRAW_MS = 1450;
const BLOW_MS = 900;
const BED_R = 42;

interface Bellows { x: number; y: number; dx: number; dy: number }
interface Bed { x: number; y: number; flareAt: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const step = frameClock();
  const ym = (top + H) / 2;
  const west: Bellows = { x: 0, y: ym, dx: 1, dy: 0 };
  const north: Bellows = { x: W / 2, y: top, dx: 0, dy: 1 };
  const fy = (k: number) => top + (H - top) * k;
  const beds: Bed[] = [
    { x: W * 0.36, y: ym - 40 }, { x: W * 0.72, y: ym + 55 }, { x: W * 0.47, y: fy(0.22) },
    { x: W * 0.55, y: fy(0.86) }, { x: W * 0.17, y: fy(0.14) }, { x: W * 0.86, y: fy(0.18) },
  ].map((b, i) => ({ ...b, flareAt: -1e9, seed: i * 2.1 }));
  let cur = west;
  let both = false;
  let drawAt = 0;
  let blowAt = 0;
  let nextDraw = 0;
  let started = false;
  let flared = false;
  const burned = new Set<string>();

  /** Distance across the band's axis, and along it. */
  const across = (b: Bellows, x: number, y: number) => Math.abs((x - b.x) * -b.dy + (y - b.y) * b.dx);
  const inBand = (b: Bellows, x: number, y: number) => across(b, x, y) < BAND;
  const blowing = (time: number) => blowAt > 0 && time >= blowAt && time < blowAt + BLOW_MS;
  const drawing = (time: number) => drawAt > 0 && time >= drawAt && time < blowAt;

  function sear(f: Fighter, bed: Bed): void {
    const key = `${f === player ? 'p' : 'n'}${beds.indexOf(bed)}${blowAt}`;
    if (burned.has(key)) return;
    burned.add(key);
    if (f === player) { tk.hitPlayer(18, f.x, f.y); ctx.sfx('status-burn'); }
    else { ctx.hit(npc, 30, f.x, f.y); ctx.float(f.x, f.y - 56, 'FANNED', '#ffb070'); }
    ctx.flash(bed.x, bed.y, EMBER);
  }

  return {
    update(time) {
      const dt = step(time);
      if (!started) { started = true; nextDraw = time + 2200; }
      if (!both && npc.hp < npc.maxHp * 0.5) {
        both = true;
        ctx.banner('TWO BELLOWS', '#ffb070');
        ctx.sfx('roar');
      }
      if (!drawAt && time >= nextDraw) {
        if (both) cur = cur === west ? north : west;
        drawAt = time;
        flared = false;
        blowAt = time + tk.warn(DRAW_MS);
        ctx.sfx('whoosh');
      }
      if (blowAt && time >= blowAt && !flared) {
        flared = true;
        ctx.sfx('flame-burst');
        for (const b of beds) if (inBand(cur, b.x, b.y)) b.flareAt = time;
      }
      if (blowing(time)) {
        const push = (both ? 300 : 270) * dt;
        for (const f of [player, npc]) {
          if (!alive(f) || !inBand(cur, f.x, f.y)) continue;
          ctx.nudge(f, cur.dx * push, cur.dy * push);
        }
        for (const b of beds) {
          if (time - b.flareAt > BLOW_MS + 200) continue;
          for (const f of [player, npc]) if (alive(f) && dist(f.x, f.y, b.x, b.y) < BED_R + 14) sear(f, b);
        }
      }
      if (blowAt && time >= blowAt + BLOW_MS) {
        drawAt = 0; blowAt = 0;
        nextDraw = time + (both ? 2200 : 2900);
        if (burned.size > 60) burned.clear();
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      const t = tk.now;
      // While it draws: out of the band, the short way.
      if (drawing(t) && inBand(cur, npc.x, npc.y)) {
        const s = (npc.x - cur.x) * -cur.dy + (npc.y - cur.y) * cur.dx >= 0 ? 1 : -1;
        const off = BAND + 50 - across(cur, npc.x, npc.y);
        return { x: tk.clampX(npc.x - cur.dy * s * off), y: tk.clampY(npc.y + cur.dx * s * off) };
      }
      // Otherwise: upwind of you, just outside the band's edge, so the breath carries you.
      if (inBand(cur, player.x, player.y)) {
        const side = (player.x - cur.x) * -cur.dy + (player.y - cur.y) * cur.dx >= 0 ? 1 : -1;
        const x = player.x - cur.dx * 120 - cur.dy * side * (BAND + 30 - across(cur, player.x, player.y));
        const y = player.y - cur.dy * 120 + cur.dx * side * (BAND + 30 - across(cur, player.x, player.y));
        return { x: tk.clampX(x), y: tk.clampY(y) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const b of beds) drawBed(g, b, time, inBand(cur, b.x, b.y) && drawAt > 0);
      if (drawAt) {
        const k = drawing(time) ? clamp((time - drawAt) / (blowAt - drawAt), 0, 1) : 1;
        drawBand(g, cur, W, H, top, k, blowing(time), time);
      }
    },

    drawAir(g, time) {
      const breath = drawing(time) ? clamp((time - drawAt) / (blowAt - drawAt), 0, 1) : blowing(time) ? 1 - (time - blowAt) / BLOW_MS : 0;
      drawBellows(g, west, cur === west ? breath : 0, both || cur === west, time);
      if (both) drawBellows(g, north, cur === north ? breath : 0, true, time);
      for (const b of beds) {
        const k = (time - b.flareAt) / (BLOW_MS + 200);
        if (k < 0 || k > 1) continue;
        drawFlare(g, b.x, b.y, 1 - k, time, b.seed);
      }
    },

    drawHud(g, time) {
      // The pressure gauge: a dial that winds up as the bellows draws.
      const x = W / 2, y = top + 18;
      const k = drawing(time) ? clamp((time - drawAt) / (blowAt - drawAt), 0, 1) : blowing(time) ? 1 : clamp(1 - (nextDraw - time) / 2900, 0, 1) * 0.3;
      g.fillStyle(0x000000, 0.55); g.fillCircle(x, y, 16);
      g.fillStyle(0xd8ccb0, 1); g.fillCircle(x, y, 13);
      g.lineStyle(3, EMBER, 1);
      g.beginPath(); g.arc(x, y, 10, Math.PI * 0.75 + Math.PI * 1.1, Math.PI * 2.25, false); g.strokePath();
      for (let i = 0; i <= 6; i++) { const a = Math.PI * 0.75 + (Math.PI * 1.5 * i) / 6; g.lineStyle(1, IRON, 1); g.lineBetween(x + Math.cos(a) * 9, y + Math.sin(a) * 9, x + Math.cos(a) * 12, y + Math.sin(a) * 12); }
      const na = Math.PI * 0.75 + Math.PI * 1.5 * k + (blowing(time) ? Math.sin(time / 30) * 0.06 : 0);
      g.lineStyle(2, BRAND, 1); g.lineBetween(x, y, x + Math.cos(na) * 11, y + Math.sin(na) * 11);
      g.fillStyle(IRON, 1); g.fillCircle(x, y, 2.5);
      // Which wall breathes next.
      const ax = x + 30;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(ax - 4, y - 10, 28, 20, 4);
      g.fillStyle(EMBER_LIT, 1);
      if (cur === west) g.fillTriangle(ax + 2, y - 5, ax + 2, y + 5, ax + 18, y);
      else g.fillTriangle(ax + 5, y - 6, ax + 15, y - 6, ax + 10, y + 7);
    },
  };
}

/** A banked coal-bed in an iron grate; brightening when the band covers it and the bellows draws. */
function drawBed(g: G, b: Bed, time: number, armed: boolean): void {
  shadow(g, b.x, b.y + 4, BED_R * 2.2, BED_R * 0.7, 0.3);
  g.fillStyle(SOOT, 1); g.fillEllipse(b.x, b.y, BED_R * 2, BED_R * 1.1);
  g.lineStyle(3, IRON, 1); g.strokeEllipse(b.x, b.y, BED_R * 2, BED_R * 1.1);
  for (let i = -3; i <= 3; i++) { g.lineStyle(1.5, IRON, 0.9); g.lineBetween(b.x + i * 11, b.y - BED_R * 0.5, b.x + i * 11, b.y + BED_R * 0.5); }
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39 + b.seed, r = (i % 5) * 7 + 4;
    const cx = b.x + Math.cos(a) * r, cy = b.y + Math.sin(a) * r * 0.5;
    g.fillStyle(i % 3 ? 0x1a1716 : SOOT_SOFT, 1); g.fillCircle(cx, cy, 5);
    const heat = armed ? 0.6 + Math.sin(time / 60 + i) * 0.3 : 0.25 + Math.sin(time / 500 + i) * 0.15;
    g.fillStyle(armed ? EMBER : EMBER_DARK, heat); g.fillCircle(cx + 1, cy - 1, 2.2);
  }
  if (armed) glow(g, b.x, b.y, BED_R * 1.4, EMBER, 0.04, 3);
}

/** The breath's band on the floor: chalk edges while it draws (air streaming home), gusts when it blows. */
function drawBand(g: G, b: Bellows, W: number, H: number, top: number, k: number, blow: boolean, time: number): void {
  const len = b.dx ? W : H - top;
  const nx = -b.dy, ny = b.dx;
  const corner = (along: number, side: number): Pt => ({ x: b.x + b.dx * along + nx * side * BAND, y: b.y + b.dy * along + ny * side * BAND });
  g.fillStyle(blow ? GLOW : ASH_LIT, blow ? 0.1 : 0.05 + k * 0.05);
  g.fillPoints([corner(0, -1), corner(len, -1), corner(len, 1), corner(0, 1)], true);
  g.lineStyle(2, blow ? EMBER_LIT : 0xd8ccb0, 0.35 + k * 0.4);
  for (const s of [-1, 1]) { const a = corner(0, s), c = corner(len, s); g.lineBetween(a.x, a.y, c.x, c.y); }
  for (let i = 0; i < 16; i++) {
    const lane = ((i * 37) % 9) / 8 * 2 - 1;
    const sp = blow ? 1.8 : -0.5;
    const ph = (((time / 1000) * sp + i / 16) % 1 + 1) % 1;
    const p = corner(ph * len, lane * 0.85);
    const tail = blow ? 46 : 22;
    g.lineStyle(blow ? 2 : 1.5, blow ? 0xfff0c8 : SMOKE, blow ? 0.6 : 0.5 * k);
    g.lineBetween(p.x, p.y, p.x - b.dx * tail * Math.sign(sp), p.y - b.dy * tail * Math.sign(sp));
  }
}

/** A column of flame off a fanned coal-bed. */
function drawFlare(g: G, x: number, y: number, k: number, time: number, seed: number): void {
  const h = 90 * k + 20;
  for (let i = 0; i < 5; i++) {
    const fx = x - 24 + i * 12;
    const lick = h * (0.7 + Math.sin(time / 60 + i * 1.6 + seed) * 0.3);
    g.fillStyle(EMBER_DARK, 0.8 * k); g.fillTriangle(fx - 10, y, fx + 10, y, fx, y - lick * 1.05);
    g.fillStyle(EMBER, 0.9 * k); g.fillTriangle(fx - 7, y, fx + 7, y, fx, y - lick);
    g.fillStyle(GLOW, k); g.fillTriangle(fx - 3, y, fx + 3, y, fx, y - lick * 0.6);
  }
  glow(g, x, y - h * 0.4, 70, EMBER, 0.06 * k, 3);
}

/** The great bellows: two boards of oak, a leather belly breathing between, an iron nozzle. */
function drawBellows(g: G, b: Bellows, breath: number, awake: boolean, time: number): void {
  const ang = Math.atan2(b.dy, b.dx);
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  const P = (u: number, n: number) => ({ x: b.x + ux * u + nx * n, y: b.y + uy * u + ny * n });
  const open = 16 + breath * 26 + (awake ? Math.sin(time / 600) * 2 : 0);
  // Leather belly with its pleats.
  g.fillStyle(0x4a2c1c, 1);
  g.fillPoints([P(4, -open - 30), P(54, -open * 0.5 - 10), P(54, open * 0.5 + 10), P(4, open + 30)], true);
  for (let i = 1; i < 4; i++) {
    const u = 4 + i * 12;
    const w = open + 30 - (i * (open * 0.5 + 20)) / 4;
    g.lineStyle(1.5, 0x2b1a10, 1); const a = P(u, -w), c = P(u, w); g.lineBetween(a.x, a.y, c.x, c.y);
  }
  // The two boards.
  for (const s of [-1, 1]) {
    const a = P(0, s * (open + 34)), c = P(58, s * (open * 0.5 + 12));
    g.lineStyle(7, 0x5a4430, 1); g.lineBetween(a.x, a.y, c.x, c.y);
    g.lineStyle(2, 0x7a5e44, 1); g.lineBetween(a.x, a.y, c.x, c.y);
    const h = P(-2, s * (open + 40)); g.fillStyle(IRON, 1); g.fillCircle(h.x, h.y, 5);
  }
  // The nozzle, hot at the lip when it blows.
  const n0 = P(54, 0), n1 = P(92, 0);
  g.lineStyle(14, IRON, 1); g.lineBetween(n0.x, n0.y, n1.x, n1.y);
  g.lineStyle(4, 0x4a4440, 1); g.lineBetween(n0.x, n0.y - 3, n1.x, n1.y - 3);
  g.fillStyle(breath > 0.9 ? EMBER_LIT : SOOT, 1); g.fillCircle(n1.x, n1.y, 6);
  if (!awake) { g.fillStyle(0x000000, 0.35); g.fillCircle(P(30, 0).x, P(30, 0).y, 40); }
}

export const FALLEN_BELLOWS: GimmickDef = {
  id: ID,
  rules: 'The bellows draws, then blows: all in its band are shoved and its coal-beds flare. Step out sideways; blow Grue into the coals. At half, two bellows.',
  make,
};
