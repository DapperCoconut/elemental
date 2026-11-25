import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BONE, GOLD_THREAD, HOURGLASS, ROPE, SILK_LIT, SILK_SHADE, SPIDER, SPIDER_GOLD, SPIDER_LIT } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * The Drover's Widow — Spider-Drover Yarrow Gantling, who walks the great spiders from the pens
 * to the mills, and who in the King's telling walked one through the doors the Spymaster marked.
 *
 * Old Mardle, a widow as big as a cart, walks the yard on the end of Yarrow's rein, always toward
 * you. She walks the way spiders do, four feet at a time — the first, third on one side and the
 * second, fourth on the other — and every foot that lifts shows where it will come down: a ring
 * that tightens on the silk. Under a falling foot you are crushed. Come in front of her and she
 * rears to bite: the jaws open, the belly lifts.
 *
 * The exploit is what the rear shows: the red hourglass on her belly. Strike it while she rears
 * and she shies from you and turns on whoever holds the rein — and her feet fall on him just as
 * hard. Halfway down she starts to drum: every fifth step all eight feet lift and fall at once.
 */

const ID = fallenId('web', 'drover');
const STRIDE_MS = 760;
const LIFT_MS = 680;
const FOOT_R = 26;
const REAR_MS = 720;
const TURN_MS = 6500;
const FWD = [56, 22, -18, -54];
const LAT = [82, 94, 92, 78];

interface Foot { k: number; side: -1 | 1; x: number; y: number; fx: number; fy: number; tx: number; ty: number; liftAt: number; landAt: number; up: boolean; drum: boolean }
interface Dent { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const sp = { x: W / 2, y: top + 130, h: Math.PI / 2 };
  let goal: Fighter = player;
  let turnedUntil = 0;
  let stride = 0;
  let nextStride = 0;
  let rearAt = 0;
  let biteAt = 0;
  let biteReady = 0;
  let drumming = false;
  let started = false;
  const dents: Dent[] = [];

  const rot = (fwd: number, lat: number, h = sp.h, x = sp.x, y = sp.y): Pt =>
    ({ x: x + Math.cos(h) * fwd - Math.sin(h) * lat, y: y + Math.sin(h) * fwd + Math.cos(h) * lat });
  const feet: Foot[] = [];
  for (let k = 0; k < 4; k++) for (const side of [-1, 1] as (-1 | 1)[]) {
    const p = rot(FWD[k], side * LAT[k]);
    feet.push({ k, side, x: p.x, y: p.y, fx: p.x, fy: p.y, tx: p.x, ty: p.y, liftAt: 0, landAt: 0, up: false, drum: false });
  }
  const groupOf = (f: Foot) => ((f.k % 2 === 0) === (f.side < 0) ? 0 : 1);
  const abdomen = (): Pt => rot(-40, 0);
  const rearing = (time: number) => rearAt > 0 && time < biteAt;

  const hourglass = ctx.target({
    x: sp.x, y: sp.y, r: 24,
    onStruck: (by) => {
      const now = tk.now;
      if (!rearing(now)) { ctx.flash(hourglass.x, hourglass.y, SPIDER_GOLD); return; }
      // Struck on the belly mid-rear: she shies from the striker and turns on the other.
      rearAt = 0; biteAt = 0; biteReady = now + 1800;
      goal = by === 'player' ? npc : player;
      turnedUntil = by === 'player' ? now + TURN_MS : 0;
      ctx.sfx('screech');
      ctx.flash(hourglass.x, hourglass.y, HOURGLASS);
    },
  });

  function lift(f: Foot, time: number, ahead: number, spread: number, drum: boolean): void {
    const p = rot(FWD[f.k] * spread + ahead, f.side * LAT[f.k] * spread);
    f.fx = f.x; f.fy = f.y;
    f.tx = clamp(p.x, 30, W - 30); f.ty = clamp(p.y, top + 10, H - 16);
    f.liftAt = time; f.landAt = time + (drum ? 950 : LIFT_MS); f.up = true; f.drum = drum;
  }

