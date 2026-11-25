import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BARK_DARK, GILT, HUNT_RED, SUN, TIMBER, TIMBER_DARK, TIMBER_LIT, clamp, dist } from '../util';
import { EMBER, alive, angDiff, lineDist } from './kit';

/**
 * Lamped — Corwen Sallow, Lamp-Man: a poacher once, who in the King's telling bought his own
 * pardon by lamping for the Prince — walking the night woods with a bullseye lantern, so the
 * families who ran from the Tithe were pinned in its light for the crossbows on the high seats.
 *
 * The fight is at night. A great hunting lamp on a pole in the middle of the floor throws one long
 * beam that turns like a clock hand. Stay in the beam too long and you are **lamped**: held where
 * you stand a breath, and a crossbow on one of the four high seats looses a bolt down a lane the
 * floor shows you. Step off the lane before it flies.
 *
 * Exploits: the light is cruel to a shadow — Corwen takes more damage while it is on him, and he
 * can be lamped like anyone. Strike the lamp and it swings back the other way: catch him in it. A
 * bolt flies on through everyone in its lane, so stand where a bolt meant for you crosses him.
 * At half, a second lens is unshuttered and the lamp throws two beams, back to back.
 */

const ID = fallenId('wildhunt', 'lamped');
const HALF = 0.2;
const RANGE = 560;
const GLARE_MAX = 0.55;
const BOLT_WARN = 950;
const BOLT_HW = 20;

interface Bolt { sx: number; sy: number; a: number; fireAt: number; firedAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 10;
  const seats: Pt[] = [{ x: 46, y: top + 40 }, { x: W - 46, y: top + 40 }, { x: 46, y: H - 30 }, { x: W - 46, y: H - 30 }];
  let ang = -Math.PI / 2;
  let spin = 1;
  let two = false;
  let swungAt = -1e9;
  const glare = new Map<Fighter, number>();
  const calm = new Map<Fighter, number>();
  const bolts: Bolt[] = [];

  const beams = (): number[] => (two ? [ang, ang + Math.PI] : [ang]);
  const inBeam = (x: number, y: number): boolean => {
    const d = dist(x, y, cx, cy);
    if (d < 34 || d > RANGE) return false;
    const a = Math.atan2(y - cy, x - cx);
    return beams().some((b) => Math.abs(angDiff(a, b)) < HALF + 14 / d);
  };

  const lamp = ctx.target({
    x: cx, y: cy - 58, r: 24,
    onStruck() {
      if (tk.now - swungAt < 700) return;
      swungAt = tk.now;
      spin = -spin;
      ctx.sfx('clang');
      ctx.flash(cx, cy - 58, SUN);
    },
  });

  /** Lamped: held a breath, and the high seat farthest from the lamp's shadow looses down a lane. */
  function lampFighter(f: Fighter, time: number): void {
    ctx.root(f, 600);
    calm.set(f, time + 2200);
    glare.set(f, 0);
    let best = seats[0], bd = -1;
    for (const s of seats) { const d = dist(s.x, s.y, f.x, f.y); if (d > bd && d < 900) { bd = d; best = s; } }
    bolts.push({ sx: best.x, sy: best.y, a: Math.atan2(f.y - best.y, f.x - best.x), fireAt: time + tk.warn(BOLT_WARN), firedAt: 0 });
    ctx.sfx('reload');
    ctx.float(f.x, f.y - 52, 'LAMPED', '#fff2b0');
  }

