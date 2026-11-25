import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { HW, alive, clamp, dist, splinter } from '../palette';

/**
 * Carriage to the Blade — Tobin Sawset, Ottilie's apprentice at the mill. In the true world he
 * helped her knock the oak wedges into the arbor every night. In the star's telling he is the
 * one who pulled them out and flung them into the roots, and the mill runs.
 *
 * Three log-carriage belts cross the mill floor, each running toward a circular saw at one end
 * (the other end's blade sits idle). Anyone standing on a belt is carried toward its live blade
 * — slower than a walk, so you can step off or walk against it. Logs are fed on at the far end
 * and ride the belt like a moving wall: a log shoves whoever is in front of it, and when it
 * reaches the saw it is sawn and two slabs fly out sideways along the chalked lanes at that end.
 * The mill bell reverses one belt every few seconds (its chevrons flash red first).
 *
 * The exploit is the clutch: every belt has an iron clutch lever on the floor beside it, and a
 * blow on it reverses that belt at once — so the live blade swaps to whichever end the foe is
 * standing near. Past half health the arbor runs free: faster belts, logs fed sooner.
 */

const ID = fallenId('heartwood', 'carriage');
const BELT_HALF = 34;
const X0 = 136;
const X1 = 824;
const BLADE_R = 32;
const LOG_HALF = 12;
const SLAB_REACH = 250;

