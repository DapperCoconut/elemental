import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget, Striker } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { hazardStripe, trefoil } from '../art';
import {
  AMBER, AMBER_LIT, CHEREN, CHEREN_LIT, CONCRETE, CONCRETE_DARK, COPPER, COPPER_DARK, GLOW, GLOW_LIT, HAZARD_BLACK,
  IRON, IRON_DARK, IRON_LIT, LEAD, LEAD_DARK, LEAD_LIT, SLAG,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * The Long Arm — Tongsman Ludovic Haft, technology.
 *
 * At the Rod Store nobody touches a fresh rod: a tongsman works the master yoke behind a lead-glass
 * window, and a great slave arm on the overhead gantry copies him — but *mirrored*, the way the
 * old linkage was built, so his left is its right and his near is its far. In the star's telling
 * Haft lifted more than rods with it.
 *
 * The rule: the jaws hang over the point opposite the yoke-holder through the middle of the yard
 * (a dotted line shows the mirror). Every few seconds they lock where they are, open wide, and
 * clamp — whoever is under them is gripped (held and crushed), yoke-holder included. Strike the
 * yoke console to take the master yourself: then it is your body that steers his jaws, and you
 * walk to the spot opposite him. Past half his health a second arm joins, mirrored side to side.
 */

const SLUG = 'waldo';
/** The jaws' reach when they clamp. */
const GRIP_R = 48;
const GRIP_DMG = 17;
const GRIP_HOLD = 1100;
/** Jaws chase their mirror point at this speed (px/s) — fast, but not instant. */
const JAW_SPEED = 250;
/** One clamp cycle: travel, then lock + open (the telegraph), then clamp and lift. */
const CYCLE_MS = 3600;
const LOCK_MS = 950;
const LIFT_MS = 500;
/** The yoke can't change hands more often than this. */
const YOKE_LOCK_MS = 1400;

interface Jaw {
  x: number; y: number;
  /** How the master's position maps to this jaw: 'point' through the centre, or 'side' across x only. */
  kind: 'point' | 'side';
  /** Cycle phase offset so two arms never clamp together. */
  offset: number;
  lockedAt: number;
  clampedAt: number;
  /** The cycle count last seen — a new count means the clamp just fell. */
  cycle: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const cx = W / 2, cy = (top + H) / 2;
  const yoke: Pt = { x: W / 2, y: H - 56 };
  let master: Fighter = npc;
  let yokeAt = -99999;
  let struckFx = -99999;
  let t0 = -1;
  let second = false;
  const jaws: Jaw[] = [{ x: cx, y: cy, kind: 'point', offset: 0, lockedAt: -1, clampedAt: -99999, cycle: -1 }];
  const gripFx = new Map<Fighter, number>([[player, -99999], [npc, -99999]]);

  const mirror = (j: Jaw, m: Pt): Pt => j.kind === 'point'
    ? { x: clamp(2 * cx - m.x, 50, W - 50), y: clamp(2 * cy - m.y, top + 40, H - 40) }
    : { x: clamp(W - m.x, 50, W - 50), y: clamp(m.y, top + 40, H - 40) };

  const takeYoke = (by: Striker) => {
    const now = ctx.scene.time.now;
    const f = by === 'player' ? player : npc;
    if (f === master || now - yokeAt < YOKE_LOCK_MS) return;
    master = f; yokeAt = now; struckFx = now;
    tk.sfx('gear-turn');
  };
  const yokeTarget: StrikeTarget = ctx.target({ x: yoke.x, y: yoke.y - 14, r: 34, onStruck: (by) => takeYoke(by) });

  /** Where in its cycle a jaw is: 0..1 travelling, then locked, then clamped. */
  const phase = (j: Jaw, time: number) => ((time - t0 + j.offset) % CYCLE_MS + CYCLE_MS) % CYCLE_MS;
  const locked = (j: Jaw, time: number) => phase(j, time) >= CYCLE_MS - LOCK_MS;

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (t0 < 0) t0 = time + 1500;
      if (time < t0) return;
      if (!second && npc.hp <= npc.maxHp * 0.5) {
        second = true;
        const m = { x: clamp(W - master.x, 50, W - 50), y: clamp(master.y, top + 40, H - 40) };
        jaws.push({ x: m.x, y: m.y, kind: 'side', offset: CYCLE_MS / 2, lockedAt: -1, clampedAt: -99999, cycle: -1 });
        ctx.banner('THE SECOND ARM COMES DOWN THE GANTRY', '#b8ecff');
        tk.sfx('gear-turn');
      }
      for (const j of jaws) {
        const n = Math.floor((time - t0 + j.offset) / CYCLE_MS);
        if (j.cycle < 0) j.cycle = n;
        // The clamp falls as the cycle count turns over — only after a full locked warning.
        if (n !== j.cycle) {
          j.cycle = n;
          const warned = j.lockedAt >= 0 && time - j.lockedAt >= LOCK_MS * 0.8;
          j.lockedAt = -1;
          if (warned) {
            j.clampedAt = time;
            tk.sfx('clang');
            for (const f of [player, npc]) {
              if (!alive(f) || ctx.isAirborne(f) || dist(f.x, f.y, j.x, j.y) > GRIP_R + 16) continue;
              tk.hitFighter(f, GRIP_DMG, f.x, f.y);
              ctx.root(f, GRIP_HOLD);
              gripFx.set(f, time);
            }
          }
        }
        // Lifting after a clamp, the arm does not chase; otherwise it travels until it locks.
        if (time - j.clampedAt < LIFT_MS) continue;
        if (!locked(j, time)) {
          j.lockedAt = -1;
          const want = mirror(j, master);
          const d = dist(j.x, j.y, want.x, want.y);
          const step = Math.min(d, JAW_SPEED * dt);
          if (d > 0.5) { j.x += ((want.x - j.x) / d) * step; j.y += ((want.y - j.y) / d) * step; }
        } else if (j.lockedAt < 0) {
          j.lockedAt = time;
          tk.sfx('beam-charge');
        }
      }
    },

    npcSeek() {
      // Danger first: never stand under a locked jaw.
      const now = ctx.scene.time.now;
      for (const j of jaws) {
        if (locked(j, now) && dist(npc.x, npc.y, j.x, j.y) < GRIP_R + 50) {
          const a = Math.atan2(npc.y - j.y, npc.x - j.x);
          return { x: clamp(j.x + Math.cos(a) * 150, 60, W - 60), y: clamp(j.y + Math.sin(a) * 150, top + 50, H - 50) };
        }
      }
      // The player holds the yoke: walk up and take it back.
      if (master === player) return { x: yoke.x + (npc.x < yoke.x ? -40 : 40), y: yoke.y - 50 };
      // He holds it: stand where his mirror puts a jaw on the player.
      let best: Pt | null = null;
      let bd = Infinity;
      for (const j of jaws) {
        const p = j.kind === 'point' ? { x: 2 * cx - player.x, y: 2 * cy - player.y } : { x: W - player.x, y: player.y };
        const q = { x: clamp(p.x, 60, W - 60), y: clamp(p.y, top + 50, H - 50) };
        const d = dist(q.x, q.y, npc.x, npc.y);
        if (d < bd) { bd = d; best = q; }
      }
      return best;
    },

    destroy() { yokeTarget.remove(); },

    drawGround(g, time) {
      // The gantry's shadow across the yard and the painted travel limits.
      g.fillStyle(0x000000, 0.12); g.fillRect(0, cy - 14, W, 28);
      g.lineStyle(2, AMBER, 0.25); g.strokeRect(40, top + 30, W - 80, H - top - 60);
      // The mirror's pivot: a brass rose let into the floor at the yard's middle.
      g.fillStyle(IRON_DARK, 1); g.fillCircle(cx, cy, 16);
      g.lineStyle(2, COPPER, 0.9); g.strokeCircle(cx, cy, 13);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.lineStyle(1.5, COPPER_DARK, 0.9); g.lineBetween(cx, cy, cx + Math.cos(a) * 12, cy + Math.sin(a) * 12); }
      // The mirror line: master — pivot — jaw, dotted.
      for (const j of jaws) {
        const pv = j.kind === 'point' ? { x: cx, y: cy } : { x: cx, y: master.y };
        drawDots(g, master.x, master.y, pv.x, pv.y, master === player ? CHEREN_LIT : SLAG, time);
        drawDots(g, pv.x, pv.y, j.x, j.y, master === player ? CHEREN_LIT : SLAG, time);
        if (j.kind === 'side') { g.lineStyle(1, COPPER, 0.25); g.lineBetween(cx, top + 30, cx, H - 30); }
      }
      // Each jaw's mark on the floor: a ring that tightens while locked.
      for (const j of jaws) {
        const lk = locked(j, time) && j.lockedAt >= 0 ? clamp((time - j.lockedAt) / LOCK_MS, 0, 1) : 0;
        shadow(g, j.x, j.y + 6, 70 + lk * 30, 22 + lk * 8, 0.3 + lk * 0.2);
        if (lk > 0) {
          g.fillStyle(SLAG, 0.08 + lk * 0.16); g.fillCircle(j.x, j.y, GRIP_R + 16);
          g.lineStyle(3, SLAG, 0.5 + lk * 0.5); g.strokeCircle(j.x, j.y, GRIP_R + 16);
          g.lineStyle(2, AMBER_LIT, 0.8); g.strokeCircle(j.x, j.y, (GRIP_R + 16) * (1 - lk) + 6);
        } else {
          g.lineStyle(1.5, AMBER, 0.35); g.strokeCircle(j.x, j.y, GRIP_R + 16);
        }
      }
      drawYoke(g, yoke, master === player, time, struckFx);
    },

    drawAir(g, time) {
      // The gantry: two box girders the length of the yard, riveted, with the trolleys riding them.
      const gy = top + 14;
      g.fillStyle(IRON_DARK, 1); g.fillRect(0, gy - 8, W, 16);
      g.fillStyle(IRON, 1); g.fillRect(0, gy - 8, W, 5);
      for (let x = 12; x < W; x += 36) { g.fillStyle(IRON_LIT, 0.8); g.fillCircle(x, gy, 1.6); g.lineStyle(1, IRON_DARK, 1); g.lineBetween(x + 18, gy - 8, x + 18, gy + 8); }
      hazardStripe(g, 0, gy + 8, W, 4, 0.7);
      for (const j of jaws) drawArm(g, j, gy, time, locked(j, time) && j.lockedAt >= 0 ? clamp((time - j.lockedAt) / LOCK_MS, 0, 1) : 0);
      // Gripped fighters: the fingers' ring stays on them for the hold.
      for (const f of [player, npc]) {
        const at = gripFx.get(f) ?? -99999;
        const k = (time - at) / GRIP_HOLD;
        if (!alive(f) || k < 0 || k > 1) continue;
        g.lineStyle(4, LEAD_DARK, 1 - k); g.strokeCircle(f.x, f.y - 6, 22);
        for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; g.fillStyle(LEAD_LIT, 1 - k); g.fillCircle(f.x + Math.cos(a) * 22, f.y - 6 + Math.sin(a) * 22, 4); }
      }
    },

    drawHud(g, time) {
      // The yoke's lamp: blue when you hold it, red when he does; and each arm's clamp clock.
      const x = 24, y = top + 22;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 10, y - 14, 40 + jaws.length * 30, 28, 6);
      g.fillStyle(master === player ? CHEREN : SLAG, 1); g.fillCircle(x + 6, y, 8);
      g.fillStyle(master === player ? CHEREN_LIT : AMBER_LIT, 0.9); g.fillCircle(x + 4, y - 2, 3);
      jaws.forEach((j, i) => {
        const jx = x + 36 + i * 30;
        const p = t0 < 0 || time < t0 ? 0 : phase(j, time) / CYCLE_MS;
        g.lineStyle(3, IRON_LIT, 0.5); g.strokeCircle(jx, y, 9);
        g.lineStyle(3, p > 1 - LOCK_MS / CYCLE_MS ? SLAG : AMBER, 1);
        g.beginPath(); g.arc(jx, y, 9, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2, false); g.strokePath();
        g.fillStyle(j.kind === 'point' ? LEAD_LIT : COPPER, 1); g.fillCircle(jx, y, 3);
      });
    },
  };
}