  function land(f: Foot, time: number): void {
    f.up = false; f.x = f.tx; f.y = f.ty;
    dents.push({ x: f.x, y: f.y, at: time });
    for (const v of [player, npc]) {
      if (!alive(v) || dist(v.x, v.y, f.x, f.y) > FOOT_R + 18) continue;
      if (v === player) { tk.hitPlayer(f.drum ? 16 : 13, f.x, f.y); tk.slowPlayer(0.7, 600); }
      else ctx.hit(npc, f.drum ? 20 : 17, f.x, f.y);
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextStride = time + 1400; }
      if (!drumming && npc.hp < npc.maxHp * 0.5) {
        drumming = true;
        ctx.banner('OLD MARDLE BEGINS TO DRUM', '#ffb0a0');
        ctx.sfx('drum-hit');
      }
      if (goal === npc && time > turnedUntil) goal = player;
      if (!alive(goal)) goal = goal === player ? npc : player;
      // The bite: rear, then the jaws close on whatever is in front.
      if (rearAt > 0 && time >= biteAt) {
        rearAt = 0;
        biteReady = time + 2600;
        ctx.sfx('slash');
        for (const v of [player, npc]) {
          if (!alive(v)) continue;
          const d = dist(sp.x, sp.y, v.x, v.y);
          if (d > 130 || Math.abs(wrapAngle(Math.atan2(v.y - sp.y, v.x - sp.x) - sp.h)) > 0.7) continue;
          if (v === player) { tk.hitPlayer(20, v.x, v.y); ctx.root(player, 450); } else ctx.hit(npc, 26, v.x, v.y);
        }
      }
      const toGoal = Math.atan2(goal.y - sp.y, goal.x - sp.x);
      const dg = dist(sp.x, sp.y, goal.x, goal.y);
      if (rearAt === 0 && time >= biteReady && dg < 120 && Math.abs(wrapAngle(toGoal - sp.h)) < 0.6) {
        rearAt = time; biteAt = time + REAR_MS;
        ctx.sfx('screech');
      }
      // Walking: turn toward the goal and amble on, unless rearing or drumming in place.
      const drumNow = feet.some((f) => f.up && f.drum);
      if (rearAt === 0 && !drumNow) {
        sp.h += clamp(wrapAngle(toGoal - sp.h), -1.3 * dt, 1.3 * dt);
        const v = dg > 70 ? (drumming ? 72 : 62) : 0;
        sp.x = clamp(sp.x + Math.cos(sp.h) * v * dt, 130, W - 130);
        sp.y = clamp(sp.y + Math.sin(sp.h) * v * dt, top + 100, H - 90);
      }
      const ab = abdomen();
      hourglass.moveTo(ab.x, ab.y - (rearing(time) ? 26 : 10));
      // The gait: four feet lift at a time and show where they will land.
      if (time >= nextStride && !drumNow) {
        stride++;
        nextStride = time + STRIDE_MS;
        if (drumming && stride % 5 === 0) {
          for (const f of feet) lift(f, time, 0, 1.12, true);
          nextStride = time + 1250;
          ctx.sfx('drum-hit');
        } else {
          const grp = stride % 2;
          for (const f of feet) if (groupOf(f) === grp && !f.up) lift(f, time, rearAt ? 0 : 44, 1, false);
        }
      }
      for (const f of feet) if (f.up && time >= f.landAt) { land(f, time); if (f.k === 0) ctx.sfx(f.drum ? 'quake' : 'stone-slam'); }
      for (let i = dents.length - 1; i >= 0; i--) if (time - dents[i].at > 1400) dents.splice(i, 1);
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Keep the player between the widow and himself — whichever of them she walks at.
      const a = Math.atan2(player.y - sp.y, player.x - sp.x);
      let x = player.x + Math.cos(a) * 230, y = player.y + Math.sin(a) * 230;
      for (const f of feet) {
        if (!f.up || dist(f.tx, f.ty, x, y) > 70) continue;
        x += -Math.sin(a) * 80; y += Math.cos(a) * 80;
      }
      if (goal === npc) { x += -Math.sin(a) * 60; y += Math.cos(a) * 60; }
      return { x: tk.clampX(x, 60), y: tk.clampY(y, 60) };
    },

