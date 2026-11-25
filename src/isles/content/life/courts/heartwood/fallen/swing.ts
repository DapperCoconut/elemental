import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { HW, alive, angDiff, clamp, dist, sapLantern } from '../palette';

/**
 * The Turning Swing — Rowley Wick, Lamplighter of the Lantern Ledge. In the true world he lit
 * the Great Sap Lantern at dusk so the climbers could find their knots. In the star's telling he
 * hung it lower on the nights the pruners came, so they could read the white rings by its light.
 *
 * The lantern hangs on a long chain from a bough far overhead and swings through the middle of
 * the ledge: fast through the centre, slow at the ends, along a chalked line. The line of the
 * swing turns slowly round the pivot, the way a long pendulum's does, so the safe ground moves.
 * At every turn of the swing a gout of burning sap drips from it and pools where it paused.
 *
 * Strike the lantern and it is shoved: its next pass through the centre comes along a new line,
 * laid straight through whoever the striker is fighting — painted red the moment it is struck,
 * so whoever stands on it has time to step off. Past half health the chain is let out: the
 * swing grows longer and its line turns the other way, twice as fast.
 */

const ID = fallenId('heartwood', 'swing');
const BOB_R = 26;
const OMEGA = (Math.PI * 2) / 2.6;
const KICK_CD = 2600;

interface Pool { x: number; y: number; at: number; until: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const px = W / 2, py = (top + H) / 2;
  let theta = 0.35;
  let phi = 0;
  let amp = 250;
  let prec = 0.17;
  let long = false;
  let pending: { theta: number; at: number; by: 'player' | 'npc' } | null = null;
  let kickAt = -1e9;
  let pools: Pool[] = [];
  let now = 0;
  let lastCos = 1;
  const rehit = new Map<Fighter, number>();
  const burn = new Map<Fighter, number>();

  /** The swing's reach along a direction, held inside the yard. */
  const reach = (th: number): number => {
    const cx = Math.abs(Math.cos(th)), sy = Math.abs(Math.sin(th));
    return Math.min(amp, cx > 0.01 ? (W / 2 - 40) / cx : 1e9, sy > 0.01 ? ((H - top) / 2 - 30) / sy : 1e9);
  };
  const bob = (): { x: number; y: number } => {
    const r = reach(theta) * Math.sin(phi);
    return { x: px + Math.cos(theta) * r, y: py + Math.sin(theta) * r };
  };
  /** Distance from the line of the swing (an infinite line through the pivot at angle th). */
  const offLine = (th: number, x: number, y: number): number => Math.abs((x - px) * -Math.sin(th) + (y - py) * Math.cos(th));
  const hurt = (f: Fighter, n: number, x: number, y: number): void => {
    if (f === ctx.player) tk.hitPlayer(n, x, y);
    else ctx.hit(f, n * 1.25, x, y);
  };

  const b0 = bob();
  const tgt: StrikeTarget = ctx.target({
    x: b0.x, y: b0.y, r: BOB_R,
    onStruck: (by) => {
      if (now - kickAt < KICK_CD) return;
      kickAt = now;
      const foe = by === 'player' ? ctx.npc : ctx.player;
      let th = Math.atan2(foe.y - py, foe.x - px);
      if (Math.abs(angDiff(th, theta)) > Math.PI / 2) th += Math.PI;
      pending = { theta: th, at: now + tk.warn(900), by };
      amp = Math.min(long ? 360 : 300, amp + 25);
      ctx.sfx('chain');
      ctx.float(tgt.x, tgt.y - 40, 'SHOVED', '#ffd76e');
    },
  });