/** A dotted, marching line — the linkage reading its mirror. */
function drawDots(g: G, ax: number, ay: number, bx: number, by: number, color: number, time: number): void {
  const d = dist(ax, ay, bx, by);
  const n = Math.floor(d / 14);
  const off = (time / 60) % 14;
  for (let i = 0; i < n; i++) {
    const t = (i * 14 + off) / d;
    if (t > 1) break;
    g.fillStyle(color, 0.35); g.fillCircle(ax + (bx - ax) * t, ay + (by - ay) * t, 1.8);
  }
}

/** The master yoke: a concrete console with a lead-glass window and two pistol-grip handles. */
function drawYoke(g: G, p: Pt, yours: boolean, time: number, struckAt: number): void {
  const { x, y } = p;
  shadow(g, x, y + 2, 120, 26, 0.35);
  g.fillStyle(CONCRETE_DARK, 1); g.fillRect(x - 52, y - 34, 104, 34);
  g.fillStyle(CONCRETE, 1); g.fillRect(x - 50, y - 34, 100, 6);
  hazardStripe(g, x - 52, y - 6, 104, 6, 0.9);
  // The window: thick, green-tinted lead glass in an iron frame.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 34, y - 62, 68, 30);
  g.fillStyle(0x2f5a3a, 1); g.fillRect(x - 30, y - 58, 60, 22);
  g.fillStyle(GLOW_LIT, 0.18); g.fillRect(x - 28, y - 56, 14, 18);
  g.lineStyle(1, GLOW, 0.3); g.lineBetween(x - 4, y - 56, x + 12, y - 38);
  // The two handles, their stalks leaning to the last hand on them.
  const lean = Math.sin(time / 400) * 0.12 + (yours ? -0.25 : 0.25);
  for (const k of [-1, 1]) {
    const hx = x + k * 22, hy = y - 30;
    const tx = hx + Math.sin(lean) * 16, ty = hy - Math.cos(lean) * 16;
    g.lineStyle(4, IRON, 1); g.lineBetween(hx, hy, tx, ty);
    g.fillStyle(LEAD_DARK, 1); g.fillRoundedRect(tx - 4, ty - 9, 8, 12, 3);
    g.fillStyle(yours ? CHEREN : SLAG, 1); g.fillCircle(tx, ty - 9, 2.5);
  }
  trefoil(g, x, y - 18, 6, HAZARD_BLACK, AMBER, 0.95);
  glow(g, x, y - 46, 40, yours ? CHEREN : SLAG, 0.05, 3);
  const k = (time - struckAt) / 400;
  if (k >= 0 && k < 1) { g.lineStyle(3 * (1 - k), yours ? CHEREN_LIT : AMBER_LIT, 1 - k); g.strokeCircle(x, y - 30, 30 + k * 30); }
}

