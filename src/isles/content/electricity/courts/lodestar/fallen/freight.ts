import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BASALT, BASALT_DARK, BASALT_LIT, COPPER, COPPER_DARK, COPPER_LIT, IRON, IRON_DARK, IRON_LIT, MAGNETITE_LIT, SLATE_DEEP, SPARK,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Freight Afloat — Brake-Hand Ilse Thrumbold of the sky-quarry, who in the King's telling sailed
 * cut stone over the Underhill roofs on the field and never once looked down to see whose roof.
 *
 * The quarry floats its blocks on the lodestone's field and steers them on chains. Here a block
 * comes sailing across the yard on a straight course — chalked first, the block hanging at the
 * yard's edge — and bowls over whoever it meets. Nothing stops a floated block but an eddy brake:
 * the four copper plates set in the floor. A block crossing a plate with its brake on is seized dead
 * and sits there a while, a wall to bodies and to shots, until the crew lift it away.
 *
 * The plates brake fighters too: on the copper you wade, and a dash onto it is caught by the
 * eddies and held. Strike a plate to throw its brake off for a few seconds: blocks sail straight
 * through — and a block already seized on it is let go to sail on down its course. Seize one by
 * the foe, then strike its plate. Past half, two blocks sail at once on crossing courses.
 */

const ID = fallenId('lodestar', 'freight');
const PLATE_RX = 62;
const PLATE_RY = 40;
const BLOCK_HALF = 30;
const SPEED = 330;
const BOWL_DMG = 13;
const WARN_MS = 1350;
const SEAT_MS = 3800;
const BRAKE_OFF_MS = 4200;

interface Plate { x: number; y: number; offUntil: number; t: StrikeTarget | null; spin: number }
interface Block {
  /** Course: start point and unit direction. */
  sx: number; sy: number; dx: number; dy: number;
  x: number; y: number;
  warnAt: number; sailAt: number;
  /** Seized on a plate (index), or -1 while sailing. */
  seat: number; seatedAt: number;
  /** Plates already sailed through (a released block does not re-seize on its own plate). */
  passed: Set<number>;
  struck: Set<Fighter>;
  done: boolean;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const ym = (top + H) / 2;
  const plates: Plate[] = [
    { x: W * 0.28, y: top + (H - top) * 0.3 }, { x: W * 0.72, y: top + (H - top) * 0.3 },
    { x: W * 0.28, y: top + (H - top) * 0.74 }, { x: W * 0.72, y: top + (H - top) * 0.74 },
  ].map((p, i) => ({ ...p, offUntil: 0, t: null, spin: i * 1.7 }));
  let blocks: Block[] = [];
  let nextVolley = 0;
  let started = false;
  const caughtUntil = new Map<Fighter, number>();

  const half = () => npc.hp < npc.maxHp * 0.5;
  const braked = (p: Plate, time: number) => time >= p.offUntil;
  const onPlate = (p: Plate, x: number, y: number) => ((x - p.x) / PLATE_RX) ** 2 + ((y - p.y) / PLATE_RY) ** 2 < 1;
  const plateUnder = (f: Fighter) => plates.findIndex((p) => onPlate(p, f.x, f.y));
  const hurt = (f: Fighter, n: number) => { if (f === player) tk.hitPlayer(n, f.x, f.y); else ctx.hit(f, n, f.x, f.y); };

  /** A course across the yard through `at`, horizontal or vertical, from the far side. */
  function course(time: number, at: Pt, vertical: boolean): Block {
    let sx: number, sy: number, dx = 0, dy = 0;
    if (vertical) { const fromTop = at.y > ym; sx = clamp(at.x, 60, W - 60); sy = fromTop ? top - 40 : H + 40; dy = fromTop ? 1 : -1; }
    else { const fromWest = at.x > W / 2; sy = clamp(at.y, top + 40, H - 40); sx = fromWest ? -40 : W + 40; dx = fromWest ? 1 : -1; }
    const warn = tk.warn(WARN_MS);
    return { sx, sy, dx, dy, x: sx, y: sy, warnAt: time, sailAt: time + warn, seat: -1, seatedAt: 0, passed: new Set(), struck: new Set(), done: false };
  }