  return {
    update(time, dt) {
      if (!two && npc.hp < npc.maxHp * 0.5) {
        two = true;
        ctx.banner('THE SECOND LENS', '#fff2b0');
        ctx.sfx('light-beam');
      }
      ang += spin * (two ? 0.62 : 0.55) * dt;
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const g0 = glare.get(f) ?? 0;
        if (time < (calm.get(f) ?? 0)) { glare.set(f, 0); continue; }
        const g1 = inBeam(f.x, f.y) ? g0 + dt : Math.max(0, g0 - dt * 1.5);
        glare.set(f, g1);
        if (g1 >= GLARE_MAX) lampFighter(f, time);
      }
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        if (!b.firedAt && time >= b.fireAt) {
          b.firedAt = time;
          ctx.sfx('musket');
          for (const f of [player, npc]) {
            if (!alive(f)) continue;
            const along = (f.x - b.sx) * Math.cos(b.a) + (f.y - b.sy) * Math.sin(b.a);
            if (along < 0 || lineDist(f.x, f.y, b.sx, b.sy, b.a) > BOLT_HW + 12) continue;
            if (f === player) tk.hitPlayer(20, f.x, f.y);
            else { ctx.hit(npc, 26, f.x, f.y); ctx.float(f.x, f.y - 56, 'OWN BOLT', '#ffcf8a'); }
          }
        }
        if (b.firedAt && time - b.firedAt > 260) bolts.splice(i, 1);
      }
    },

    npcTakenMult() { return alive(npc) && inBeam(npc.x, npc.y) ? 1.35 : 1; },

    npcSeek() {
      if (!alive(npc)) return null;
      // Keep in the dark just behind the turning beam, at the player's distance from the pole.
      const r = clamp(dist(player.x, player.y, cx, cy), 150, 300);
      const lag = two ? Math.PI / 2 : 0.9;
      const a = ang - spin * lag;
      const bolt = bolts.find((b) => !b.firedAt);
      if (bolt && lineDist(npc.x, npc.y, bolt.sx, bolt.sy, bolt.a) < BOLT_HW + 50) {
        const n = bolt.a + Math.PI / 2;
        const s = (npc.x - bolt.sx) * Math.cos(n) + (npc.y - bolt.sy) * Math.sin(n) >= 0 ? 1 : -1;
        return { x: tk.clampX(npc.x + Math.cos(n) * s * 110), y: tk.clampY(npc.y + Math.sin(n) * s * 110) };
      }
      return { x: tk.clampX(cx + Math.cos(a) * r), y: tk.clampY(cy + Math.sin(a) * r) };
    },

    drawGround(g, time) {
      // Night over the clearing, then the beams cut through it.
      g.fillStyle(0x04070c, 0.5); g.fillRect(0, top, W, H - top);
      for (const b of beams()) drawBeam(g, cx, cy, b, time);
      for (const b of bolts) drawLane(g, b, time, W);
    },

    drawAir(g, time) {
      for (const s of seats) drawHighSeat(g, s, bolts.some((b) => b.sx === s.x && b.sy === s.y && !b.firedAt), time);
      drawLamp(g, cx, cy, beams(), time, time - swungAt < 400);
      for (const b of bolts) {
        if (!b.firedAt) continue;
        const k = (time - b.firedAt) / 260;
        const d = k * 1100;
        const x = b.sx + Math.cos(b.a) * d, y = b.sy + Math.sin(b.a) * d;
        g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(x - Math.cos(b.a) * 26, y - Math.sin(b.a) * 26, x, y);
        g.fillStyle(0xd8d8d0, 1); g.fillTriangle(x, y, x - Math.cos(b.a - 0.4) * 8, y - Math.sin(b.a - 0.4) * 8, x - Math.cos(b.a + 0.4) * 8, y - Math.sin(b.a + 0.4) * 8);
      }
      // A held fighter: the light's white rim round them.
      for (const f of [player, npc]) {
        const gl = glare.get(f) ?? 0;
        if (!alive(f) || gl <= 0.05) continue;
        g.lineStyle(2, SUN, 0.3 + (gl / GLARE_MAX) * 0.6); g.strokeEllipse(f.x, f.y + 14, 40, 14);
      }
    },

    drawHud(g) {
      // An eye that opens as the lamp finds you.
      const x = W / 2 - 40, y = top + 16;
      const k = clamp((glare.get(player) ?? 0) / GLARE_MAX, 0, 1);
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 26, y - 12, 132, 24, 8);
      g.fillStyle(0x1a1a14, 1); g.fillEllipse(x, y, 34, 16);
      g.fillStyle(SUN, 0.25 + k * 0.75); g.fillEllipse(x, y, 34 * (0.3 + k * 0.7), 16 * (0.2 + k * 0.8));
      g.fillStyle(0x10100c, 1); g.fillCircle(x, y, 3 + (1 - k) * 3);
      g.lineStyle(1.5, GILT, 0.9); g.strokeEllipse(x, y, 34, 16);
      // The lamp's turn: an arrow round a dial, one or two lenses.
      const dx = x + 64;
      g.fillStyle(0x2a2420, 1); g.fillCircle(dx, y, 10);
      for (const b of beams()) { g.fillStyle(SUN, 0.9); g.fillTriangle(dx, y, dx + Math.cos(b - 0.3) * 10, y + Math.sin(b - 0.3) * 10, dx + Math.cos(b + 0.3) * 10, y + Math.sin(b + 0.3) * 10); }
      const ar = ang + spin * 1.2;
      g.lineStyle(2, EMBER, 1);
      g.beginPath(); g.arc(dx, y, 13, ang, ar, spin < 0); g.strokePath();
      g.fillStyle(EMBER, 1); g.fillCircle(dx + Math.cos(ar) * 13, y + Math.sin(ar) * 13, 2.5);
    },

    destroy() { lamp.remove(); },
  };
}