interface Belt { y: number; dir: 1 | -1; slide: number; warnAt: number; clutchAt: number; lever: { x: number; y: number }; tgt: StrikeTarget | null }
interface Log { belt: number; x: number; seed: number }
interface Slab { x: number; y: number; vy: number; spin: number; left: number; hit: Set<Fighter> }
interface Dust { x: number; y: number; vx: number; vy: number; dieAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng, tk } = ctx;
  const mid = (top + H) / 2;
  const belts: Belt[] = [
    { y: top + 104, lever: { x: W / 2, y: top + 184 } },
    { y: mid + 4, lever: { x: W * 0.27, y: mid + 92 } },
    { y: H - 96, lever: { x: W * 0.73, y: mid + 92 } },
  ].map((b, i) => ({ ...b, dir: (i % 2 ? -1 : 1) as 1 | -1, slide: 0, warnAt: 0, clutchAt: -1e9, tgt: null }));
  let logs: Log[] = [];
  let slabs: Slab[] = [];
  let dust: Dust[] = [];
  let free = false;
  let now = 0;
  let nextBell = 4200;
  let nextLog = 1600;
  const bladeTick = new Map<Fighter, number>();

  const speed = (): number => (free ? 128 : 92);
  const bladeX = (b: Belt): number => (b.dir > 0 ? X1 + BLADE_R + 8 : X0 - BLADE_R - 8);
  const deadX = (b: Belt): number => (b.dir > 0 ? X0 - BLADE_R - 8 : X1 + BLADE_R + 8);
  const onBelt = (b: Belt, f: Fighter): boolean => Math.abs(f.y - b.y) < BELT_HALF + 4 && f.x > X0 - 24 && f.x < X1 + 24;
  const beltOf = (f: Fighter): number => belts.findIndex((b) => onBelt(b, f));
  const hurt = (f: Fighter, n: number, x: number, y: number): void => {
    if (f === ctx.player) tk.hitPlayer(n, x, y);
    else ctx.hit(f, n * 1.25, x, y);
  };

  const reverse = (b: Belt, why: string): void => {
    b.dir = (b.dir * -1) as 1 | -1;
    b.warnAt = 0;
    ctx.sfx('gear-turn');
    ctx.float(W / 2, b.y - 46, why, '#f6f3ea');
  };

  belts.forEach((b, i) => {
    b.tgt = ctx.target({
      x: b.lever.x, y: b.lever.y, r: 20, passThrough: true,
      onStruck: () => {
        if (now - b.clutchAt < 1400) return;
        b.clutchAt = now;
        reverse(belts[i], 'CLUTCH!');
      },
    });
  });

  const saw = (l: Log): void => {
    const b = belts[l.belt];
    const bx = bladeX(b);
    for (const s of [-1, 1]) slabs.push({ x: bx, y: b.y + s * 20, vy: s * 330, spin: rng() * 6, left: SLAB_REACH, hit: new Set() });
    for (let k = 0; k < 16; k++) {
      const a = rng() * Math.PI * 2, sp = 60 + rng() * 160;
      dust.push({ x: bx, y: b.y, vx: Math.cos(a) * sp - b.dir * 80, vy: Math.sin(a) * sp, dieAt: now + 500 + rng() * 500 });
    }
    ctx.sfx('slash');
    ctx.flash(bx, b.y, HW.sapwood);
  };

  return {
    update(time, dtIn) {
      const dt = Math.min(0.05, dtIn);
      now = time;
      if (!free && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        free = true;
        ctx.banner('THE ARBOR RUNS FREE', '#ffd76e');
        ctx.sfx('engine');
      }
      // The mill bell: warn, then reverse — the belt the player stands on, if any.
      if (time >= nextBell) {
        const pi = beltOf(ctx.player);
        const b = belts[pi >= 0 ? pi : Math.floor(rng() * belts.length)];
        b.warnAt = time + tk.warn(1200);
        ctx.sfx('clang');
        nextBell = time + (free ? 5200 : 7000);
      }
      for (const b of belts) {
        if (b.warnAt && time >= b.warnAt) reverse(b, 'BELL!');
        b.slide = (b.slide + b.dir * speed() * dt) % 40;
      }
      // Feed a log at the dead end of a belt.
      if (time >= nextLog && logs.length < 5) {
        const pi = beltOf(ctx.player);
        const i = pi >= 0 && rng() < 0.6 ? pi : Math.floor(rng() * belts.length);
        const b = belts[i];
        if (!logs.some((l) => l.belt === i && Math.abs(l.x - (b.dir > 0 ? X0 : X1)) < 120)) {
          logs.push({ belt: i, x: b.dir > 0 ? X0 + 4 : X1 - 4, seed: rng() * 10 });
          ctx.sfx('rock-throw');
        }
        nextLog = time + (free ? 2300 : 3300);
      }
      // Carry, shove, saw.
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f)) continue;
        const i = beltOf(f);
        if (i >= 0) ctx.nudge(f, belts[i].dir * speed() * dt, 0);
        for (const b of belts) {
          const bx = bladeX(b);
          if (dist(f.x, f.y, bx, b.y) > BLADE_R + 20) continue;
          if (time >= (bladeTick.get(f) ?? 0)) {
            bladeTick.set(f, time + 450);
            hurt(f, 10, f.x, f.y);
            ctx.sfx('slash');
          }
          ctx.nudge(f, -b.dir * 140 * dt, 0);
        }
      }
      for (const l of [...logs]) {
        const b = belts[l.belt];
        l.x += b.dir * speed() * dt;
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f) || Math.abs(f.y - b.y) > BELT_HALF + 14) continue;
          const ahead = (f.x - l.x) * b.dir;
          if (ahead > -6 && ahead < LOG_HALF + 22) ctx.nudge(f, b.dir * (LOG_HALF + 22 - ahead), 0);
        }
        const reach = b.dir > 0 ? l.x >= X1 + 6 - LOG_HALF : l.x <= X0 - 6 + LOG_HALF;
        const back = b.dir > 0 ? l.x < X0 - 30 : l.x > X1 + 30;
        if (reach) { saw(l); logs = logs.filter((q) => q !== l); } else if (back) logs = logs.filter((q) => q !== l);
      }
      for (const s of slabs) {
        const d = Math.abs(s.vy) * dt;
        s.y += s.vy * dt; s.left -= d; s.spin += dt * 14;
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f) || s.hit.has(f) || dist(s.x, s.y, f.x, f.y) > 34) continue;
          s.hit.add(f);
          hurt(f, 9, f.x, f.y);
          ctx.sfx('stab');
        }
      }
      slabs = slabs.filter((s) => s.left > 0);
      dust = dust.filter((p) => time < p.dieAt);
      for (const p of dust) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; }
    },

    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      const ni = beltOf(n);
      if (ni >= 0) {
        const b = belts[ni];
        const toBlade = Math.abs(bladeX(b) - n.x);
        const logBehind = logs.some((l) => l.belt === ni && (n.x - l.x) * b.dir > 0 && (n.x - l.x) * b.dir < 170);
        if (toBlade < 280 || logBehind || b.warnAt) {
          const s = n.y >= b.y ? 1 : -1;
          return { x: n.x - b.dir * 30, y: tk.clampY(b.y + s * (BELT_HALF + 50)) };
        }
      }
      const pi = beltOf(p);
      if (pi >= 0) {
        const b = belts[pi];
        const nearDead = Math.abs(p.x - deadX(b)) < Math.abs(p.x - bladeX(b));
        if (nearDead && now - b.clutchAt > 1400) return { x: b.lever.x + (n.x < b.lever.x ? -40 : 40), y: b.lever.y };
      }
      return null;
    },

    drawGround(g, time) {
      for (const b of belts) drawBelt(g, b, time, logs.some((l) => l.belt === belts.indexOf(b) && Math.abs(bladeX(b) - l.x) < 170));
      for (const b of belts) drawLever(g, b, now - b.clutchAt < 400);
    },

    drawAir(g, time) {
      for (const l of logs) drawLog(g, l.x, belts[l.belt].y, l.seed, belts[l.belt].dir, time);
      for (const b of belts) {
        drawBlade(g, bladeX(b), b.y, time, true);
        drawBlade(g, deadX(b), b.y, time, false);
      }
      for (const s of slabs) {
        splinter(g, s.x - 10, s.y, s.spin, 30);
        splinter(g, s.x + 8, s.y + 4, s.spin + 1.3, 22);
        g.fillStyle(HW.sapwood, 1); g.fillRoundedRect(s.x - 16, s.y - 7, 32, 14, 3);
        g.lineStyle(1, HW.plankDark, 0.8);
        for (let k = -10; k <= 10; k += 5) g.lineBetween(s.x + k, s.y - 6, s.x + k + 2, s.y + 6);
      }
      for (const p of dust) { g.fillStyle(HW.sapwood, clamp((p.dieAt - time) / 400, 0, 0.9)); g.fillRect(p.x, p.y, 2.4, 2.4); }
    },

    drawHud(g, time) {
      // Three belt dials at the bottom: an arrow for each belt's run, red while its bell is pending.
      const cx = W / 2, y = H - 26;
      g.fillStyle(HW.iron, 0.8); g.fillRoundedRect(cx - 92, y - 16, 184, 32, 8);
      g.lineStyle(1.5, free ? HW.amberLit : HW.ironLit, 0.9); g.strokeRoundedRect(cx - 92, y - 16, 184, 32, 8);
      belts.forEach((b, i) => {
        const x = cx - 56 + i * 56;
        const warn = b.warnAt > 0 && Math.sin(time / 70) > 0;
        g.fillStyle(warn ? 0xd8262a : HW.plank, 1); g.fillCircle(x, y, 11);
        g.fillStyle(HW.whitewash, 1);
        g.fillTriangle(x + b.dir * 8, y, x - b.dir * 4, y - 6, x - b.dir * 4, y + 6);
        g.fillRect(Math.min(x - b.dir * 8, x - b.dir * 3), y - 2, 5, 4);
      });
    },

    destroy() {
      for (const b of belts) b.tgt?.remove();
      logs = []; slabs = []; dust = [];
    },
  };
}

