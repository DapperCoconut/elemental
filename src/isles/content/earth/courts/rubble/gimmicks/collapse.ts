import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { ashlar, crack } from '../art';
import { BLAST, DUST, DUST_DARK, FUSE, IRON, LIME, LIME_DARK, LIME_DEEP, LIME_LIT, SCREE, SCREE_DARK, SEAL } from '../palette';
import { alive, clamp, dist, segDist, shoveOut, stepDt } from '../util';

/**
 * Collapse — Demolisher Krell.
 *
 * The yard is the undercroft of the old Corn Exchange, its cracked ceiling held up on six
 * pillars — three on the west side, three on the east. Every blow struck on a pillar — a shot,
 * a swing, a blast — rings through the stone and cracks it. A pillar with three cracks
 * groans, leans (the fall line flares red on the floor) and topples along its length, crushing
 * whoever lies under it; its drums lie there a while as rubble you wade through.
 *
 * Krell is a demolisher and cannot leave a pillar alone: every few seconds he packs a charge
 * against the one whose fall line runs nearest you and lights it (two cracks in one go). And if
 * a side is left with only one pillar standing, the ceiling over that whole side comes in.
 *
 * Every pillar's fall line shows on the floor once it is cracked. Fight him in a cracked
 * pillar's shadow and let his own charges bring it down on him; strip a side bare while he is
 * on it and bury him under the roof.
 */

const PILLAR_R = 22;
const FALL_LEN = 290;
const FALL_HALF = 28;
const GROAN_MS = 1100;
const FALL_DMG = 16;
const RUBBLE_MS = 9000;
/** A pillar's strike body: the foot of the shaft. */
const BODY_R = 28;
const BODY_UP = 30;
const CAVE_WARN = 1700;
const CAVE_DMG = 22;

interface Pillar {
  x: number; y: number;
  /** The way it will fall, fixed when the yard is laid out — read it off the floor. */
  ang: number;
  side: 0 | 1;
  cracks: number;
  lastCrack: number;
  groanAt: number;
  fellAt: number;
  standing: boolean;
  /** A lit charge on it (Krell's), or -1. */
  chargeAt: number;
  seed: number;
  /** Its strike body while it stands. */
  body: StrikeTarget | null;
}

interface Block { x: number; y: number; w: number; h: number }
interface CaveIn { side: 0 | 1; warnAt: number; fallAt: number; dealt: boolean; blocks: Block[]; shoreAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const midY = (top + H) / 2;
  const layout: [number, number, 0 | 1][] = [
    [190, top + 120, 0], [190, H - 110, 0], [370, midY, 0],
    [W - 190, top + 120, 1], [W - 190, H - 110, 1], [W - 370, midY, 1],
  ];
  const pillars: Pillar[] = layout.map(([x, y, side]) => {
    // Lean in toward the middle of the yard, give or take.
    const toward = Math.atan2(midY - y, W / 2 - x);
    return { x, y, ang: toward + (rng() - 0.5) * 1.1, side, cracks: 0, lastCrack: -9999, groanAt: -1, fellAt: -1, standing: true, chargeAt: -1, seed: rng() * 10, body: null };
  });
  /** Stand a pillar's strike body up (on laying out the yard, and when it is shored back up). */
  const raise = (p: Pillar) => {
    p.body?.remove();
    p.body = ctx.target({ x: p.x, y: p.y - BODY_UP, r: BODY_R, onStruck: () => addCrack(p, ctx.scene.time.now) });
  };
  pillars.forEach(raise);
  const caves: CaveIn[] = [];
  const chargeEvery = ctx.hard ? 6000 : 7600;
  const FUSE_MS = 2200;
  let nextCharge = 0;
  let started = false;

  const fallEnd = (p: Pillar) => ({ x: p.x + Math.cos(p.ang) * FALL_LEN, y: p.y + Math.sin(p.ang) * FALL_LEN });
  const inFall = (p: Pillar, f: Fighter) => { const e = fallEnd(p); return segDist(f.x, f.y, p.x, p.y, e.x, e.y) < FALL_HALF + 18; };
  const onRubble = (f: Fighter, time: number) => pillars.some((p) => !p.standing && p.fellAt > 0 && time - p.fellAt < RUBBLE_MS && inFall(p, f));
  const standingOn = (side: 0 | 1) => pillars.filter((p) => p.side === side && p.standing).length;
  const sideOf = (x: number): 0 | 1 => (x < W / 2 ? 0 : 1);