/** One beam of the lamp across the turf: a soft outer cone, a hot core, moths caught in it. */
function drawBeam(g: G, x: number, y: number, a: number, time: number): void {
  const P = (r: number, w: number) => ({ x: x + Math.cos(a) * r - Math.sin(a) * w, y: y + Math.sin(a) * r + Math.cos(a) * w });
  for (const [hw, al] of [[1.25, 0.05], [1, 0.08], [0.55, 0.1]] as const) {
    const w = Math.tan(HALF * hw) * RANGE;
    g.fillStyle(SUN, al);
    g.fillPoints([P(20, -6), P(RANGE, -w), P(RANGE + 30, 0), P(RANGE, w), P(20, 6)], true);
  }
  // Dust and moths drifting in the light.
  for (let i = 0; i < 14; i++) {
    const r = 60 + ((i * 97 + time * 0.03) % (RANGE - 80));
    const w = Math.sin(time / 400 + i * 1.7) * Math.tan(HALF) * r * 0.8;
    const p = P(r, w);
    g.fillStyle(0xfff8e0, 0.6); g.fillCircle(p.x, p.y, i % 4 === 0 ? 2.2 : 1.2);
    if (i % 4 === 0) { g.lineStyle(1, 0xd8ccb0, 0.6); g.lineBetween(p.x - 3, p.y - 2 + Math.sin(time / 40 + i), p.x + 3, p.y - 2 - Math.sin(time / 40 + i)); }
  }
}

/** The crossbow's lane: a scored line on the turf from the high seat, quills of light running along it. */
function drawLane(g: G, b: Bolt, time: number, W: number): void {
  const len = W * 1.3;
  const k = b.firedAt ? 1 : clamp(1 - (b.fireAt - time) / BOLT_WARN, 0, 1);
  const ex = b.sx + Math.cos(b.a) * len, ey = b.sy + Math.sin(b.a) * len;
  const nx = -Math.sin(b.a), ny = Math.cos(b.a);
  g.fillStyle(HUNT_RED, 0.1 + k * 0.15);
  g.fillPoints([
    { x: b.sx + nx * BOLT_HW, y: b.sy + ny * BOLT_HW }, { x: ex + nx * BOLT_HW, y: ey + ny * BOLT_HW },
    { x: ex - nx * BOLT_HW, y: ey - ny * BOLT_HW }, { x: b.sx - nx * BOLT_HW, y: b.sy - ny * BOLT_HW },
  ], true);
  g.lineStyle(1.5, 0xff8a6a, 0.4 + k * 0.5);
  g.lineBetween(b.sx, b.sy, ex, ey);
  for (let d = (time * 0.4) % 60; d < len * k; d += 60) {
    const px = b.sx + Math.cos(b.a) * d, py = b.sy + Math.sin(b.a) * d;
    g.lineStyle(2, 0xffc8a0, 0.6);
    g.lineBetween(px - Math.cos(b.a) * 8 + nx * 6, py - Math.sin(b.a) * 8 + ny * 6, px, py);
    g.lineBetween(px - Math.cos(b.a) * 8 - nx * 6, py - Math.sin(b.a) * 8 - ny * 6, px, py);
  }
}