/** A carriage belt: iron rails, moving slats chevroned in its direction, red-flashing on a bell. */
function drawBelt(g: G, b: Belt, time: number, sawing: boolean): void {
  const y = b.y, h = BELT_HALF;
  shadow(g, (X0 + X1) / 2, y + h + 6, X1 - X0 + 40, 14, 0.25);
  g.fillStyle(HW.plankDark, 1); g.fillRect(X0 - 10, y - h, X1 - X0 + 20, h * 2);
  for (let x = X0 - 10 + ((b.slide % 40) + 40) % 40 - 40; x < X1 + 10; x += 40) {
    const a = Math.max(X0 - 10, x), c = Math.min(X1 + 10, x + 36);
    if (c <= a) continue;
    g.fillStyle(HW.plank, 1); g.fillRect(a, y - h + 4, c - a, h * 2 - 8);
    g.fillStyle(HW.plankLit, 0.5); g.fillRect(a, y - h + 4, c - a, 4);
    const cx = x + 18;
    if (cx > X0 && cx < X1) {
      const warn = b.warnAt > 0 && Math.sin(time / 70) > 0;
      g.lineStyle(3, warn ? 0xd8262a : HW.whitewash, warn ? 0.95 : 0.45);
      g.lineBetween(cx - b.dir * 6, y - 14, cx + b.dir * 6, y); g.lineBetween(cx + b.dir * 6, y, cx - b.dir * 6, y + 14);
    }
  }
  // Rails and rollers.
  for (const s of [-1, 1]) {
    g.fillStyle(HW.iron, 1); g.fillRect(X0 - 14, y + s * h - (s > 0 ? 0 : 6), X1 - X0 + 28, 6);
    g.fillStyle(HW.ironLit, 0.6); g.fillRect(X0 - 14, y + s * h - (s > 0 ? 0 : 6), X1 - X0 + 28, 2);
    for (let x = X0; x <= X1; x += 86) { g.fillStyle(HW.rust, 1); g.fillCircle(x, y + s * (h + 1), 3); }
  }
  // The slab lanes at the live blade: chalked, brighter while a log closes on the saw.
  const bx = b.dir > 0 ? X1 + BLADE_R + 8 : X0 - BLADE_R - 8;
  const a = sawing ? 0.55 + 0.3 * Math.sin(time / 80) : 0.14;
  g.lineStyle(2, HW.whitewash, a);
  for (const s of [-1, 1]) {
    for (let d = h + 8; d < SLAB_REACH; d += 18) g.lineBetween(bx - 16, y + s * d, bx + 16, y + s * d);
    g.lineBetween(bx - 18, y + s * (h + 4), bx - 18, y + s * SLAB_REACH);
    g.lineBetween(bx + 18, y + s * (h + 4), bx + 18, y + s * SLAB_REACH);
  }
  // Sawdust heaped under the live saw.
  g.fillStyle(HW.sapwood, 0.5); g.fillEllipse(bx, y + h + 8, 60, 14);
  g.fillStyle(HW.amberLit, 0.25); g.fillEllipse(bx - 6, y + h + 6, 30, 6);
}