  function addCrack(p: Pillar, time: number, n = 1): void {
    if (!p.standing || p.groanAt > 0) return;
    if (n === 1 && time - p.lastCrack < 650) return;
    p.lastCrack = time;
    p.cracks = Math.min(3, p.cracks + n);
    ctx.sfx(p.cracks >= 3 ? 'stone-slam' : 'hit-medium');
    if (p.cracks >= 3) {
      p.groanAt = time;
      ctx.float(p.x, p.y - 100, 'IT\'S GOING', '#ffd0a0');
      ctx.sfx('quake');
    }
  }

  function topple(p: Pillar, time: number): void {
    p.standing = false;
    p.body?.remove();
    p.body = null;
    p.fellAt = time;
    p.groanAt = -1;
    ctx.sfx('explosion-medium');
    for (const f of [player, npc]) {
      if (!alive(f) || !inFall(p, f)) continue;
      ctx.hit(f, ctx.hard ? FALL_DMG + 4 : FALL_DMG, f.x, f.y);
      ctx.stun(f, 500);
      ctx.float(f.x, f.y - 40, 'CRUSHED', '#ffb080');
    }
    const e = fallEnd(p);
    for (let i = 0; i < 4; i++) ctx.flash(p.x + (e.x - p.x) * (i / 3), p.y + (e.y - p.y) * (i / 3), LIME_LIT);
    // A side left on one pillar brings the roof in.
    if (standingOn(p.side) <= 1 && !caves.some((c) => c.side === p.side)) startCave(p.side, time);
  }