  function volley(time: number): void {
    const aim: Pt = rng() < 0.75 ? { x: player.x, y: player.y } : { x: 120 + rng() * (W - 240), y: top + 60 + rng() * (H - top - 120) };
    const vertical = rng() < 0.5;
    blocks.push(course(time, aim, vertical));
    if (half()) blocks.push(course(time + 250, { x: npc.x * 0.3 + player.x * 0.7, y: npc.y * 0.3 + player.y * 0.7 }, !vertical));
    ctx.sfx('chain');
  }

  function strikePlate(i: number, time: number): void {
    const p = plates[i];
    p.offUntil = time + BRAKE_OFF_MS;
    ctx.sfx('clang');
    ctx.flash(p.x, p.y, COPPER_LIT);
    for (const b of blocks) {
      if (b.seat !== i) continue;
      b.seat = -1;
      b.passed.add(i);
      b.struck.clear();
      ctx.banner('THE BRAKE LETS GO — THE BLOCK SAILS ON', '#f2b07a');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextVolley = time + 1800;
        plates.forEach((p, i) => { p.t = ctx.target({ x: p.x, y: p.y, r: 40, passThrough: true, onStruck: () => strikePlate(i, ctx.scene.time.now) }); });
      }
      if (time >= nextVolley) { nextVolley = time + (half() ? 4300 : 5200); volley(time); }
      for (const p of plates) p.spin += dt * (braked(p, time) ? 1.6 : 0.2);

      for (const b of blocks) {
        if (b.done || time < b.sailAt) continue;
        if (b.seat >= 0) {
          if (time > b.seatedAt + SEAT_MS) b.done = true;
          continue;
        }
        b.x += b.dx * SPEED * dt;
        b.y += b.dy * SPEED * dt;
        if (b.x < -80 || b.x > W + 80 || b.y < top - 80 || b.y > H + 80) { b.done = true; continue; }
        // An eddy brake seizes the block on the plate's near half.
        for (let i = 0; i < plates.length; i++) {
          const p = plates[i];
          if (b.passed.has(i) || !braked(p, time)) continue;
          if (onPlate(p, b.x, b.y)) { b.seat = i; b.seatedAt = time; b.x = p.x; b.y = p.y; ctx.sfx('anvil'); ctx.flash(p.x, p.y, SPARK); break; }
        }
        if (b.seat >= 0) continue;
        for (let i = 0; i < plates.length; i++) if (onPlate(plates[i], b.x, b.y)) b.passed.add(i);
        for (const f of [player, npc]) {
          if (!alive(f) || b.struck.has(f)) continue;
          if (Math.abs(f.x - b.x) < BLOCK_HALF + 18 && Math.abs(f.y - b.y) < BLOCK_HALF + 18) {
            b.struck.add(f);
            hurt(f, BOWL_DMG);
            // Bowled aside, off the course.
            const side = (f.x - b.x) * -b.dy + (f.y - b.y) * b.dx >= 0 ? 1 : -1;
            ctx.nudge(f, -b.dy * side * 70 + b.dx * 30, b.dx * side * 70 + b.dy * 30);
            ctx.sfx('stone-slam');
          }
        }
      }
      // A seized block is a wall: bodies kept out, shots stopped on its face.
      for (const b of blocks) {
        if (b.done || b.seat < 0) continue;
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const ddx = f.x - b.x, ddy = f.y - b.y, d = Math.hypot(ddx, ddy);
          if (d < BLOCK_HALF + 20 && d > 0) ctx.nudge(f, (ddx / d) * (BLOCK_HALF + 20 - d), (ddy / d) * (BLOCK_HALF + 20 - d));
        }
        for (const s of ctx.shotsNear(b.x, b.y, BLOCK_HALF + 6)) s.block();
      }
      blocks = blocks.filter((b) => !b.done);