  return {
    update(time, dtIn) {
      const dt = Math.min(0.05, dtIn);
      now = time;
      if (!long && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        long = true;
        amp = Math.max(amp, 320);
        prec = -0.32;
        ctx.banner('THE CHAIN IS LET OUT', '#ffd76e');
        ctx.sfx('chain');
      }
      const prevSin = Math.sin(phi);
      phi += OMEGA * dt;
      theta += prec * dt;
      // A shove lands as the lantern crosses the centre, so it never jumps.
      if (pending && time >= pending.at && Math.sign(Math.sin(phi)) !== Math.sign(prevSin)) {
        theta = pending.theta;
        pending = null;
        ctx.sfx('whoosh');
      }
      const c = Math.cos(phi);
      const p = bob();
      tgt.moveTo(p.x, p.y);
      // A turn of the swing: the lantern pauses and drips burning sap.
      if (Math.sign(c) !== Math.sign(lastCos)) {
        pools.push({ x: p.x, y: p.y + 6, at: time, until: time + 5200 });
        if (pools.length > 8) pools.shift();
        ctx.sfx('sizzle');
      }
      lastCos = c;
      const vx = Math.cos(theta) * c, vy = Math.sin(theta) * c;
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f)) continue;
        if (dist(f.x, f.y, p.x, p.y) < BOB_R + 22 && time >= (rehit.get(f) ?? 0)) {
          rehit.set(f, time + 800);
          hurt(f, 14, f.x, f.y);
          ctx.nudge(f, vx * 60, vy * 60);
          ctx.sfx('hit-heavy');
        }
        if (time >= (burn.get(f) ?? 0) && pools.some((q) => time < q.until && dist(f.x, f.y, q.x, q.y) < 36)) {
          burn.set(f, time + 520);
          hurt(f, 5, f.x, f.y);
          ctx.sfx('status-burn');
        }
      }
      pools = pools.filter((q) => time < q.until);
    },

    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      const lines = [theta, ...(pending ? [pending.theta] : [])];
      // Off any line it stands on, the short way; on the turning line, away from where it turns.
      for (const th of lines) {
        if (offLine(th, n.x, n.y) > 100) continue;
        const side = (n.x - px) * -Math.sin(th) + (n.y - py) * Math.cos(th) >= 0 ? 1 : -1;
        const along = (n.x - px) * Math.cos(th) + (n.y - py) * Math.sin(th);
        const turning = th === theta && offLine(th, n.x, n.y) < 40 ? -Math.sign(prec * along) || side : side;
        const d = 150 * turning;
        return { x: tk.clampX(px + Math.cos(th) * along - Math.sin(th) * d), y: tk.clampY(py + Math.sin(th) * along + Math.cos(th) * d) };
      }
      // Kick ready and the player off the line: wait just past an end of the swing to strike it.
      if (now - kickAt > KICK_CD && offLine(theta, p.x, p.y) > 80) {
        const r = reach(theta) + 30;
        const s = (n.x - px) * Math.cos(theta) + (n.y - py) * Math.sin(theta) >= 0 ? 1 : -1;
        return { x: tk.clampX(px + Math.cos(theta) * r * s), y: tk.clampY(py + Math.sin(theta) * r * s) };
      }
      return null;
    },

    drawGround(g, time) {
      // Burning sap where the lantern paused.
      for (const q of pools) {
        const k = clamp((q.until - time) / 5200, 0, 1);
        const fresh = clamp((time - q.at) / 300, 0, 1);
        g.fillStyle(HW.amberDeep, 0.55 * k); g.fillEllipse(q.x, q.y, 76 * fresh, 34 * fresh);
        g.fillStyle(HW.amber, 0.7 * k); g.fillEllipse(q.x - 4, q.y - 2, 54 * fresh, 22 * fresh);
        for (let i = 0; i < 4; i++) {
          const fx = q.x - 22 + i * 15, fl = 8 + 6 * Math.sin(time / 90 + i * 1.7);
          g.fillStyle(HW.amberLit, 0.75 * k); g.fillTriangle(fx - 4, q.y, fx + 4, q.y, fx, q.y - fl);
        }
      }
      // The chalked line of the swing, with tick marks where it turns; the shove's new line in red.
      drawLine(g, theta, reach(theta), HW.whitewash, 0.4);
      if (pending) drawLine(g, pending.theta, reach(pending.theta), 0xd8262a, 0.55 + 0.35 * Math.sin(time / 70));
      // The pivot, painted on the floor as a brass rose under the chain's anchor.
      g.fillStyle(HW.plankDark, 0.9); g.fillCircle(px, py, 16);
      g.lineStyle(2, HW.amberDeep, 1); g.strokeCircle(px, py, 16);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.lineStyle(1.5, HW.amberLit, 0.8); g.lineBetween(px + Math.cos(a) * 5, py + Math.sin(a) * 5, px + Math.cos(a) * 14, py + Math.sin(a) * 14);
      }
      const p = bob();
      shadow(g, p.x, p.y + 30, 50, 16, 0.4);
    },

    drawAir(g, time) {
      const p = bob();
      // The chain climbs toward the bough overhead, out of sight above the ledge.
      const ax = px + (p.x - px) * 0.15, ay = top - 40;
      for (let i = 0; i < 14; i++) {
        const k = i / 14;
        const x = p.x + (ax - p.x) * k, y = p.y - 34 + (ay - p.y + 34) * k;
        g.lineStyle(2.4, HW.iron, 1 - k * 0.6);
        if (i % 2) g.strokeEllipse(x, y, 5, 8); else g.strokeEllipse(x, y, 7, 4);
      }
      glow(g, p.x, p.y, 70, HW.amberLit, 0.05, 4);
      sapLantern(g, p.x, p.y - 36, 34);
      // Drips trailing off the lantern's base as it slows into a turn.
      const slow = 1 - Math.abs(Math.cos(phi));
      if (slow > 0.7) for (let i = 0; i < 3; i++) {
        g.fillStyle(HW.amber, 0.8); g.fillCircle(p.x - 6 + i * 6, p.y + 14 + ((time / 6 + i * 9) % 18), 2.2);
      }
    },

    drawHud(g, time) {
      // The shove: a lantern pip that fills as the chain settles again, gold when ready.
      const k = clamp((now - kickAt) / KICK_CD, 0, 1);
      const x = W / 2, y = H - 26;
      g.fillStyle(HW.iron, 0.8); g.fillRoundedRect(x - 70, y - 14, 140, 28, 8);
      g.fillStyle(HW.plankDark, 1); g.fillRect(x - 50, y - 4, 100, 8);
      g.fillStyle(k >= 1 ? HW.amberLit : HW.amberDeep, 1); g.fillRect(x - 50, y - 4, 100 * k, 8);
      g.fillStyle(k >= 1 && Math.sin(time / 200) > 0 ? HW.amberHot : HW.amber, 1); g.fillCircle(x - 60, y, 6);
      g.lineStyle(1.5, long ? 0xd8262a : HW.ironLit, 0.9); g.strokeRoundedRect(x - 70, y - 14, 140, 28, 8);
    },

    destroy() { tgt.remove(); pools = []; },
  };

  function drawLine(g: G, th: number, r: number, color: number, a: number): void {
    const ux = Math.cos(th), uy = Math.sin(th), nx = -uy, ny = ux;
    for (let d = -r; d < r; d += 22) {
      g.lineStyle(3, color, a);
      g.lineBetween(px + ux * d, py + uy * d, px + ux * Math.min(r, d + 12), py + uy * Math.min(r, d + 12));
    }
    for (const s of [-1, 1]) {
      const ex = px + ux * r * s, ey = py + uy * r * s;
      g.lineStyle(2, color, a); g.lineBetween(ex + nx * 18, ey + ny * 18, ex - nx * 18, ey - ny * 18);
      g.lineBetween(ex + nx * 18 + ux * s * 6, ey + ny * 18 + uy * s * 6, ex + nx * 18, ey + ny * 18);
    }
  }
}

export const FALLEN_SWING: GimmickDef = {
  id: ID,
  rules: 'The lantern swings along a turning line and drips burning sap where it turns. Strike it and its next pass is laid through your foe.',
  make,
};
