import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BARK_LIT, CREPE, CREPE_DARK, HOT_LIT, IRON, LATEX, LATEX_DARK, LATEX_LIT, TOY_BLUE, TOY_RED, TOY_YELLOW } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Twelve Hundred Turns — Avelina Strutt, Test-Flier of the Toy Works: she flew every rubber-powered
 * model the Works sold before it went in a box, winding its motor twelve hundred turns on a hand
 * drill. In the King's telling the Prince gave her a yard of real people to fly them over, and she
 * learned to trim a rudder so a plane would circle one man until he dropped.
 *
 * She hand-launches balsa-and-tissue aeroplanes, each driven by a twisted rubber motor slung under
 * its stick. Powered, a plane flies a tight circle (its ring is chalked on the floor beneath it)
 * that drifts after you, and its prop clips whoever it passes through. When the motor unwinds the
 * prop stops, the nose dips — a stall, its glide line chalked straight ahead — and it glides on
 * dead straight and noses in, bursting on whatever it meets or where it falls.
 *
 * Strike a powered plane and you snap its motor: it stalls on the spot and glides on its heading.
 * Avelina trims her planes to miss her while they are powered, but a glider hits whoever it meets
 * — so cut one as its nose comes round to her. Past halfway she launches them in pairs that
 * circle opposite ways. The bot keeps off glide lines; she launches from wherever she stands.
 */

const ID = fallenId('bounce', 'planes');
const SPEED = 215;
const GLIDE = 330;
const STALL_MS = 420;
const GLIDE_MS = 1100;
const PLANE_R = 18;

interface Plane {
  cx: number; cy: number; r: number; th: number; spin: 1 | -1;
  x: number; y: number; head: number;
  power: number; full: number;
  stallAt: number; glideAt: number; downAt: number; gx: number; gy: number;
  hitCd: Map<Fighter, number>; tgt: StrikeTarget | null; seed: number; born: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  let planes: Plane[] = [];
  const crashes: { x: number; y: number; at: number }[] = [];
  let nextLaunch = 0;
  let started = false;
  let pairs = false;
  let flip: 1 | -1 = 1;

  const cap = () => (pairs ? 4 : 3);
  const powered = (p: Plane) => p.stallAt < 0;

  function launch(time: number, spin: 1 | -1): void {
    const r = 95 + rng() * 30;
    const head = Math.atan2(player.y - npc.y, player.x - npc.x) + (rng() - 0.5) * 0.6;
    // The circle's centre lies off the plane's wing on the side it turns to.
    const cx = clamp(npc.x - Math.sin(head) * r * spin, r + 30, W - r - 30);
    const cy = clamp(npc.y + Math.cos(head) * r * spin, top + r + 20, H - r - 20);
    const th = Math.atan2(npc.y - cy, npc.x - cx);
    const full = 5600 + rng() * 1400;
    const p: Plane = {
      cx, cy, r, th, spin, x: npc.x, y: npc.y, head, power: full, full,
      stallAt: -1, glideAt: -1, downAt: -1, gx: 0, gy: 0, hitCd: new Map(), tgt: null, seed: rng() * 10, born: time,
    };
    p.tgt = ctx.target({ x: p.x, y: p.y, r: PLANE_R + 4, passThrough: false, onStruck: () => { if (powered(p) && tk.now - p.born > 600) stall(p, tk.now); } });
    planes.push(p);
    ctx.sfx('whoosh');
  }

  /** The motor is spent (or snapped): the prop stops and the nose dips. The glide goes on the heading it has now. */
  function stall(p: Plane, time: number): void {
    p.stallAt = time;
    p.glideAt = time + STALL_MS;
    p.downAt = p.glideAt + GLIDE_MS;
    p.gx = Math.cos(p.head); p.gy = Math.sin(p.head);
    p.tgt?.remove(); p.tgt = null;
    ctx.sfx('snap-back');
  }