      // The eddies catch a dash onto braked copper.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const i = plateUnder(f);
        if (i < 0 || !braked(plates[i], time) || !ctx.dashing(f) || time < (caughtUntil.get(f) ?? 0)) continue;
        caughtUntil.set(f, time + 1600);
        ctx.root(f, 750);
        ctx.float(f.x, f.y - 46, 'EDDY-CAUGHT', '#f2b07a');
        ctx.sfx('magnet-pull');
      }
    },

    playerSpeedMult: () => { const i = alive(player) ? plateUnder(player) : -1; return i >= 0 && braked(plates[i], ctx.scene.time.now) ? 0.6 : 1; },
    npcSpeedMult: () => { const i = alive(npc) ? plateUnder(npc) : -1; return i >= 0 && braked(plates[i], ctx.scene.time.now) ? 0.6 : 1; },

    npcSeek() {
      if (!alive(npc)) return null;
      const time = ctx.scene.time.now;
      // Off any chalked or sailing course, preferably in the lee of a braked plate.
      const threat = blocks.find((b) => b.seat < 0 && Math.abs((npc.x - b.sx) * -b.dy + (npc.y - b.sy) * b.dx) < BLOCK_HALF + 40);
      if (threat) {
        const side = (npc.x - threat.sx) * -threat.dy + (npc.y - threat.sy) * threat.dx >= 0 ? 1 : -1;
        return { x: clamp(npc.x - threat.dy * side * 120, 60, W - 60), y: clamp(npc.y + threat.dx * side * 120, top + 50, H - 50) };
      }
      // A seized block on a plate by you: walk to its plate to throw the brake.
      for (const b of blocks) {
        if (b.seat < 0) continue;
        const ahead = (player.x - b.x) * b.dx + (player.y - b.y) * b.dy;
        const off = Math.abs((player.x - b.x) * -b.dy + (player.y - b.y) * b.dx);
        if (ahead > 0 && off < BLOCK_HALF + 30 && time < b.seatedAt + SEAT_MS - 800) {
          const p = plates[b.seat];
          return { x: clamp(p.x - b.dx * 120 - b.dy * 60, 60, W - 60), y: clamp(p.y - b.dy * 100 + b.dx * 60, top + 50, H - 50) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      plates.forEach((p, i) => drawPlate(g, p, braked(p, time), time, i));
      // Chalked courses: a dashed band with chevrons, brightening to the sail.
      for (const b of blocks) {
        if (b.seat >= 0) { shadow(g, b.x, b.y + 6, 70, 22, 0.4); continue; }
        const k = clamp((time - b.warnAt) / Math.max(1, b.sailAt - b.warnAt), 0, 1);
        const len = Math.max(W, H) + 200;
        const ex = b.sx + b.dx * len, ey = b.sy + b.dy * len;
        g.lineStyle((BLOCK_HALF + 18) * 2, 0xf0e8d8, time < b.sailAt ? 0.05 + k * 0.1 : 0.05);
        g.lineBetween(b.sx, b.sy, ex, ey);
        for (const s of [-1, 1]) {
          const ox = -b.dy * s * (BLOCK_HALF + 18), oy = b.dx * s * (BLOCK_HALF + 18);
          for (let d = 0; d < len; d += 34) {
            g.lineStyle(2, 0xf0e8d8, 0.35 + k * 0.4);
            g.lineBetween(b.sx + ox + b.dx * d, b.sy + oy + b.dy * d, b.sx + ox + b.dx * (d + 18), b.sy + oy + b.dy * (d + 18));
          }
        }
        for (let d = 60; d < len; d += 110) {
          const cx = b.sx + b.dx * d, cy = b.sy + b.dy * d;
          g.lineStyle(3, 0xf0e8d8, 0.25 + k * 0.45);
          g.lineBetween(cx - b.dx * 10 - b.dy * 12, cy - b.dy * 10 + b.dx * 12, cx, cy);
          g.lineBetween(cx - b.dx * 10 + b.dy * 12, cy - b.dy * 10 - b.dx * 12, cx, cy);
        }
        if (time >= b.sailAt) shadow(g, b.x, b.y + 30, 64, 18, 0.35);
      }
    },

    drawAir(g, time) {
      for (const b of blocks) {
        // Hanging at the edge while the course is chalked, then sailing; seized ones sit low.
        let x = b.x, y = b.y;
        if (time < b.sailAt) { x = clamp(b.sx + b.dx * 50, 30, W - 30); y = clamp(b.sy + b.dy * 50, top + 20, H - 20); }
        const bob = b.seat >= 0 ? 0 : Math.sin(time / 180) * 3;
        const lift = b.seat >= 0 ? clamp((time - b.seatedAt - SEAT_MS + 600) / 600, 0, 1) * 60 : 0;
        drawBlock(g, x, y - 18 + bob - lift, time, b.seat < 0, 1 - lift / 80);
      }
      // Filings of the eddies swirling round a fighter caught on copper.
      for (const f of [player, npc]) {
        if (!alive(f) || time > (caughtUntil.get(f) ?? 0) - 850) continue;
        for (let i = 0; i < 8; i++) {
          const a = time / 120 + (i / 8) * Math.PI * 2;
          g.lineStyle(2, COPPER_LIT, 0.8);
          g.beginPath(); g.arc(f.x, f.y + 10, 22 + (i % 2) * 6, a, a + 0.7); g.strokePath();
        }
      }
    },

    drawHud(g, time) {
      // Four little brake levers, one per plate: up = brake on, down (and a draining bar) = off.
      const x0 = W / 2 - 66;
      plates.forEach((p, i) => {
        const x = x0 + i * 44, y = H - 22;
        g.fillStyle(SLATE_DEEP, 0.85); g.fillRoundedRect(x - 16, y - 20, 32, 30, 4);
        g.fillStyle(COPPER_DARK, 1); g.fillEllipse(x, y + 4, 22, 9);
        const on = braked(p, time);
        g.lineStyle(3, on ? COPPER_LIT : IRON_LIT, 1);
        g.lineBetween(x, y + 2, x + (on ? 0 : 9), y + (on ? -14 : -6));
        g.fillStyle(on ? COPPER_LIT : 0x8a8e98, 1); g.fillCircle(x + (on ? 0 : 9), y + (on ? -14 : -6), 3);
        if (!on) { g.fillStyle(SPARK, 0.8); g.fillRect(x - 12, y + 9, 24 * clamp((p.offUntil - time) / BRAKE_OFF_MS, 0, 1), 2); }
      });
    },

    destroy() { for (const p of plates) p.t?.remove(); },
  };
}

/** A copper eddy-brake plate: bolted rim, whorls of current turning in it while the brake is on. */
function drawPlate(g: G, p: Plate, on: boolean, time: number, i: number): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(p.x + 3, p.y + 6, PLATE_RX * 2 + 10, PLATE_RY * 2 + 8);
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(p.x, p.y + 2, PLATE_RX * 2 + 8, PLATE_RY * 2 + 6);
  g.fillStyle(on ? COPPER_DARK : dim(COPPER_DARK, 0.3), 1); g.fillEllipse(p.x, p.y, PLATE_RX * 2, PLATE_RY * 2);
  g.fillStyle(on ? COPPER : dim(COPPER, 0.4), 1); g.fillEllipse(p.x, p.y - 2, PLATE_RX * 2 - 10, PLATE_RY * 2 - 8);
  g.fillStyle(on ? COPPER_LIT : dim(COPPER_LIT, 0.5), 0.35); g.fillEllipse(p.x - 18, p.y - 12, 40, 10);
  // Lathe rings in the copper.
  for (let r = 0.3; r < 1; r += 0.18) {
    g.lineStyle(1, on ? COPPER_DARK : IRON_DARK, 0.5);
    g.strokeEllipse(p.x, p.y - 2, (PLATE_RX * 2 - 10) * r, (PLATE_RY * 2 - 8) * r);
  }
  // Rim bolts.
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const bx = p.x + Math.cos(a) * (PLATE_RX - 1), by = p.y + 1 + Math.sin(a) * (PLATE_RY - 1);
    g.fillStyle(IRON_LIT, 1); g.fillCircle(bx, by, 2.4);
    g.fillStyle(IRON_DARK, 1); g.fillCircle(bx + 0.6, by + 0.6, 1);
  }
  // Eddies: two counter-turning whorls of current, drawn as bright spiral arcs.
  if (on) {
    for (const [cx, dir] of [[p.x - 22, 1], [p.x + 22, -1]] as [number, number][]) {
      for (let k = 0; k < 3; k++) {
        const a = p.spin * dir * 3 + k * 2.1 + i;
        g.lineStyle(1.6, COPPER_LIT, 0.7 - k * 0.15);
        g.beginPath(); g.arc(cx, p.y - 2, 8 + k * 6, a, a + 1.5); g.strokePath();
      }
    }
    glow(g, p.x, p.y - 2, 40, COPPER_LIT, 0.04, 3);
  } else {
    // Brake off: the copper goes dull and a white chalk cross is struck on it.
    g.lineStyle(3, 0xf0e8d8, 0.55);
    g.lineBetween(p.x - 20, p.y - 14, p.x + 20, p.y + 10); g.lineBetween(p.x + 20, p.y - 14, p.x - 20, p.y + 10);
  }
  // The brake lever beside it.
  g.fillStyle(IRON_DARK, 1); g.fillRect(p.x + PLATE_RX - 4, p.y - 6, 10, 10);
  g.lineStyle(3, IRON_LIT, 1); g.lineBetween(p.x + PLATE_RX + 1, p.y - 2, p.x + PLATE_RX + (on ? 1 : 14), p.y - (on ? 22 : 12));
  g.fillStyle(on ? 0xe0383a : 0x8a8e98, 1); g.fillCircle(p.x + PLATE_RX + (on ? 1 : 14), p.y - (on ? 22 : 12), 3.5);
}