/** The clutch lever: an iron post with a hand-lever thrown toward the belt's current run. */
function drawLever(g: G, b: Belt, jolt: boolean): void {
  const { x, y } = b.lever;
  shadow(g, x, y + 4, 40, 12, 0.35);
  g.fillStyle(HW.iron, 1); g.fillRoundedRect(x - 14, y - 8, 28, 14, 3);
  g.fillStyle(HW.ironLit, 1); g.fillRect(x - 12, y - 8, 24, 3);
  g.fillStyle(HW.rust, 1); g.fillCircle(x, y - 6, 5);
  const tipX = x + b.dir * (jolt ? 26 : 18), tipY = y - 30;
  g.lineStyle(5, HW.iron, 1); g.lineBetween(x, y - 6, tipX, tipY);
  g.lineStyle(2, HW.ironLit, 0.8); g.lineBetween(x - 1, y - 7, tipX - 1, tipY - 1);
  g.fillStyle(0xd8262a, 1); g.fillCircle(tipX, tipY, 6);
  g.fillStyle(0xff7a6a, 0.7); g.fillCircle(tipX - 2, tipY - 2, 2.4);
  if (jolt) glow(g, x, y - 16, 30, HW.amberLit, 0.08, 3);
}

/** A birch log on the carriage: bark with lenticels, a pale cut end with rings, rolling a little. */
function drawLog(g: G, x: number, y: number, seed: number, dir: number, time: number): void {
  const h = BELT_HALF + 6;
  shadow(g, x + 4, y + h - 2, 30, 10, 0.4);
  g.fillStyle(HW.barkShade, 1); g.fillRoundedRect(x - LOG_HALF, y - h, LOG_HALF * 2, h * 2, 6);
  g.fillStyle(HW.bark, 1); g.fillRoundedRect(x - LOG_HALF + 2, y - h + 2, LOG_HALF * 2 - 7, h * 2 - 4, 5);
  for (let k = 0; k < 6; k++) {
    const ly = y - h + 8 + ((k * 13 + seed * 7 + time * 0.02 * dir) % (h * 2 - 14));
    g.fillStyle(HW.mark, 0.8); g.fillEllipse(x - 1, ly, LOG_HALF * 1.3, 2);
  }
  // The cut face, toward the saw.
  const fx = x + dir * LOG_HALF;
  g.fillStyle(HW.sapwood, 1); g.fillEllipse(fx, y, 8, h * 2 - 6);
  g.lineStyle(1, HW.heartLit, 0.7);
  for (let r = 1; r <= 3; r++) g.strokeEllipse(fx, y, 8 - r * 2, (h * 2 - 6) * (1 - r * 0.22));
  g.fillStyle(HW.heart, 1); g.fillEllipse(fx, y, 2.5, 8);
}

