import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, glow, lit, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, O, OCOL, alive, clamp, dist, drawBone, drawSkull, jit } from '../util';

/**
 * THE BONE-MEAL ROUND — Jory Fenn, Bone-Miller of the Long Beds.
 *
 * Nothing is wasted in the Ossuary: what is too broken to plant is milled into meal for the
 * Empress's roses. In the King's telling Jory ran the edge-runner — a great millstone stood on its
 * rim, rolling round and round a bone-strewn floor on a timber yoke from a centre post — and never
 * asked whose bones were in the trough.
 *
 * The stone rolls round the pivot without stopping and crushes whatever it rolls over, either
 * fighter. Every few seconds Jory knocks the yoke's pin along the beam: a new track is chalked on
 * the floor — the one nearest wherever YOU are — and after a breath the stone slides out onto it.
 * Fresh meal lies behind the stone and drags at the feet. Strike the centre post and the yoke
 * jerks into reverse: roll the stone back into him. Halfway down a second stone goes on the far end.
 */

const ID = fallenId('ossuary', 'mill');
const TRACKS = [125, 190, 255];
const HALF_LEN = 36;
const HALF_THICK = 16;
const RATCHET_MS = 5600;
const WARN_MS = 1500;
const SLIDE_MS = 520;
const OMEGA = 0.68;
const MEAL_MS = 1600;

type Side = 'player' | 'npc';
interface Meal { a: number; r: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const clock = new Clock();
  const C: Pt = { x: W / 2, y: (top + H) / 2 };
  let now = 0;
  let theta = -Math.PI / 2;
  let dir = 1;
  let R = TRACKS[2];
  let fromR = R;
  let toR = R;
  let pendingR = -1;
  let warnAt = 0;
  let slideAt = -1;
  let nextRatchet = -1;
  let twin = false;
  let reversedAt = -1e9;
  let rollPhase = 0;
  const hitAt: Record<Side, number> = { player: -1e9, npc: -1e9 };
  const meal: Meal[] = [];
  let mealTick = 0;
  const fighter = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
  const stones = (): number[] => (twin ? [theta, theta + Math.PI] : [theta]);

  const post: StrikeTarget = ctx.target({
    x: C.x, y: C.y, r: 30,
    onStruck(by) {
      if (now - reversedAt < 1400) return;
      reversedAt = now;
      dir = -dir;
      ctx.sfx('gear-turn');
      ctx.float(C.x, C.y - 56, by === 'player' ? 'YOKE REVERSED' : 'JORY REVERSES THE YOKE', by === 'player' ? OCOL.green : OCOL.bone);
    },
  });

  /** Is (x,y) under a stone at angle a on track r? */
  const under = (a: number, r: number, x: number, y: number, pad: number): boolean => {
    const sx = C.x + Math.cos(a) * r, sy = C.y + Math.sin(a) * r;
    const dx = x - sx, dy = y - sy;
    const along = Math.abs(dx * -Math.sin(a) + dy * Math.cos(a));
    const across = Math.abs(dx * Math.cos(a) + dy * Math.sin(a));
    return along < HALF_LEN + pad && across < HALF_THICK + pad;
  };