/** A floated block of cut basalt: chisel-dressed faces, an iron lifting-dog, chains up into the sky. */
function drawBlock(g: G, x: number, y: number, time: number, sailing: boolean, alpha: number): void {
  const a = clamp(alpha, 0, 1);
  // The chains, rising out of the top of the screen to the crew's winch.
  g.lineStyle(2, IRON_LIT, 0.7 * a);
  for (const s of [-1, 1]) {
    const cx = x + s * 14;
    for (let yy = y - 34; yy > y - 140; yy -= 8) { g.strokeEllipse(cx + Math.sin(yy * 0.2) * 1.5, yy, 4, 7); }
  }
  // The field shimmer that floats it.
  for (let k = 0; k < 3; k++) {
    const r = 22 + ((time / 12 + k * 14) % 40);
    g.lineStyle(1.2, MAGNETITE_LIT, (0.5 - r / 100) * a);
    g.strokeEllipse(x, y + 34, r * 1.8, r * 0.5);
  }
  // Body: top face, front face, side face.
  g.fillStyle(BASALT_DARK, a); g.fillRect(x - BLOCK_HALF, y - 8, BLOCK_HALF * 2, 34);
  g.fillStyle(BASALT, a); g.fillRect(x - BLOCK_HALF, y - 8, BLOCK_HALF * 2 - 8, 34);
  g.fillStyle(BASALT_LIT, a);
  g.beginPath(); g.moveTo(x - BLOCK_HALF, y - 8); g.lineTo(x - BLOCK_HALF + 8, y - 22); g.lineTo(x + BLOCK_HALF, y - 22); g.lineTo(x + BLOCK_HALF - 8, y - 8); g.closePath(); g.fillPath();
  g.fillStyle(dim(BASALT, 0.25), a);
  g.beginPath(); g.moveTo(x + BLOCK_HALF - 8, y - 8); g.lineTo(x + BLOCK_HALF, y - 22); g.lineTo(x + BLOCK_HALF, y + 12); g.lineTo(x + BLOCK_HALF - 8, y + 26); g.closePath(); g.fillPath();
  // Chisel dressing on the front face.
  for (let k = 0; k < 7; k++) {
    g.lineStyle(1, lit(BASALT, 0.2), 0.6 * a);
    g.lineBetween(x - BLOCK_HALF + 5 + k * 7, y - 4, x - BLOCK_HALF + 2 + k * 7, y + 22);
  }
  // The quarry's mark and the lifting-dog stapled into the top.
  g.lineStyle(1.5, 0xf0e8d8, 0.6 * a); g.strokeCircle(x - 6, y + 9, 6); g.lineBetween(x - 6, y + 3, x - 6, y + 15);
  g.lineStyle(3, IRON, a); g.beginPath(); g.arc(x + 4, y - 15, 9, Math.PI, 0); g.strokePath();
  g.lineStyle(1.2, IRON_LIT, a); g.beginPath(); g.arc(x + 4, y - 16, 9, Math.PI, Math.PI * 1.5); g.strokePath();
  if (sailing) { g.fillStyle(SPARK, 0.6 * a); g.fillCircle(x - BLOCK_HALF + 2, y + 25, 1.6); g.fillCircle(x + BLOCK_HALF - 4, y + 25, 1.6); }
}

export const FALLEN_FREIGHT: GimmickDef = {
  id: ID,
  rules: 'Floated blocks sail chalked courses and bowl you over; a braked copper plate seizes one dead. Strike a plate to free its brake and the block sails on.',
  make,
};