    drawGround(g, time) {
      shadow(g, sp.x, sp.y + 14, 190, 70, 0.22);
      for (const d of dents) {
        const k = (time - d.at) / 1400;
        g.fillStyle(0x000000, 0.25 * (1 - k)); g.fillEllipse(d.x, d.y, 34, 13);
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05;
          g.lineStyle(1, SILK_SHADE, 0.7 * (1 - k)); g.lineBetween(d.x + Math.cos(a) * 8, d.y + Math.sin(a) * 3, d.x + Math.cos(a) * 26, d.y + Math.sin(a) * 10);
        }
      }
      // Where each lifted foot will fall: a ring tightening on the silk, and the foot's shadow sharpening.
      for (const f of feet) {
        if (!f.up) continue;
        const k = clamp((time - f.liftAt) / (f.landAt - f.liftAt), 0, 1);
        const r = FOOT_R + 22 * (1 - k);
        g.fillStyle(f.drum ? HOURGLASS : 0x000000, 0.1 + k * 0.2); g.fillEllipse(f.tx, f.ty, r * 2, r * 0.9);
        g.lineStyle(2, f.drum ? HOURGLASS : SPIDER_GOLD, 0.35 + k * 0.5); g.strokeEllipse(f.tx, f.ty, r * 2, r * 0.9);
        g.fillStyle(SPIDER, 0.2 + k * 0.4); g.fillEllipse(f.tx, f.ty, 10 + k * 6, 4 + k * 3);
      }
      // The drover's rein along the floor, from Yarrow's hand to the widow's jaw.
      if (goal === player && alive(npc)) {
        const hd = rot(48, 0);
        g.lineStyle(1, ROPE, 0.5); g.lineBetween(npc.x, npc.y, hd.x, hd.y + 6);
      }
    },

    drawAir(g, time) {
      const rear = rearing(time);
      const rk = rear ? clamp((time - rearAt) / REAR_MS, 0, 1) : 0;
      // Legs, the far side first: hip, a high knee, the foot (in the air if lifted).
      const sorted = [...feet].sort((a, b) => a.y - b.y);
      for (const f of sorted) {
        const hip = rot(FWD[f.k] * 0.3 + 10, f.side * 18);
        let fx = f.x, fy = f.y;
        if (f.up) {
          const k = clamp((time - f.liftAt) / (f.landAt - f.liftAt), 0, 1);
          fx = f.fx + (f.tx - f.fx) * k; fy = f.fy + (f.ty - f.fy) * k - Math.sin(k * Math.PI) * (f.drum ? 60 : 34);
        }
        const kx = hip.x + (fx - hip.x) * 0.55 + (fx - sp.x) * 0.12, ky = Math.min(hip.y, fy) - 52 - rk * 10;
        g.lineStyle(7, SPIDER, 1); g.lineBetween(hip.x, hip.y - 30, kx, ky);
        g.lineStyle(2, SPIDER_LIT, 0.8); g.lineBetween(hip.x, hip.y - 32, kx, ky - 2);
        g.lineStyle(5, SPIDER, 1); g.lineBetween(kx, ky, fx, fy - 4);
        g.fillStyle(SPIDER_GOLD, 1); g.fillCircle(kx, ky, 4);
        g.lineStyle(2, SPIDER_GOLD, 0.8); g.lineBetween(kx + (fx - kx) * 0.6 - 3, ky + (fy - ky) * 0.6, kx + (fx - kx) * 0.6 + 3, ky + (fy - ky) * 0.6);
        g.fillStyle(dim(SPIDER, 0.3), 1); g.fillCircle(fx, fy - 4, 3);
      }
      // The abdomen: glossy black, gold-banded — and when she rears, the belly and its hourglass.
      const ab = abdomen();
      const lift = 30 + rk * 26;
      g.fillStyle(SPIDER, 1); g.fillEllipse(ab.x, ab.y - lift, 92, 74 + rk * 10);
      g.fillStyle(SPIDER_LIT, 1); g.fillEllipse(ab.x - 14, ab.y - lift - 14, 34, 18);
      g.lineStyle(2, SPIDER_GOLD, 0.5); g.strokeEllipse(ab.x, ab.y - lift, 62, 48);
      const hx = ab.x, hy = ab.y - lift + (rear ? 8 : 18);
      const hs = rear ? 1.6 : 0.6;
      g.fillStyle(HOURGLASS, rear ? 1 : 0.5);
      g.fillTriangle(hx - 8 * hs, hy - 9 * hs, hx + 8 * hs, hy - 9 * hs, hx, hy);
      g.fillTriangle(hx - 8 * hs, hy + 9 * hs, hx + 8 * hs, hy + 9 * hs, hx, hy);
      if (rear) glow(g, hx, hy, 34, HOURGLASS, 0.08, 3);
      // Spinnerets and the dragline back to the pens.
      const tail = rot(-84, 0);
      g.lineStyle(1, SILK_LIT, 0.5); g.lineBetween(tail.x, tail.y - 30, tail.x - Math.cos(sp.h) * 80, tail.y - Math.sin(sp.h) * 80 - 10);
      // The head: eight eyes, the jaws (wide open in a rear).
      const hd = rot(20, 0);
      g.fillStyle(SPIDER, 1); g.fillEllipse(hd.x, hd.y - 30 - rk * 12, 58, 46);
      g.fillStyle(SPIDER_LIT, 0.8); g.fillEllipse(hd.x - 8, hd.y - 42 - rk * 12, 20, 10);
      for (let i = 0; i < 8; i++) {
        const row = i < 4 ? 0 : 1, col = (i % 4) - 1.5;
        const e = rot(40 - row * 6, col * 7);
        g.fillStyle(row === 0 && (col === -0.5 || col === 0.5) ? HOURGLASS : 0xf0e0c0, 1);
        g.fillCircle(e.x, e.y - 36 - rk * 12 + row * 5, row === 0 && Math.abs(col) < 1 ? 3.4 : 2);
      }
      const open = rear ? 0.5 + rk * 0.5 : 0.15;
      for (const s of [-1, 1]) {
        const base = rot(46, s * 9), tip = rot(60, s * (9 + open * 14));
        g.lineStyle(5, dim(BONE, 0.3), 1); g.lineBetween(base.x, base.y - 22 - rk * 12, tip.x, tip.y - 14 - rk * 8);
        g.lineStyle(2.5, BONE, 1); g.lineBetween(base.x, base.y - 23 - rk * 12, tip.x, tip.y - 15 - rk * 8);
      }
      // Yarrow's rein, up to the bridle on her head; snapped and trailing while she's turned on him.
      if (alive(npc)) {
        const br = rot(26, 0);
        if (goal === player) {
          g.lineStyle(1.5, ROPE, 0.9); g.lineBetween(npc.x + 8, npc.y - 26, br.x, br.y - 40);
          g.fillStyle(GOLD_THREAD, 1); g.fillCircle(br.x, br.y - 40, 3);
        } else {
          g.lineStyle(1.5, ROPE, 0.7); g.lineBetween(br.x, br.y - 40, br.x - 20, br.y - 4);
          g.lineBetween(npc.x + 8, npc.y - 26, npc.x + 22, npc.y + 4);
        }
      }
    },

    drawHud(g, time) {
      // The gait chart: two rows of four feet, lit while lifted; and the widow's eye on her mark.
      const x = W / 2 - 40, y = top + 18;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 14, y - 15, 108, 30, 6);
      for (const f of feet) {
        const cx = x + f.k * 12, cy = y + (f.side < 0 ? -6 : 6);
        g.fillStyle(f.up ? (f.drum ? HOURGLASS : SPIDER_GOLD) : SPIDER_LIT, 1); g.fillCircle(cx, cy, 3.5);
      }
      const ox = x + 66;
      g.fillStyle(goal === player ? 0xf0e0c0 : HOURGLASS, 1); g.fillEllipse(ox, y, 18, 10);
      g.fillStyle(SPIDER, 1); g.fillCircle(ox, y, 3.5);
      if (goal === npc) {
        const k = clamp((turnedUntil - time) / TURN_MS, 0, 1);
        g.lineStyle(2, HOURGLASS, 1); g.beginPath(); g.arc(ox, y, 11, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },

    destroy() { hourglass.remove(); },
  };
}

export const FALLEN_DROVER: GimmickDef = {
  id: ID,
  rules: 'A great widow walks at you four feet at a time; rings show where they fall. When she rears to bite, strike her hourglass: she turns on her drover.',
  make,
};