  function crash(p: Plane, time: number): void {
    crashes.push({ x: p.x, y: p.y, at: time });
    ctx.sfx('explosion-small');
    for (const f of [player, npc]) {
      if (!alive(f) || dist(f.x, f.y, p.x, p.y) > 62) continue;
      if (f === player) tk.hitPlayer(17, p.x, p.y);
      else { ctx.hit(npc, 30, p.x, p.y); ctx.float(f.x, f.y - 56, 'NOSED IN', '#ffe2a8'); }
    }
    p.downAt = -2;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextLaunch = time + 1800; }
      if (!pairs && npc.hp < npc.maxHp * 0.5) { pairs = true; ctx.banner('THE HANGAR OPENS', '#ffe2a8'); ctx.sfx('engine'); }
      if (time >= nextLaunch && alive(npc) && alive(player)) {
        const live = planes.filter(powered).length;
        if (live < cap()) {
          flip = flip === 1 ? -1 : 1;
          launch(time, flip);
          if (pairs && live + 1 < cap()) launch(time, flip === 1 ? -1 : 1);
        }
        nextLaunch = time + (pairs ? 3000 : 2900);
      }
      for (const p of planes) {
        if (powered(p)) {
          p.power -= dt * 1000;
          // The ring drifts after you, a walking pace and a half slower than you.
          const d = dist(p.cx, p.cy, player.x, player.y);
          if (d > 30) { p.cx += ((player.x - p.cx) / d) * 32 * dt; p.cy += ((player.y - p.cy) / d) * 32 * dt; }
          p.th += p.spin * (SPEED / p.r) * dt;
          p.x = p.cx + Math.cos(p.th) * p.r; p.y = p.cy + Math.sin(p.th) * p.r;
          p.head = p.th + p.spin * Math.PI / 2;
          p.tgt?.moveTo(p.x, p.y);
          // The prop clips whoever it passes through — never its own flier while powered.
          if (alive(player) && dist(player.x, player.y, p.x, p.y) < PLANE_R + 18 && time >= (p.hitCd.get(player) ?? 0)) {
            p.hitCd.set(player, time + 900);
            tk.hitPlayer(8, p.x, p.y);
            ctx.sfx('slash');
          }
          if (p.power <= 0) stall(p, time);
        } else if (p.downAt > 0) {
          if (time >= p.glideAt) {
            p.x += p.gx * GLIDE * dt; p.y += p.gy * GLIDE * dt;
            const out = p.x < 30 || p.x > W - 30 || p.y < top + 10 || p.y > H - 20;
            let met = false;
            for (const f of [player, npc]) if (alive(f) && dist(f.x, f.y, p.x, p.y) < PLANE_R + 16) met = true;
            if (met || out || time >= p.downAt) crash(p, time);
          }
        }
      }
      planes = planes.filter((p) => p.downAt !== -2);
      while (crashes.length && time - crashes[0].at > 700) crashes.shift();
    },

    npcSeek() {
      for (const p of planes) {
        if (powered(p)) continue;
        const ex = p.x + p.gx * GLIDE * 1.2, ey = p.y + p.gy * GLIDE * 1.2;
        if (segDist(npc.x, npc.y, p.x, p.y, ex, ey) > PLANE_R + 50) continue;
        const side = (npc.x - p.x) * -p.gy + (npc.y - p.y) * p.gx >= 0 ? 1 : -1;
        return { x: tk.clampX(npc.x - p.gy * side * 120), y: tk.clampY(npc.y + p.gx * side * 120) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const p of planes) {
        if (powered(p)) {
          // The chalked ring under a powered plane, dashed, with an arrow for its turn.
          const k = clamp(p.power / p.full, 0, 1);
          for (let i = 0; i < 28; i++) {
            const a0 = (i / 28) * Math.PI * 2, a1 = a0 + (Math.PI * 2) / 56;
            g.lineStyle(2, LATEX_LIT, 0.18 + 0.2 * k);
            g.beginPath(); g.arc(p.cx, p.cy, p.r, a0, a1, false); g.strokePath();
          }
          g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x + 10, p.y + 22, 34, 10);
        } else {
          const ex = p.x + p.gx * GLIDE * Math.max(0, (p.downAt - Math.max(time, p.glideAt)) / 1000);
          const ey = p.y + p.gy * GLIDE * Math.max(0, (p.downAt - Math.max(time, p.glideAt)) / 1000);
          const nx = -p.gy, ny = p.gx, w = PLANE_R + 14;
          g.fillStyle(TOY_RED, time < p.glideAt ? 0.12 : 0.2);
          g.fillPoints([{ x: p.x + nx * w, y: p.y + ny * w }, { x: ex + nx * w, y: ey + ny * w }, { x: ex - nx * w, y: ey - ny * w }, { x: p.x - nx * w, y: p.y - ny * w }], true);
          g.lineStyle(2, TOY_RED, 0.6); g.lineBetween(p.x + nx * w, p.y + ny * w, ex + nx * w, ey + ny * w); g.lineBetween(p.x - nx * w, p.y - ny * w, ex - nx * w, ey - ny * w);
          g.lineStyle(3, LATEX_LIT, 0.7); g.strokeCircle(ex, ey, 22); g.lineBetween(ex - 12, ey - 12, ex + 12, ey + 12); g.lineBetween(ex - 12, ey + 12, ex + 12, ey - 12);
          g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x + 6, p.y + 14, 30, 9);
        }
      }
      for (const c of crashes) {
        const k = (time - c.at) / 700;
        g.fillStyle(CREPE_DARK, 0.5 * (1 - k)); g.fillCircle(c.x, c.y, 62 * (0.5 + k * 0.5));
      }
    },

    drawAir(g, time) {
      for (const p of planes) {
        const lift = powered(p) ? 22 : time < p.glideAt ? 20 - ((time - p.stallAt) / STALL_MS) * 4 : 16 * clamp((p.downAt - time) / GLIDE_MS, 0, 1);
        const pitch = powered(p) ? 0 : 0.35;
        drawPlane(g, p.x, p.y - lift, p.head, powered(p) ? p.power / p.full : 0, powered(p), pitch, time, p.seed);
      }
      for (const c of crashes) {
        const k = (time - c.at) / 700;
        for (let i = 0; i < 9; i++) {
          const a = i * 0.7 + c.x, r = 10 + k * 60;
          g.fillStyle(i % 2 ? LATEX : CREPE, 1 - k);
          g.fillRect(c.x + Math.cos(a) * r, c.y - 10 + Math.sin(a) * r * 0.6 - k * 20, 6, 3);
        }
        glow(g, c.x, c.y, 50, HOT_LIT, 0.06 * (1 - k), 2);
      }
    },

    drawHud(g, time) {
      // The winding stick: the next plane on the hand-drill, its motor knotting as it is wound.
      const x = W / 2 - 70, y = top + 16;
      const k = clamp(1 - (nextLaunch - time) / 2900, 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 10, y - 12, 160, 26, 5);
      g.lineStyle(3, BARK_LIT, 1); g.lineBetween(x, y, x + 110, y);
      const knots = Math.floor(4 + k * 14);
      for (let i = 0; i < knots; i++) {
        const u = x + 6 + (i * 100) / 18;
        g.fillStyle(i % 2 ? CREPE : CREPE_DARK, 1); g.fillEllipse(u, y + 6, 6, 4 + k * 2);
      }
      const a = time / (k > 0.2 ? 30 : 400);
      g.fillStyle(IRON, 1); g.fillRect(x + 112, y - 3, 14, 6);
      g.lineStyle(2, IRON, 1); g.lineBetween(x + 126, y, x + 126 + Math.cos(a) * 9, y + Math.sin(a) * 9);
      g.fillStyle(TOY_RED, 1); g.fillCircle(x + 126 + Math.cos(a) * 9, y + Math.sin(a) * 9, 3);
      // A pip per plane aloft.
      planes.forEach((p, i) => {
        g.fillStyle(powered(p) ? TOY_YELLOW : TOY_RED, 1);
        g.fillTriangle(x + 150 + i * 14, y - 4, x + 150 + i * 14, y + 4, x + 160 + i * 14, y);
      });
    },

    destroy() { for (const p of planes) p.tgt?.remove(); },
  };
}