/** A high seat in the corner: ladder legs, a plank box, a crossbowman's hat over the rail. */
function drawHighSeat(g: G, s: Pt, loaded: boolean, time: number): void {
  shadow(g, s.x, s.y + 6, 50, 14, 0.35);
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(s.x - 16, s.y + 4, s.x - 10, s.y - 34); g.lineBetween(s.x + 16, s.y + 4, s.x + 10, s.y - 34);
  for (let r = 0; r < 4; r++) { g.lineStyle(2, TIMBER, 1); g.lineBetween(s.x - 15 + r * 1.5, s.y - 4 - r * 9, s.x + 15 - r * 1.5, s.y - 4 - r * 9); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(s.x - 18, s.y - 52, 36, 18);
  g.fillStyle(TIMBER, 1); g.fillRect(s.x - 16, s.y - 50, 32, 14);
  for (let i = 0; i < 4; i++) { g.lineStyle(1, BARK_DARK, 0.8); g.lineBetween(s.x - 16, s.y - 47 + i * 4, s.x + 16, s.y - 47 + i * 4); }
  g.fillStyle(0x2a4a2a, 1); g.fillEllipse(s.x, s.y - 56, 16, 7);
  g.fillStyle(EMBER, 0.9); g.fillCircle(s.x - 3, s.y - 53, 1.2); g.fillCircle(s.x + 3, s.y - 53, 1.2);
  if (loaded) {
    // The crossbow levelled over the rail, its string glinting.
    g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(s.x - 12, s.y - 44, s.x + 12, s.y - 44);
    g.lineStyle(1, 0xffffff, 0.5 + Math.sin(time / 50) * 0.4); g.lineBetween(s.x - 10, s.y - 47, s.x + 10, s.y - 47);
    glow(g, s.x, s.y - 44, 22, 0xff6a4a, 0.08, 2);
  }
}

/** The hunting lamp: a tall ash pole, iron yoke, a drum lantern with a polished reflector per lens. */
function drawLamp(g: G, x: number, y: number, beams: number[], time: number, jolt: boolean): void {
  shadow(g, x, y + 4, 60, 18, 0.4);
  g.fillStyle(BARK_DARK, 1); g.fillEllipse(x, y, 30, 12);
  g.lineStyle(7, TIMBER_DARK, 1); g.lineBetween(x, y, x, y - 54);
  g.lineStyle(3, TIMBER, 1); g.lineBetween(x - 1, y, x - 1, y - 54);
  for (const k of [-1, 1]) { g.lineStyle(2.5, 0x2a2420, 1); g.lineBetween(x, y - 4, x + k * 22, y + 6); }
  const hy = y - 58 + (jolt ? Math.sin(time / 20) * 2 : 0);
  glow(g, x, hy, 46, SUN, 0.07, 4);
  g.fillStyle(0x2a2420, 1); g.fillCircle(x, hy, 15);
  g.fillStyle(0x4a4038, 1); g.fillCircle(x, hy, 12);
  for (const b of beams) {
    const lx = x + Math.cos(b) * 13, ly = hy + Math.sin(b) * 7;
    g.fillStyle(0xd8c890, 1); g.fillCircle(lx, ly, 7);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(lx, ly, 4);
    g.lineStyle(1.5, GILT, 1); g.strokeCircle(lx, ly, 7);
  }
  // Chimney cap and the hot vent.
  g.fillStyle(0x2a2420, 1); g.fillTriangle(x - 9, hy - 13, x + 9, hy - 13, x, hy - 24);
  g.fillStyle(EMBER, 0.6 + Math.sin(time / 90) * 0.3); g.fillRect(x - 3, hy - 16, 6, 2);
}

export const FALLEN_LAMPED: GimmickDef = {
  id: ID,
  rules: 'A turning lamp lights the night. Linger in its beam and you are held while a crossbow fires down a lane. Strike the lamp to swing it back.',
  make,
};