  const onMeal = (f: Fighter): boolean => {
    const d = dist(f.x, f.y, C.x, C.y);
    const a = Math.atan2(f.y - C.y, f.x - C.x);
    for (const m of meal) {
      if (Math.abs(d - m.r) > HALF_THICK + 6) continue;
      let da = Math.abs(a - m.a) % (Math.PI * 2);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da * m.r < 16) return true;
    }
    return false;
  };

  return {
    update(time: number) {
      const dt = clock.tick(time);
      now = time;
      if (dt === 0) return;
      if (nextRatchet < 0) nextRatchet = time + 3200;
      if (!twin && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        twin = true;
        ctx.banner('A SECOND STONE ON THE YOKE', OCOL.bone);
        ctx.sfx('stone-rise');
      }
      const w = OMEGA * (twin ? 1.12 : 1);
      theta += dir * w * dt;
      rollPhase += w * dt * R / 20;
      // The ratchet: a new track chalked where you are, then the stone slides out to it.
      if (pendingR < 0 && time >= nextRatchet) {
        const pd = dist(ctx.player.x, ctx.player.y, C.x, C.y);
        let best = TRACKS[0];
        for (const t of TRACKS) if (Math.abs(t - pd) < Math.abs(best - pd)) best = t;
        pendingR = best;
        warnAt = time;
        slideAt = time + tk.warn(WARN_MS);
        ctx.sfx('clock-tick');
      }
      if (pendingR >= 0 && time >= slideAt) {
        fromR = R; toR = pendingR; pendingR = -1;
        ctx.sfx('rock-throw');
        nextRatchet = time + RATCHET_MS;
      }
      if (fromR !== toR) {
        const k = clamp((time - slideAt) / SLIDE_MS, 0, 1);
        R = fromR + (toR - fromR) * k;
        if (k >= 1) fromR = toR;
      }
      // Meal behind the stone, a crumb every little while.
      mealTick += dt;
      if (mealTick > 0.06) {
        mealTick = 0;
        for (const a of stones()) meal.push({ a: a - dir * 0.18, r: R, at: now });
      }
      while (meal.length && now - meal[0].at > MEAL_MS) meal.shift();
      // Crushing.
      for (const s of ['player', 'npc'] as Side[]) {
        const f = fighter(s);
        if (!alive(f) || now - hitAt[s] < 700) continue;
        if (!stones().some((a) => under(a, R, f.x, f.y, 18))) continue;
        hitAt[s] = now;
        const out = Math.atan2(f.y - C.y, f.x - C.x);
        const side = dist(f.x, f.y, C.x, C.y) > R ? 1 : -1;
        if (s === 'player') { tk.hitPlayer(20, f.x, f.y); ctx.sfx('stone-slam'); }
        else { ctx.hit(f, 34, f.x, f.y); ctx.float(f.x, f.y - 60, 'MILLED', OCOL.green); ctx.sfx('stone-slam'); }
        ctx.nudge(f, Math.cos(out) * 60 * side, Math.sin(out) * 60 * side);
        ctx.flash(f.x, f.y, O.boneLit);
      }
    },

    playerSpeedMult: () => (onMeal(ctx.player) ? 0.7 : 1),
    npcSpeedMult: () => (onMeal(ctx.npc) ? 0.7 : 1),

    npcSeek(): Pt | null {
      const n = ctx.npc;
      const d = dist(n.x, n.y, C.x, C.y);
      const a = Math.atan2(n.y - C.y, n.x - C.x);
      const threats = [R, pendingR].filter((r) => r > 0);
      for (const r of threats) {
        if (Math.abs(d - r) > HALF_THICK + 60) continue;
        // Off the track the short way — but never into the post or past the walls.
        const inward = d < r && r - 95 > 60;
        const target = inward ? r - 95 : r + 95;
        return { x: tk.clampX(C.x + Math.cos(a) * target), y: tk.clampY(C.y + Math.sin(a) * target) };
      }
      return null;
    },

    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      // The trough floor: worn rings of old meal where the stone has run for years.
      for (const t of TRACKS) {
        g.lineStyle(HALF_THICK * 2 + 8, O.loamDeep, 0.35); g.strokeCircle(C.x, C.y, t);
        g.lineStyle(2, O.boneDark, 0.25); g.strokeCircle(C.x, C.y, t - HALF_THICK); g.strokeCircle(C.x, C.y, t + HALF_THICK);
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * Math.PI * 2 + t;
          const rr = t + (jit(t, i) - 0.5) * HALF_THICK * 1.6;
          drawBone(g, C.x + Math.cos(a) * rr - 4, C.y + Math.sin(a) * rr, C.x + Math.cos(a) * rr + 4, C.y + Math.sin(a) * rr - 2, 2, O.boneDark, 0.5);
        }
      }
      // Fresh meal: a pale scatter on the track behind each stone.
      for (const m of meal) {
        const k = 1 - (now - m.at) / MEAL_MS;
        const x = C.x + Math.cos(m.a) * m.r, y = C.y + Math.sin(m.a) * m.r;
        g.fillStyle(O.boneLit, 0.35 * k); g.fillEllipse(x, y, 20, 12);
      }
      // The chalked track to come.
      if (pendingR > 0) {
        const k = clamp((time - warnAt) / (slideAt - warnAt), 0, 1);
        const segs = 48;
        for (let i = 0; i < segs; i += 2) {
          const a0 = (i / segs) * Math.PI * 2 + time / 2000, a1 = ((i + 1) / segs) * Math.PI * 2 + time / 2000;
          g.lineStyle(3, O.lily, 0.4 + k * 0.5);
          g.beginPath(); g.arc(C.x, C.y, pendingR, a0, a1); g.strokePath();
        }
        g.fillStyle(O.sinew, 0.06 + k * 0.1); g.lineStyle(HALF_THICK * 2 + 20, O.sinew, 0.06 + k * 0.12); g.strokeCircle(C.x, C.y, pendingR);
      }
    },

    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      // The yoke, the post, and each stone rolling on its rim.
      for (const a of stones()) {
        const sx = C.x + Math.cos(a) * R, sy = C.y + Math.sin(a) * R;
        const bx = C.x + Math.cos(a) * (R + HALF_THICK + 10), by = C.y + Math.sin(a) * (R + HALF_THICK + 10);
        g.lineStyle(10, dim(O.timber, 0.2), 1); g.lineBetween(C.x, C.y - 10, bx, by - 10);
        g.lineStyle(4, O.timberLit, 1); g.lineBetween(C.x, C.y - 12, bx, by - 12);
        for (let i = 1; i < 4; i++) { const k = i / 4; g.fillStyle(O.iron, 1); g.fillCircle(C.x + (bx - C.x) * k, C.y - 11 + (by - C.y) * k, 2.5); }
        drawStone(g, sx, sy, a, rollPhase, dir, time);
      }
      drawPost(g, C.x, C.y, time - reversedAt < 500);
    },

    drawHud(g: Phaser.GameObjects.Graphics, time: number) {
      // The miller's tally-board: which way the yoke turns, and the ratchet coming.
      const x = 56, y = top + 34;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 30, y - 24, 132, 48, 8);
      g.fillStyle(O.timber, 1); g.fillCircle(x, y, 18);
      g.lineStyle(3, O.boneLit, 1);
      g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 1.5, dir < 0); g.strokePath();
      const tip = dir > 0 ? Math.PI * 1.5 : -Math.PI * 0.5;
      const tx = x + Math.cos(tip) * 12, ty = y + Math.sin(tip) * 12;
      g.fillStyle(O.boneLit, 1); g.fillTriangle(tx - 5 * dir, ty - 5, tx - 5 * dir, ty + 5, tx + 4 * dir, ty);
      const k = pendingR > 0 ? 1 : clamp(1 - (nextRatchet - time) / RATCHET_MS, 0, 1);
      g.fillStyle(O.loamDeep, 1); g.fillRect(x + 28, y - 4, 64, 8);
      g.fillStyle(pendingR > 0 ? O.sinewLit : O.boneShade, 1); g.fillRect(x + 28, y - 4, 64 * k, 8);
      for (let i = 0; i < 3; i++) { g.fillStyle(Math.abs(TRACKS[i] - R) < 6 ? O.bone : O.stoneDark, 1); g.fillCircle(x + 36 + i * 24, y + 14, 4); }
      if (twin) drawSkull(g, x + 100, y - 4, 7, 0.9, { tone: O.boneShade });
    },

    destroy() { post.remove(); },
  };
}