  function startCave(side: 0 | 1, time: number): void {
    const x0 = side === 0 ? 0 : W / 2;
    const blocks: Block[] = [];
    const cw = W / 2 / 3, ch = (H - top) / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (rng() < 0.18) continue; // a gap in the fall
        const w = cw * (0.62 + rng() * 0.2), h = ch * (0.6 + rng() * 0.2);
        blocks.push({ x: x0 + c * cw + (cw - w) * rng(), y: top + r * ch + (ch - h) * rng(), w, h });
      }
    }
    caves.push({ side, warnAt: time, fallAt: time + CAVE_WARN, dealt: false, blocks, shoreAt: time + CAVE_WARN + 5500 });
    ctx.banner(side === 0 ? 'THE WEST ROOF IS COMING IN' : 'THE EAST ROOF IS COMING IN', '#ffcf9a');
    ctx.sfx('quake');
  }

  const underBlock = (c: CaveIn, f: Fighter) => c.blocks.some((b) => f.x > b.x - 10 && f.x < b.x + b.w + 10 && f.y > b.y - 10 && f.y < b.y + b.h + 10);

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextCharge = time + 3500; }
      // The pillars are stone: nobody walks through one.
      for (const p of pillars) {
        if (!p.standing) continue;
        for (const f of [player, npc]) if (alive(f)) shoveOut(f, p, PILLAR_R + 16, (ff, dx, dy) => ctx.nudge(ff, dx, dy));
      }
      // Krell's charge: on the standing pillar whose fall line runs nearest you.
      if (time >= nextCharge && alive(npc)) {
        nextCharge = time + chargeEvery;
        let best: Pillar | null = null, bd = Infinity;
        for (const p of pillars) {
          if (!p.standing || p.chargeAt > 0 || p.groanAt > 0) continue;
          const e = fallEnd(p);
          const d = segDist(player.x, player.y, p.x, p.y, e.x, e.y) - p.cracks * 30;
          if (d < bd) { bd = d; best = p; }
        }
        if (best) {
          best.chargeAt = time;
          ctx.banner('KRELL LIGHTS A CHARGE', '#ffb040');
          ctx.sfx('grenade-throw');
        }
      }
      for (const p of pillars) {
        if (p.chargeAt > 0 && time - p.chargeAt >= FUSE_MS) {
          p.chargeAt = -1;
          if (p.standing) {
            tk.explode(p.x, p.y, 70, 10, BLAST);
            if (alive(npc) && dist(npc.x, npc.y, p.x, p.y) < 70) ctx.hit(npc, 10, npc.x, npc.y);
            p.lastCrack = -9999;
            addCrack(p, time, 2);
          }
        }
        if (p.standing && p.groanAt > 0 && time - p.groanAt >= GROAN_MS) topple(p, time);
      }
      // The cave-ins.
      for (let i = caves.length - 1; i >= 0; i--) {
        const c = caves[i];
        if (!c.dealt && time >= c.fallAt) {
          c.dealt = true;
          ctx.sfx('explosion-large');
          for (const f of [player, npc]) {
            if (!alive(f) || !underBlock(c, f)) continue;
            ctx.hit(f, CAVE_DMG, f.x, f.y);
            ctx.stun(f, 650);
            ctx.float(f.x, f.y - 40, 'BURIED', '#ffcf9a');
          }
          for (const b of c.blocks) ctx.flash(b.x + b.w / 2, b.y + b.h / 2, LIME);
        }
        if (time >= c.shoreAt) {
          // Krell's crew shore the side back up: new pillars, sound.
          for (const p of pillars) if (p.side === c.side) { if (!p.standing) raise(p); p.standing = true; p.cracks = 0; p.groanAt = -1; p.fellAt = -1; p.chargeAt = -1; }
          ctx.float(c.side === 0 ? W / 4 : (W * 3) / 4, top + 40, 'SHORED UP', '#e6d2a8');
          ctx.sfx('stone-rise');
          caves.splice(i, 1);
        }
      }
      void dt;
    },

    destroy() { for (const p of pillars) p.body?.remove(); },

    playerSpeedMult() { return onRubble(player, ctx.scene.time.now) ? 0.7 : 1; },
    npcSpeedMult() { return onRubble(npc, ctx.scene.time.now) ? 0.7 : 1; },

    npcSeek() {
      const time = ctx.scene.time.now;
      // Never stand in a fall line that is about to go, or on a side about to cave.
      const danger = (x: number, y: number) => {
        let d = 0;
        for (const p of pillars) {
          if (!p.standing || p.cracks < 2) continue;
          const e = fallEnd(p);
          if (segDist(x, y, p.x, p.y, e.x, e.y) < FALL_HALF + 40) d += p.groanAt > 0 ? 3 : 1;
        }
        for (const c of caves) if (!c.dealt && sideOf(x) === c.side) d += 4;
        return d;
      };
      // Otherwise: keep you between him and a pillar he is about to blow, at fighting range.
      let x = player.x + (player.x < W / 2 ? 230 : -230), y = player.y + Math.sin(time / 1700) * 120;
      if (standingOn(sideOf(player.x)) === 2) x = player.x < W / 2 ? W - 160 : 160; // let the roof take you
      let best = { x, y }, bs = danger(x, y);
      for (let i = 0; i < 8 && bs > 0; i++) {
        const a = (i / 8) * Math.PI * 2;
        const cx = clamp(player.x + Math.cos(a) * 240, 60, W - 60), cy = clamp(player.y + Math.sin(a) * 200, top + 50, H - 40);
        const s = danger(cx, cy);
        if (s < bs) { bs = s; best = { x: cx, y: cy }; }
      }
      return { x: clamp(best.x, 60, W - 60), y: clamp(best.y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The undercroft floor's dust, settling under each pillar.
      for (const p of pillars) {
        if (p.standing) {
          g.fillStyle(DUST_DARK, 0.35); g.fillEllipse(p.x, p.y + 4, 64, 20);
          if (p.cracks >= 1) {
            // The fall line, chalked faint by the first crack, plain by the second, red when it goes.
            const e = fallEnd(p);
            const groan = p.groanAt > 0 ? clamp((time - p.groanAt) / GROAN_MS, 0, 1) : 0;
            const a = groan > 0 ? 0.25 + groan * 0.45 + Math.sin(time / 60) * 0.08 : p.cracks >= 2 ? 0.2 : 0.08;
            const c = groan > 0 ? 0xd04a2a : p.cracks >= 2 ? 0xffd0a0 : DUST;
            const nx = -Math.sin(p.ang) * FALL_HALF, ny = Math.cos(p.ang) * FALL_HALF;
            g.fillStyle(c, a);
            g.fillTriangle(p.x + nx, p.y + ny, p.x - nx, p.y - ny, e.x + nx, e.y + ny);
            g.fillTriangle(p.x - nx, p.y - ny, e.x - nx, e.y - ny, e.x + nx, e.y + ny);
            g.lineStyle(1.5, c, a + 0.2);
            for (let k = 0.15; k < 1; k += 0.17) g.lineBetween(p.x + (e.x - p.x) * k + nx * 0.6, p.y + (e.y - p.y) * k + ny * 0.6, p.x + (e.x - p.x) * (k + 0.08) + nx * 0.6, p.y + (e.y - p.y) * (k + 0.08) + ny * 0.6);
          }
        } else if (p.fellAt > 0 && time - p.fellAt < RUBBLE_MS) {
          // The fallen drums lying along the line.
          const fade = clamp((RUBBLE_MS - (time - p.fellAt)) / 800, 0, 1);
          const e = fallEnd(p);
          g.fillStyle(DUST_DARK, 0.4 * fade); g.fillCircle(p.x, p.y, 30);
          for (let k = 0; k < 6; k++) {
            const t = (k + 0.5) / 6;
            const x = p.x + (e.x - p.x) * t + Math.sin(p.seed + k) * 5, y = p.y + (e.y - p.y) * t + Math.cos(p.seed + k) * 4;
            g.fillStyle(LIME_DEEP, 0.9 * fade); g.fillEllipse(x, y + 4, 46, 30);
            g.fillStyle(k % 2 ? LIME : LIME_DARK, fade); g.fillEllipse(x, y, 42, 26);
            g.lineStyle(1, LIME_DEEP, 0.6 * fade); g.strokeEllipse(x, y, 26, 16);
          }
        }
      }
      // The cave-in: block shadows growing over the side as the roof sags.
      for (const c of caves) {
        if (c.dealt) {
          const k = clamp((time - c.fallAt) / 600, 0, 1);
          for (const b of c.blocks) {
            g.fillStyle(SCREE_DARK, 0.85); g.fillRect(b.x, b.y, b.w, b.h);
            g.fillStyle(SCREE, 0.9); g.fillRect(b.x + 3, b.y + 3, b.w - 6, b.h - 10);
            crack(g, b.x + b.w * 0.3, b.y + 6, b.h * 0.7, 1.4, SCREE_DARK, 0.8);
            g.fillStyle(DUST, 0.5 * (1 - k)); g.fillRect(b.x - 20, b.y - 20, b.w + 40, b.h + 40);
          }
          continue;
        }
        const k = clamp((time - c.warnAt) / CAVE_WARN, 0, 1);
        for (const b of c.blocks) {
          g.fillStyle(0x000000, 0.12 + k * 0.3); g.fillRect(b.x + (1 - k) * b.w * 0.2, b.y + (1 - k) * b.h * 0.2, b.w * (0.6 + k * 0.4), b.h * (0.6 + k * 0.4));
          g.lineStyle(2, 0xffcf9a, 0.3 + k * 0.5); g.strokeRect(b.x, b.y, b.w, b.h);
        }
      }
    },

    drawAir(g, time) {
      for (const p of pillars) {
        if (!p.standing) continue;
        drawPillar(g, p, time);
      }
      // Dust trickling from the ceiling over a side that is going.
      for (const c of caves) {
        if (c.dealt && time - c.fallAt > 900) continue;
        const x0 = c.side === 0 ? 0 : W / 2;
        for (let i = 0; i < 26; i++) {
          const ph = ((time / 700) + i * 0.173) % 1;
          const x = x0 + ((i * 97) % (W / 2)), y = top + ph * (H - top);
          g.fillStyle(DUST, 0.5 * (1 - ph)); g.fillRect(x, y, 2, 6);
        }
        if (c.dealt) {
          const k = clamp((time - c.fallAt) / 900, 0, 1);
          for (const b of c.blocks) { g.fillStyle(DUST, 0.45 * (1 - k)); g.fillCircle(b.x + b.w / 2, b.y + b.h / 2 - k * 30, b.w * 0.5 + k * 40); }
        }
      }
    },

    drawHud(g) {
      // Two little roof gauges: how many pillars each side still stands on.
      for (const side of [0, 1] as (0 | 1)[]) {
        const n = standingOn(side);
        const x0 = side === 0 ? 20 : W - 20 - 3 * 22;
        const y = top + 10;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 4, y - 4, 3 * 22 + 6, 24, 5);
        for (let k = 0; k < 3; k++) {
          const on = k < n;
          g.fillStyle(on ? LIME : 0x3a3430, 1); g.fillRect(x0 + k * 22, y, 16, 16);
          g.fillStyle(on ? LIME_LIT : 0x2a2420, 1); g.fillRect(x0 + k * 22 - 2, y - 2, 20, 3);
        }
        if (n <= 1) { g.lineStyle(2, 0xd04a2a, 1); g.strokeRoundedRect(x0 - 4, y - 4, 3 * 22 + 6, 24, 5); }
      }
    },
  };
}