/** One slave arm: trolley on the gantry, telescoping mast, wrist, and three lead-shod fingers. */
function drawArm(g: G, j: Jaw, gy: number, time: number, lk: number): void {
  const { x, y } = j;
  const hang = y - 34;
  // Trolley: a riveted box on four wheels.
  g.fillStyle(LEAD_DARK, 1); g.fillRect(x - 20, gy - 12, 40, 22);
  g.fillStyle(LEAD, 1); g.fillRect(x - 18, gy - 12, 36, 6);
  for (const k of [-14, -5, 5, 14]) { g.fillStyle(IRON_DARK, 1); g.fillCircle(x + k, gy - 12, 3); }
  // Mast: three nested sleeves, narrowing down.
  const segs = 3;
  for (let i = 0; i < segs; i++) {
    const a = gy + 10 + ((hang - gy - 10) * i) / segs, b = gy + 10 + ((hang - gy - 10) * (i + 1)) / segs;
    const w = 14 - i * 3;
    g.fillStyle(i % 2 ? IRON : LEAD, 1); g.fillRect(x - w / 2, a, w, b - a + 2);
    g.fillStyle(LEAD_LIT, 0.5); g.fillRect(x - w / 2 + 1, a, 2, b - a);
    g.fillStyle(IRON_DARK, 1); g.fillRect(x - w / 2 - 1, b - 1, w + 2, 3);
  }
  // Wrist: a drum with a cable running round it.
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x, hang, 9);
  g.lineStyle(2, COPPER, 1); g.strokeCircle(x, hang, 7);
  // Fingers: spread while locked, closed after the clamp.
  const sinceClamp = (time - j.clampedAt) / LIFT_MS;
  const open = lk > 0 ? 0.25 + lk * 0.75 : sinceClamp >= 0 && sinceClamp < 1 ? 0 : 0.35;
  for (let f = 0; f < 3; f++) {
    const base = -Math.PI / 2 + ((f - 1) * 2 * Math.PI) / 3;
    const spread = 10 + open * 18;
    const kx = x + Math.cos(base) * spread * 0.5, ky = hang + 10 + Math.abs(Math.sin(base)) * 4;
    const tx = x + Math.cos(base) * spread, ty = hang + 22 + open * 6;
    g.lineStyle(5, LEAD_DARK, 1); g.lineBetween(x, hang + 4, kx, ky);
    g.lineStyle(4, LEAD, 1); g.lineBetween(kx, ky, tx, ty);
    g.fillStyle(lk > 0 ? SLAG : LEAD_LIT, 1); g.fillCircle(tx, ty, 3.5);
  }
  if (lk > 0) glow(g, x, hang + 20, 30 + lk * 20, SLAG, 0.05 + lk * 0.05, 3);
  if (sinceClamp >= 0 && sinceClamp < 1) {
    g.lineStyle(4 * (1 - sinceClamp), AMBER_LIT, 1 - sinceClamp); g.strokeCircle(x, y, GRIP_R * (0.6 + sinceClamp * 0.6));
  }
}

export const FALLEN_WALDO: GimmickDef = {
  id: fallenId('halflife', SLUG),
  rules: 'His jaws hang opposite the yoke-holder across the yard, then lock and clamp. Strike the yoke to steer them with your own feet. At half, a second arm.',
  make,
};