/**
 * An edge-runner seen from above: a thick stone wheel on its rim, its face dressed with grooves
 * that turn as it rolls, bone grit crushed out from under its leading edge.
 */
function drawStone(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, phase: number, dir: number, time: number): void {
  const tx = -Math.sin(a), ty = Math.cos(a);
  const rx = Math.cos(a), ry = Math.sin(a);
  const P = (u: number, v: number, lift = 0) => ({ x: x + tx * u + rx * v, y: y + ty * u + ry * v - lift });
  shadow(g, x, y + 10, HALF_LEN * 2.4, HALF_THICK * 1.6, 0.4);
  // The rim on the floor, then the wheel standing up out of it.
  const lift = 30;
  const body = [P(-HALF_LEN, -HALF_THICK), P(HALF_LEN, -HALF_THICK), P(HALF_LEN, HALF_THICK), P(-HALF_LEN, HALF_THICK)];
  g.fillStyle(O.stoneDark, 1); g.fillPoints(body, true);
  const topF = [P(-HALF_LEN * 0.9, -HALF_THICK, lift), P(HALF_LEN * 0.9, -HALF_THICK, lift), P(HALF_LEN * 0.9, HALF_THICK, lift), P(-HALF_LEN * 0.9, HALF_THICK, lift)];
  g.fillStyle(O.stone, 1); g.fillPoints([body[0], body[1], topF[1], topF[0]], true);
  g.fillStyle(dim(O.stone, 0.15), 1); g.fillPoints([body[3], body[2], topF[2], topF[3]], true);
  g.fillStyle(O.stoneLit, 1); g.fillPoints(topF, true);
  // Dressing grooves sliding along the face as it turns.
  for (let i = 0; i < 6; i++) {
    const u = ((((i / 6 + phase * 0.05 * dir) % 1) + 1) % 1) * 2 - 1;
    const p0 = P(u * HALF_LEN * 0.85, -HALF_THICK, lift * (1 - u * u * 0.3)), p1 = P(u * HALF_LEN * 0.85, HALF_THICK, lift * (1 - u * u * 0.3));
    g.lineStyle(1.5, O.stoneDark, 0.8); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
  }
  // The iron axle-cap and the yoke's eye.
  const hub = P(0, -HALF_THICK, lift * 0.5);
  g.fillStyle(O.iron, 1); g.fillCircle(hub.x, hub.y, 6);
  g.fillStyle(O.ironLit, 1); g.fillCircle(hub.x - 1, hub.y - 1, 2);
  // Grit spraying from the leading edge.
  for (let i = 0; i < 5; i++) {
    const s = ((time / 140 + i * 0.2) % 1);
    const p = P(dir * (HALF_LEN + 4 + s * 14), (jit(i, 2) - 0.5) * HALF_THICK * 2, s * 10);
    g.fillStyle(O.boneLit, 0.8 * (1 - s)); g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
  glow(g, x, y, 30, O.boneLit, 0.02, 2);
}

/** The centre post: an iron-banded oak stump with the yoke's pin through it — strike it to reverse. */
function drawPost(g: Phaser.GameObjects.Graphics, x: number, y: number, jolt: boolean): void {
  const j = jolt ? 2 : 0;
  shadow(g, x, y + 8, 60, 16, 0.4);
  g.fillStyle(dim(O.timber, 0.2), 1); g.fillEllipse(x, y + 4, 52, 22);
  g.fillStyle(O.timber, 1); g.fillRect(x - 24 + j, y - 26, 48, 30);
  g.fillStyle(O.timberLit, 1); g.fillEllipse(x + j, y - 26, 48, 18);
  for (let r = 4; r < 22; r += 5) { g.lineStyle(1, O.timber, 0.8); g.strokeEllipse(x + j, y - 26, r * 2, r * 0.75); }
  g.fillStyle(O.iron, 1); g.fillRect(x - 24 + j, y - 14, 48, 4);
  g.fillStyle(O.ironLit, 1); g.fillCircle(x + j, y - 28, 5);
  if (jolt) { g.lineStyle(2, lit(O.bone, 0.3), 0.8); g.strokeCircle(x, y - 20, 34); }
}

export const FALLEN_MILL: GimmickDef = {
  id: ID,
  rules: 'A millstone rolls round the post, crushing all under it; after a chalk warning it hops to the track nearest you. Strike the post to reverse it.',
  make,
};