/** A circular saw on its arbor: toothed steel spinning (live) or still and greased (idle). */
function drawBlade(g: G, x: number, y: number, time: number, live: boolean): void {
  const spin = live ? time / 40 : 0.3;
  shadow(g, x, y + BLADE_R - 4, BLADE_R * 2, 12, 0.4);
  if (live) glow(g, x, y, BLADE_R + 18, HW.amberLit, 0.05, 3);
  const pts: { x: number; y: number }[] = [];
  const T = 18;
  for (let i = 0; i < T * 2; i++) {
    const a = spin + (i / (T * 2)) * Math.PI * 2;
    const r = i % 2 ? BLADE_R - 5 : BLADE_R + 2;
    pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
  }
  g.fillStyle(live ? 0x9aa4a8 : 0x6c7275, 1); g.fillPoints(pts, true);
  g.fillStyle(live ? 0xc8d0d4 : 0x8a9093, 1); g.fillCircle(x, y, BLADE_R - 7);
  if (live) {
    g.lineStyle(1.2, 0xffffff, 0.5);
    for (let k = 0; k < 3; k++) g.beginPath(), g.arc(x, y, BLADE_R - 10 - k * 5, spin * 2 + k, spin * 2 + k + 1.4), g.strokePath();
  }
  g.fillStyle(HW.iron, 1); g.fillCircle(x, y, 8);
  g.fillStyle(HW.ironLit, 1); g.fillCircle(x - 2, y - 2, 3);
  if (!live) { g.fillStyle(HW.amberDeep, 0.6); g.fillCircle(x + 9, y + 6, 3); }
}

export const FALLEN_CARRIAGE: GimmickDef = {
  id: ID,
  rules: 'Belts carry you toward a running saw; logs shove you along and sawn logs throw slabs sideways. Strike a clutch to reverse its belt.',
  make,
};