/** A pillar of the undercroft: square shaft of coursed limestone with a moulded cap, cracks drawn as they come; it leans and shakes while it groans; a lit charge sputters at its foot. */
function drawPillar(g: G, p: Pillar, time: number): void {
  const H = 96;
  const groan = p.groanAt > 0 ? clamp((time - p.groanAt) / GROAN_MS, 0, 1) : 0;
  const shake = groan > 0 ? Math.sin(time / 30) * 2 * groan : 0;
  const lean = groan * 14;
  const lx = Math.cos(p.ang) * lean, ly = Math.sin(p.ang) * lean * 0.4;
  const bx = p.x + shake, by = p.y;
  // Base.
  ashlar(g, bx, by + 4, 48, 10, LIME_DARK, false);
  // The shaft, in courses, skewing toward the lean.
  for (let i = 0; i < 6; i++) {
    const k0 = i / 6, k1 = (i + 1) / 6;
    const x = bx + lx * (k0 + k1) / 2, y0 = by - 6 - H * k0 + ly * k0, y1 = by - 6 - H * k1 + ly * k1;
    g.fillStyle(i % 2 ? LIME : dim(LIME, 0.08), 1); g.fillRect(x - 17, y1, 34, y0 - y1 + 0.5);
    g.fillStyle(LIME_DEEP, 0.6); g.fillRect(x - 17, y0 - 1, 34, 1);
    g.fillStyle(0x000000, 0.16); g.fillRect(x + 7, y1, 10, y0 - y1);
    g.fillStyle(LIME_LIT, 0.4); g.fillRect(x - 15, y1, 3, y0 - y1);
  }
  // The cap, pressed up against the (unseen) ceiling.
  const tx = bx + lx, ty = by - 6 - H + ly;
  g.fillStyle(LIME_DARK, 1); g.fillRect(tx - 24, ty - 12, 48, 12);
  g.fillStyle(LIME_LIT, 1); g.fillRect(tx - 24, ty - 12, 48, 3);
  g.fillStyle(LIME, 1); g.fillRect(tx - 20, ty - 2, 40, 5);
  // Cracks: one per crack taken, each longer.
  for (let c = 0; c < p.cracks; c++) {
    const cy = by - 20 - c * 28;
    crack(g, bx + lx * 0.5 - 12 + c * 8, cy, 22 + c * 10, -0.4 + c * 0.5 + p.seed * 0.1, LIME_DEEP, 0.95, 1.6);
  }
  if (p.cracks >= 2) { g.fillStyle(DUST, 0.5); g.fillTriangle(tx + 10, ty + 4, tx + 18, ty + 4, tx + 14, ty + 22 + Math.sin(time / 90) * 4); }
  // Krell's charge: a bundle of powder sticks taped to the foot, the fuse spitting.
  if (p.chargeAt > 0) {
    const k = clamp((time - p.chargeAt) / 2200, 0, 1);
    g.fillStyle(SEAL, 1); for (let i = 0; i < 3; i++) g.fillRect(bx - 14 + i * 6, by - 22, 5, 16);
    g.fillStyle(IRON, 1); g.fillRect(bx - 15, by - 17, 19, 2); g.fillRect(bx - 15, by - 11, 19, 2);
    const fx = bx + 4 + (1 - k) * 18, fy = by - 24 - (1 - k) * 10;
    g.lineStyle(1.5, 0x3a2a1a, 1); g.lineBetween(bx + 2, by - 22, fx, fy);
    glow(g, fx, fy, 10, FUSE, 0.12, 3);
    for (let i = 0; i < 5; i++) { const a = time / 40 + i * 1.3; g.fillStyle(lit(FUSE, 0.3), 1); g.fillCircle(fx + Math.cos(a) * 5, fy + Math.sin(a) * 5, 1.2); }
    g.lineStyle(2, BLAST, 0.3 + k * 0.6); g.strokeCircle(bx, by - 10, 70 * (0.4 + k * 0.6));
  }
  if (groan > 0) {
    for (let i = 0; i < 4; i++) { g.fillStyle(SCREE, 1 - groan * 0.5); g.fillRect(tx - 16 + i * 10, ty + (time / 4 + i * 37) % 70, 4, 4); }
  }
}

export const COLLAPSE: GimmickDef = {
  id: 'rubble-collapse',
  rules: 'Strike a pillar to crack it; three cracks and it topples down the line marked on the floor. Krell blows charges on them. Leave a side one pillar and its roof caves in.',
  make,
};