/**
 * A rubber-powered model: a balsa stick, tissue wings ribbed and doped, tailplane and fin, a
 * two-bladed prop (a blur while it turns), and the braided rubber motor slung under the stick.
 */
function drawPlane(g: G, x: number, y: number, a: number, wind: number, on: boolean, pitch: number, time: number, seed: number): void {
  const ux = Math.cos(a), uy = Math.sin(a) * 0.8, nx = -Math.sin(a), ny = Math.cos(a) * 0.8;
  const P = (u: number, n: number) => ({ x: x + ux * u + nx * n, y: y + uy * u + ny * n + (u > 0 ? pitch * u * 0.4 : 0) });
  // Wings: tissue over balsa ribs, a little dihedral shine.
  const wing = [P(6, -34), P(14, -32), P(14, 32), P(6, 34), P(0, 30), P(0, -30)];
  g.fillStyle(LATEX_LIT, 0.92); g.fillPoints(wing, true);
  g.lineStyle(1, LATEX_DARK, 1); g.strokePoints(wing, true);
  for (let r = -3; r <= 3; r++) { const p0 = P(1, r * 9), p1 = P(13, r * 9); g.lineBetween(p0.x, p0.y, p1.x, p1.y); }
  const tip = seed % 2 > 1 ? TOY_RED : TOY_BLUE;
  for (const s of [-1, 1]) { const t = [P(6, s * 34), P(14, s * 32), P(14, s * 26), P(5, s * 27)]; g.fillStyle(tip, 0.85); g.fillPoints(t, true); }
  // Tail.
  const tail = [P(-34, -13), P(-28, -13), P(-28, 13), P(-34, 13)];
  g.fillStyle(LATEX, 0.95); g.fillPoints(tail, true); g.lineStyle(1, LATEX_DARK, 1); g.strokePoints(tail, true);
  const fin = P(-33, 0);
  g.fillStyle(tip, 1); g.fillTriangle(fin.x, fin.y, fin.x + 5, fin.y - 1, fin.x, fin.y - 12);
  // The stick, and the rubber motor under it: braided while wound, a slack loop when spent.
  const s0 = P(-36, 0), s1 = P(24, 0);
  g.lineStyle(3, BARK_LIT, 1); g.lineBetween(s0.x, s0.y, s1.x, s1.y);
  const knots = Math.round(2 + wind * 9);
  for (let i = 0; i < 12; i++) {
    const u = -30 + i * 4.6;
    const q = P(u, (i % 2 ? 1.5 : -1.5) * (wind > 0 ? 1 : 2.5));
    g.fillStyle(i < knots ? CREPE_DARK : CREPE, 1); g.fillEllipse(q.x, q.y + 3, i < knots ? 4.5 : 3, i < knots ? 4 : 2);
  }
  // Prop.
  const hub = P(26, 0);
  g.fillStyle(IRON, 1); g.fillCircle(hub.x, hub.y, 2.5);
  if (on) {
    g.fillStyle(LATEX_LIT, 0.25); g.fillEllipse(hub.x, hub.y, 8, 26);
    const pa = time / 25;
    g.lineStyle(2, BARK_LIT, 0.6); g.lineBetween(hub.x, hub.y - Math.sin(pa) * 12, hub.x, hub.y + Math.sin(pa) * 12);
  } else {
    g.lineStyle(3, BARK_LIT, 1); g.lineBetween(hub.x - nx * 11, hub.y - ny * 11, hub.x + nx * 11, hub.y + ny * 11);
  }
  if (on && wind < 0.2) glow(g, x, y, 26, lit(TOY_RED, 0.2), 0.05 * Math.abs(Math.sin(time / 90)), 2);
}

export const FALLEN_PLANES: GimmickDef = {
  id: ID,
  rules: 'Rubber-powered planes circle after you; spent, they stall and glide straight on to nose in. Strike one to snap its motor and glide it at her.',
  make,
};
