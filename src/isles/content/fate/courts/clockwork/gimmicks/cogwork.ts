import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { gear } from '../art';
import { BRASS, BRASS_LIT, COPPER, IRON_DARK, IRON_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Cogwork Floor — Fitter Ratchet.
 *
 * The floor of Ratchet's fitting shop *is* the mechanism: six great wheels let into the boards in
 * two separate trains, turning slowly. Stand on a wheel and it carries you round with it. Where two
 * wheels mesh, the teeth make a nip — on the side the teeth run *into* the mesh, it draws you in
 * and bites (hurt, held, spat out the far side); on the other side the teeth run apart and it is
 * harmless. Red chevrons show which side of each mesh is biting.
 *
 * Every axle can be struck. Strike one and its whole train reverses — every wheel in it turns the
 * other way, and every nip in it changes sides. Ratchet throws the ratchet lever every few
 * seconds and the floor jumps a click at three times the speed. Carry your foe into a bite by
 * reversing the train they stand on; never stand by a mesh you have not read.
 */

interface Wheel { x: number; y: number; r: number; teeth: number; train: number; parity: number; turn: number; axle: StrikeTarget | null }
interface Mesh { a: Wheel; b: Wheel; cx: number; cy: number }

/** Tangential speed at every rim (px/s): meshed wheels share it. */
const RIM_V = 46;
const NIP_R = 34;
const BITE_R = 22;
const BITE_DMG = 9;
const BITE_STUN = 420;
const RATCHET_EVERY = 6200;
const RATCHET_MS = 700;
const REVERSE_CD = 1600;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  // Two trains of three, laid out so each wheel touches only its train-mates.
  const wheels: Wheel[] = [];
  const add = (x: number, y: number, r: number, train: number, parity: number) =>
    wheels.push({ x, y, r, teeth: Math.round(r / 7), train, parity, turn: 0, axle: null });
  const chain = (x: number, y: number, r: number, specs: [number, number][], train: number) => {
    add(x, y, r, train, 1);
    let px = x, py = y, pr = r, par = 1;
    for (const [deg, nr] of specs) {
      const a = (deg * Math.PI) / 180;
      px += Math.cos(a) * (pr + nr); py += Math.sin(a) * (pr + nr); pr = nr; par = -par;
      add(px, py, nr, train, par);
    }
  };
  chain(190, top + 150, 100, [[60, 90], [-10, 110]], 0);
  chain(W - 240, top + 134, 95, [[60, 118], [140, 88]], 1);
  const meshes: Mesh[] = [];
  for (let i = 0; i < wheels.length; i++) {
    for (let j = i + 1; j < wheels.length; j++) {
      const a = wheels[i], b = wheels[j];
      if (Math.abs(dist(a.x, a.y, b.x, b.y) - (a.r + b.r)) < 3) {
        const k = a.r / (a.r + b.r);
        meshes.push({ a, b, cx: a.x + (b.x - a.x) * k, cy: a.y + (b.y - a.y) * k });
      }
    }
  }
  /** Each train's direction: +1 or −1, flipped by striking an axle. */
  const trainDir = [1, -1];
  const flippedAt = [-9999, -9999];
  const flipFx: { x: number; y: number; at: number }[] = [];
  const bitAt = new Map<Fighter, number>();
  let nextRatchet = 0;
  let ratchetUntil = 0;
  let ratchetWarn = false;
  let started = false;

  const mult = (time: number) => (time < ratchetUntil ? 3 : 1) * (ctx.hard ? 1.25 : 1);
  /** Angular speed of a wheel, rad/s (positive = clockwise on screen). */
  const omega = (w: Wheel, time: number) => (trainDir[w.train] * w.parity * RIM_V * mult(time)) / w.r;
  const wheelUnder = (x: number, y: number) => wheels.find((w) => dist(w.x, w.y, x, y) < w.r - 4) ?? null;
  /** The upstream side of a mesh: where the teeth run in. */
  const nipPoint = (m: Mesh, time: number): Pt => {
    const w = omega(m.a, time);
    const rx = m.cx - m.a.x, ry = m.cy - m.a.y;
    let vx = -w * ry, vy = w * rx;
    const v = Math.hypot(vx, vy) || 1;
    vx /= v; vy /= v;
    return { x: m.cx - vx * 26, y: m.cy - vy * 26 };
  };

  function reverse(train: number, time: number, by: string): void {
    if (time - flippedAt[train] < REVERSE_CD) return;
    flippedAt[train] = time;
    trainDir[train] = -trainDir[train];
    for (const w of wheels) if (w.train === train) flipFx.push({ x: w.x, y: w.y, at: time });
    ctx.sfx('gear-turn');
    const w0 = wheels.find((w) => w.train === train);
    if (w0) ctx.float(w0.x, w0.y - w0.r - 10, by === 'player' ? 'REVERSED!' : 'RATCHET REVERSES IT', '#f0d58a');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextRatchet = time + RATCHET_EVERY;
        for (const w of wheels) {
          const train = w.train;
          w.axle = ctx.target({ x: w.x, y: w.y, r: 22, passThrough: true, onStruck: (by) => reverse(train, ctx.scene.time.now, by) });
        }
      }
      for (const w of wheels) w.turn += omega(w, time) * dt;

      // Ratchet's lever.
      if (!ratchetWarn && time >= nextRatchet - 900) { ratchetWarn = true; ctx.banner('RATCHET THROWS THE LEVER', '#f0d58a'); ctx.sfx('reload'); }
      if (time >= nextRatchet) {
        nextRatchet = time + (ctx.hard ? RATCHET_EVERY * 0.8 : RATCHET_EVERY);
        ratchetUntil = time + RATCHET_MS;
        ratchetWarn = false;
        ctx.sfx('clang');
      }

      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        // Carried round on a wheel.
        const w = wheelUnder(f.x, f.y);
        if (w) {
          const om = omega(w, time);
          ctx.nudge(f, -om * (f.y - w.y) * dt, om * (f.x - w.x) * dt);
        }
        // Drawn into a biting nip.
        if (time - (bitAt.get(f) ?? -9999) < 900) continue;
        for (const m of meshes) {
          const n = nipPoint(m, time);
          const d = dist(n.x, n.y, f.x, f.y);
          if (d > NIP_R + 12) continue;
          const a = Math.atan2(m.cy - f.y, m.cx - f.x);
          ctx.nudge(f, Math.cos(a) * 130 * dt, Math.sin(a) * 130 * dt);
          if (dist(m.cx, m.cy, f.x, f.y) < BITE_R + 6 || d < BITE_R) {
            bitAt.set(f, time);
            ctx.hit(f, BITE_DMG, m.cx, m.cy);
            ctx.stun(f, BITE_STUN);
            // Spat out the far side, where the teeth run apart.
            const ox = m.cx - n.x, oy = m.cy - n.y, ol = Math.hypot(ox, oy) || 1;
            ctx.nudge(f, (ox / ol) * 64, (oy / ol) * 64);
            ctx.float(f.x, f.y - 46, 'BITTEN', '#ff9a7a');
            ctx.sfx('trap-snap');
            break;
          }
        }
      }
      for (let i = flipFx.length - 1; i >= 0; i--) if (time - flipFx[i].at > 600) flipFx.splice(i, 1);
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const time = ctx.scene.time.now;
      // Reverse the player's wheel if it is carrying them away from a bite and the axle is fresh.
      const pw = wheelUnder(player.x, player.y);
      if (pw && time - flippedAt[pw.train] > REVERSE_CD) {
        const om = omega(pw, time);
        const vx = -om * (player.y - pw.y), vy = om * (player.x - pw.x);
        const toward = meshes.filter((m) => m.a === pw || m.b === pw).some((m) => {
          const n = nipPoint(m, time);
          return (n.x - player.x) * vx + (n.y - player.y) * vy > 0;
        });
        if (!toward) return { x: pw.x + 30, y: pw.y + 30 };
      }
      // Otherwise keep off the wheels' rims and away from every nip, near the player.
      let best: Pt | null = null, bs = -Infinity;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const x = clamp(player.x + Math.cos(a) * 200, 60, W - 60), y = clamp(player.y + Math.sin(a) * 180, top + 50, H - 50);
        let score = -dist(x, y, npc.x, npc.y) * 0.25;
        for (const m of meshes) { const n = nipPoint(m, time); if (dist(n.x, n.y, x, y) < 90) score -= 500; }
        if (score > bs) { bs = score; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // Pits the wheels sit in, then the wheels.
      for (const w of wheels) { g.fillStyle(0x0c0a08, 0.8); g.fillCircle(w.x, w.y, w.r + 6); }
      for (const w of wheels) {
        gear(g, w.x, w.y, w.r, w.teeth, w.turn, w.train ? COPPER : BRASS, 1, 6);
        // Direction arrows round the rim.
        const dir = Math.sign(omega(w, time));
        for (let k = 0; k < 3; k++) {
          const a = w.turn + (k / 3) * Math.PI * 2;
          const rr = w.r * 0.62;
          const x = w.x + Math.cos(a) * rr, y = w.y + Math.sin(a) * rr;
          const tx = -Math.sin(a) * dir, ty = Math.cos(a) * dir;
          g.fillStyle(lit(w.train ? COPPER : BRASS, 0.45), 0.8);
          g.fillTriangle(x + tx * 8, y + ty * 8, x - ty * 5, y + tx * 5, x + ty * 5, y - tx * 5);
        }
      }
      // The axles: struck-able caps, flaring when a train reverses.
      for (const w of wheels) {
        const fresh = time - flippedAt[w.train] > REVERSE_CD;
        g.fillStyle(IRON_DARK, 1); g.fillCircle(w.x, w.y, 13);
        g.fillStyle(fresh ? IRON_LIT : dim(IRON_LIT, 0.4), 1); g.fillCircle(w.x, w.y, 10);
        g.lineStyle(2, fresh ? BRASS_LIT : IRON_DARK, 0.9); g.strokeCircle(w.x, w.y, 16 + (fresh ? Math.sin(time / 200) * 2 : 0));
        g.fillStyle(IRON_DARK, 1); g.fillRect(w.x - 6, w.y - 1.5, 12, 3);
      }
      // The nips: red chevrons on the biting side of each mesh, green ticks on the safe side.
      for (const m of meshes) {
        const n = nipPoint(m, time);
        const ux = (m.cx - n.x) / 26, uy = (m.cy - n.y) / 26;
        const pulse = 0.55 + Math.sin(time / 120) * 0.25;
        g.fillStyle(0xff3a2a, 0.16); g.fillCircle(n.x, n.y, NIP_R);
        for (let k = 0; k < 3; k++) {
          const cx = n.x - ux * (k * 12 - 4), cy = n.y - uy * (k * 12 - 4);
          g.lineStyle(3, 0xff4a3a, pulse - k * 0.12);
          g.lineBetween(cx - uy * 9 - ux * 6, cy + ux * 9 - uy * 6, cx, cy);
          g.lineBetween(cx + uy * 9 - ux * 6, cy - ux * 9 - uy * 6, cx, cy);
        }
        g.fillStyle(0x7ad08a, 0.25); g.fillCircle(m.cx + ux * 26, m.cy + uy * 26, 10);
      }
    },

    drawAir(g, time) {
      for (const fx of flipFx) {
        const k = (time - fx.at) / 600;
        g.lineStyle(4 * (1 - k), BRASS_LIT, 1 - k); g.strokeCircle(fx.x, fx.y, 20 + k * 60);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + k * 3; g.fillStyle(BRASS_LIT, 1 - k); g.fillCircle(fx.x + Math.cos(a) * (20 + k * 50), fx.y + Math.sin(a) * (20 + k * 50), 2.5); }
      }
      // The lever on the foe's side of the shop: thrown while the floor races.
      const lx = W - 60, ly = H - 70;
      const thrown = time < ratchetUntil;
      g.fillStyle(IRON_DARK, 1); g.fillRect(lx - 16, ly - 6, 32, 14);
      const la = thrown ? 0.7 : -0.5;
      g.lineStyle(5, IRON_LIT, 1); g.lineBetween(lx, ly, lx + Math.sin(la) * 40, ly - Math.cos(la) * 40);
      g.fillStyle(0xc8202c, 1); g.fillCircle(lx + Math.sin(la) * 40, ly - Math.cos(la) * 40, 6);
      if (thrown) {
        for (const w of wheels) { g.lineStyle(2, BRASS_LIT, 0.25); g.strokeCircle(w.x, w.y, w.r + 4); }
      }
    },

    destroy() { for (const w of wheels) w.axle?.remove(); },
  };
}

export const COGWORK: GimmickDef = {
  id: 'clockwork-cogwork',
  rules: 'The floor is turning gears that carry you. Red chevrons mark where meshing teeth bite. Strike an axle to reverse its whole train.',
  make,
};
