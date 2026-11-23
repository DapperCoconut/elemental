import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CANVAS, CANVAS_SHADE, FOE_TINT, HEMP, IRON, OAK, OAK_DARK, PINE, PLAYER_TINT, QUEEN, RED_THREAD, TAR, cleat, dist,
  rope, sag, segDist,
} from '../art';

/**
 * Shrouds and Stays — Topman Jory Lanyard, the rigging yard's best.
 *
 * Three training masts stand in the rigging yard, each held up by two stays run down to iron
 * deck-plates. Stand at a mast's foot a moment and you go up the ratlines: aloft for a few
 * seconds, where nothing on the floor can touch you, though you can still fight. In the star's
 * telling Lanyard was the rigger the Queen bought with a captain's coat, and he fights from the
 * crosstrees: while he is aloft he lays a musket on the stranger — a red sight-line, then the shot.
 *
 * Every stay plate is a thing to strike. Cut one and the mast leans; cut both and it comes down
 * along its fall line (a shadow strip on the floor) — on anyone under it, and on whoever is up
 * it, who rides it down to the boards. That is the exploit: wait for him to climb, cut his stays.
 * Below half he starts shooting the stays away himself, dropping masts toward the stranger.
 */

const ID = fallenId('sailmaker', 'shrouds-and-stays');
const MAST_H = 132;
const STAY_SPAN = 118;
const CLIMB_MS = 600;
const ALOFT_MS = 2600;
const CLIMB_COOLDOWN_MS = 4800;
const FOOT_R = 36;
const FALL_WARN_MS = 950;
const FALL_LEN = 240;
const FALL_HALF = 26;
const RESTEP_MS = 6500;
const SIGHT_MS = 620;
const SHOT_GAP_MS = 950;
const CUT_AWAY_GAP_MS = 6500;
const CUT_AWAY_SIGHT_MS = 800;

type MastState = 'up' | 'falling' | 'down';
interface Mast {
  foot: Pt; axis: number; anchors: [Pt, Pt]; stays: [boolean, boolean]; plates: [StrikeTarget | null, StrikeTarget | null];
  state: MastState; at: number; dir: number; occupant: Fighter | null; aloftUntil: number; struck: Set<Fighter>;
}
interface Sight { from: Pt; to: Pt; at: number; ms: number; fire: () => void }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const field = H - top;
  const spec: [number, number, number][] = [[0.22, 0.36, 0.25], [0.78, 0.36, -0.25], [0.5, 0.8, 0.0]];
  const masts: Mast[] = spec.map(([fx, fy, axis]) => {
    const foot = { x: W * fx, y: top + field * fy };
    const ux = Math.cos(axis), uy = Math.sin(axis);
    return {
      foot, axis,
      anchors: [{ x: foot.x - ux * STAY_SPAN, y: foot.y - uy * STAY_SPAN + 26 }, { x: foot.x + ux * STAY_SPAN, y: foot.y + uy * STAY_SPAN + 26 }],
      stays: [true, true], plates: [null, null], state: 'up', at: 0, dir: 0, occupant: null, aloftUntil: 0, struck: new Set(),
    };
  });
  const standAt = new Map<Fighter, { mast: Mast; since: number }>();
  const climbReady = new Map<Fighter, number>();
  let sights: Sight[] = [];
  let nextShotAt = 0;
  let cutAway = false;
  let nextCutAwayAt = 0;
  let announced = false;

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;

  const cutStay = (m: Mast, i: 0 | 1): void => {
    if (m.state !== 'up' || !m.stays[i]) return;
    m.stays[i] = false;
    m.plates[i]?.remove(); m.plates[i] = null;
    ctx.sfx('snap-back');
    if (!m.stays[0] && !m.stays[1]) {
      // It falls away from the last plate cut.
      const a = m.anchors[i];
      m.dir = Math.atan2(m.foot.y - a.y, m.foot.x - a.x);
      m.state = 'falling';
      m.at = Math.max(ctx.scene.time.now + FALL_WARN_MS, m.occupant ? m.aloftUntil + 40 : 0);
      ctx.sfx('gear-turn');
    }
  };

  const rig = (m: Mast): void => {
    m.stays = [true, true]; m.state = 'up'; m.struck = new Set();
    for (const i of [0, 1] as const) {
      const a = m.anchors[i];
      m.plates[i] = ctx.target({ x: a.x, y: a.y - 6, r: 18, passThrough: true, onStruck: () => cutStay(m, i) });
    }
  };
  for (const m of masts) rig(m);

  const fall = (m: Mast): void => {
    m.state = 'down'; m.at = ctx.scene.time.now;
    ctx.sfx('quake'); ctx.scene.cameras.main.shake(160, 0.006);
    const ex = m.foot.x + Math.cos(m.dir) * FALL_LEN, ey = m.foot.y + Math.sin(m.dir) * FALL_LEN;
    for (const f of [ctx.player, ctx.npc]) {
      if (!alive(f)) continue;
      const rode = m.occupant === f;
      if (!rode && segDist(f.x, f.y + 10, m.foot.x, m.foot.y, ex, ey) > FALL_HALF + 20) continue;
      if (f === ctx.player) { tk.hitPlayer(rode ? 22 : 26, f.x, f.y); ctx.stun(f, rode ? 900 : 700); }
      else { ctx.hit(f, Math.max(30, f.maxHp * (rode ? 0.12 : 0.1)), f.x, f.y); ctx.stun(f, rode ? 1400 : 1100); }
      m.struck.add(f);
      if (rode) ctx.banner(f === ctx.player ? 'YOU RODE IT DOWN' : 'LANYARD RIDES IT DOWN', f === ctx.player ? '#ff9a7a' : '#9df5c8');
    }
    m.occupant = null;
  };

  const climb = (f: Fighter, m: Mast, time: number): void => {
    ctx.nudge(f, m.foot.x - f.x, m.foot.y - 4 - f.y);
    ctx.root(f, ALOFT_MS); ctx.airborne(f, ALOFT_MS);
    m.occupant = f; m.aloftUntil = time + ALOFT_MS;
    climbReady.set(f, time + ALOFT_MS + CLIMB_COOLDOWN_MS);
    ctx.sfx('whoosh');
    if (f === ctx.npc) nextShotAt = time + 250;
  };

  const sight = (from: Pt, to: Pt, ms: number, fire: () => void): void => {
    sights.push({ from, to, at: ctx.scene.time.now, ms, fire });
    ctx.sfx('reload');
  };

  return {
    update(time) {
      if (!announced) { announced = true; ctx.banner('MIND THE STAYS', '#e8d8c0'); }
      if (!cutAway && ctx.npc.hp < ctx.npc.maxHp * 0.5) { cutAway = true; nextCutAwayAt = time + 1500; ctx.banner('CUT AWAY!', '#ff9a7a'); ctx.sfx('boss-phase'); }

      for (const m of masts) {
        if (m.occupant && time >= m.aloftUntil) m.occupant = null;
        if (m.state === 'falling' && time >= m.at) fall(m);
        if (m.state === 'down' && time - m.at > RESTEP_MS) { rig(m); ctx.sfx('hammer-forge'); }
      }

      // Climbing: a moment at the foot of a standing, empty mast.
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f) || masts.some((m) => m.occupant === f)) { standAt.delete(f); continue; }
        const m = masts.find((q) => q.state === 'up' && !q.occupant && dist(f.x, f.y + 10, q.foot.x, q.foot.y) < FOOT_R);
        if (!m || time < (climbReady.get(f) ?? 0)) { standAt.delete(f); continue; }
        const s = standAt.get(f);
        if (!s || s.mast !== m) standAt.set(f, { mast: m, since: time });
        else if (time - s.since >= CLIMB_MS) { standAt.delete(f); climb(f, m, time); }
      }

      // Lanyard at the crosstrees lays his musket on the stranger.
      const up = masts.find((m) => m.occupant === ctx.npc);
      if (up && time >= nextShotAt && alive(ctx.player)) {
        nextShotAt = time + SHOT_GAP_MS;
        const from = { x: up.foot.x, y: up.foot.y - 8 };
        const to = { x: ctx.player.x, y: ctx.player.y };
        sight(from, to, SIGHT_MS, () => {
          tk.spawnBullet({ x: from.x, y: from.y, angle: Math.atan2(to.y - from.y, to.x - from.x), speed: 560, damage: 12, r: 5, color: 0xffd27a });
          ctx.sfx('musket');
        });
      }

      // Cut away: he shoots out a stay so a mast drops toward the stranger.
      if (cutAway && time >= nextCutAwayAt && alive(ctx.player)) {
        nextCutAwayAt = time + CUT_AWAY_GAP_MS;
        const p = ctx.player;
        let best: { m: Mast; i: 0 | 1 } | null = null, bestD = Infinity;
        for (const m of masts) {
          if (m.state !== 'up' || m.occupant === ctx.npc) continue;
          for (const i of [0, 1] as const) {
            if (!m.stays[i]) continue;
            const a = m.anchors[i];
            const dir = Math.atan2(m.foot.y - a.y, m.foot.x - a.x);
            const d = segDist(p.x, p.y, m.foot.x, m.foot.y, m.foot.x + Math.cos(dir) * FALL_LEN, m.foot.y + Math.sin(dir) * FALL_LEN);
            if (d < bestD) { bestD = d; best = { m, i }; }
          }
        }
        if (best) {
          const { m, i } = best;
          const other = m.stays[i === 0 ? 1 : 0];
          sight({ x: ctx.npc.x, y: ctx.npc.y - 10 }, m.anchors[i], CUT_AWAY_SIGHT_MS, () => {
            // Cutting the far stay first means the near one, cut next, drops it on the stranger.
            if (other) cutStay(m, i === 0 ? 1 : 0); else cutStay(m, i);
            ctx.sfx('musket');
          });
        }
      }

      for (const s of sights) if (time - s.at >= s.ms) s.fire();
      sights = sights.filter((s) => time - s.at < s.ms);
    },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player, now = ctx.scene.time.now;
      // Never stand in a fall line.
      for (const m of masts) {
        if (m.state !== 'falling') continue;
        const ex = m.foot.x + Math.cos(m.dir) * FALL_LEN, ey = m.foot.y + Math.sin(m.dir) * FALL_LEN;
        if (segDist(n.x, n.y + 10, m.foot.x, m.foot.y, ex, ey) < FALL_HALF + 50) {
          return { x: n.x - Math.sin(m.dir) * 100, y: n.y + Math.cos(m.dir) * 100 };
        }
      }
      // The stranger is aloft: go and cut their stays.
      const theirs = masts.find((m) => m.occupant === p && m.state === 'up');
      if (theirs) {
        if (theirs.stays[0]) return theirs.anchors[0];
        if (theirs.stays[1]) return theirs.anchors[1];
      }
      // Go aloft when a mast is free and the stranger is not standing under it.
      if (now >= (climbReady.get(n) ?? 0)) {
        let best: Mast | null = null, bestD = Infinity;
        for (const m of masts) {
          if (m.state !== 'up' || m.occupant || dist(p.x, p.y, m.foot.x, m.foot.y) < 170 || !m.stays[0] || !m.stays[1]) continue;
          const d = dist(n.x, n.y, m.foot.x, m.foot.y);
          if (d < bestD) { bestD = d; best = m; }
        }
        if (best && bestD < 420) return { x: best.foot.x, y: best.foot.y - 10 };
      }
      return null;
    },

    drawGround(g, time) {
      for (const m of masts) {
        // Iron stay-plates bolted to the boards.
        for (const i of [0, 1] as const) {
          const a = m.anchors[i];
          g.fillStyle(dim(IRON, 0.4), 1); g.fillRoundedRect(a.x - 13, a.y - 6, 26, 12, 3);
          g.fillStyle(m.stays[i] && m.state === 'up' ? IRON : dim(IRON, 0.2), 1); g.fillRoundedRect(a.x - 11, a.y - 5, 22, 9, 3);
          for (const bx of [-7, 7]) { g.fillStyle(lit(IRON, 0.4), 1); g.fillCircle(a.x + bx, a.y - 1, 1.6); }
          if (m.stays[i] && m.state === 'up') { g.lineStyle(2, RED_THREAD, 0.35 + 0.25 * Math.sin(time / 200 + i)); g.strokeCircle(a.x, a.y - 2, 20); }
        }
        // The foot: a step with a ratline net leading up, and a climb ring.
        cleat(g, m.foot.x, m.foot.y + 18, 9);
        if (m.state === 'up' && !m.occupant) {
          const s = [...standAt.values()].find((q) => q.mast === m);
          g.lineStyle(2, PINE, 0.5); g.strokeCircle(m.foot.x, m.foot.y, FOOT_R);
          if (s) { g.lineStyle(3, PINE, 0.95); g.beginPath(); g.arc(m.foot.x, m.foot.y, FOOT_R, -Math.PI / 2, -Math.PI / 2 + Math.min(1, (time - s.since) / CLIMB_MS) * Math.PI * 2); g.strokePath(); }
        }
        if (m.state === 'falling') {
          // The shadow of the spar sweeping down onto its fall line.
          const k = Math.max(0, 1 - (m.at - time) / FALL_WARN_MS);
          const ex = m.foot.x + Math.cos(m.dir) * FALL_LEN, ey = m.foot.y + Math.sin(m.dir) * FALL_LEN;
          g.lineStyle(FALL_HALF * 2, 0x000000, 0.12 + k * 0.2); g.lineBetween(m.foot.x, m.foot.y, ex, ey);
          g.lineStyle(2, RED_THREAD, 0.5 + k * 0.4); g.strokeCircle(ex, ey, 14 + 6 * Math.sin(time / 60));
          const bx = m.foot.x + Math.cos(m.dir) * FALL_LEN * k, by = m.foot.y + Math.sin(m.dir) * FALL_LEN * k;
          g.fillStyle(RED_THREAD, 0.4); g.fillCircle(bx, by, 6);
        }
        if (m.state === 'down') {
          // The spar lying across the boards in a tangle of its own sail.
          const ex = m.foot.x + Math.cos(m.dir) * FALL_LEN, ey = m.foot.y + Math.sin(m.dir) * FALL_LEN;
          const fade = Math.min(1, (RESTEP_MS - (time - m.at)) / 400);
          shadow(g, (m.foot.x + ex) / 2, (m.foot.y + ey) / 2 + 6, FALL_LEN, 20, 0.3 * fade);
          g.lineStyle(11, OAK_DARK, fade); g.lineBetween(m.foot.x, m.foot.y, ex, ey);
          g.lineStyle(7, OAK, fade); g.lineBetween(m.foot.x, m.foot.y - 1, ex, ey - 1);
          const mx = m.foot.x + Math.cos(m.dir) * FALL_LEN * 0.7, my = m.foot.y + Math.sin(m.dir) * FALL_LEN * 0.7;
          g.fillStyle(CANVAS_SHADE, 0.9 * fade); g.fillEllipse(mx, my + 6, 70, 26);
          g.fillStyle(CANVAS, 0.9 * fade); g.fillEllipse(mx - 6, my + 2, 52, 18);
          rope(g, sag({ x: m.foot.x, y: m.foot.y }, { x: mx, y: my }, 14, 8), 2, HEMP, fade);
        }
      }
    },

    drawAir(g, time) {
      for (const m of masts) {
        if (m.state !== 'up' && m.state !== 'falling') continue;
        drawMast(g, m, time, m.occupant ? (m.occupant === ctx.player ? PLAYER_TINT : FOE_TINT) : null);
      }
      // Sight-lines: a red thread of aim that tightens before the shot.
      for (const s of sights) {
        const k = (time - s.at) / s.ms;
        g.lineStyle(1 + k * 2, RED_THREAD, 0.3 + k * 0.6); g.lineBetween(s.from.x, s.from.y - 4, s.to.x, s.to.y);
        g.lineStyle(2, RED_THREAD, 0.8); g.strokeCircle(s.to.x, s.to.y, 18 - k * 10);
      }
    },

    drawHud(g, time) {
      const x0 = W / 2 - 66, y0 = top + 8;
      g.fillStyle(0x14161a, 0.7); g.fillRoundedRect(x0 - 8, y0 - 4, 148, 40, 8);
      masts.forEach((m, i) => {
        const x = x0 + i * 46 + 10;
        g.lineStyle(3, m.state === 'up' ? OAK : dim(OAK, 0.5), 1);
        if (m.state === 'up') g.lineBetween(x, y0 + 30, x, y0 + 2); else g.lineBetween(x, y0 + 30, x + 18, y0 + 24);
        g.lineStyle(2, PINE, 1); if (m.state === 'up') g.lineBetween(x - 7, y0 + 8, x + 7, y0 + 8);
        for (const j of [0, 1] as const) { g.fillStyle(m.stays[j] && m.state === 'up' ? HEMP : RED_THREAD, 1); g.fillCircle(x - 10 + j * 20, y0 + 28, 3); }
        if (m.occupant) { g.fillStyle(m.occupant === ctx.player ? PLAYER_TINT : FOE_TINT, 1); g.fillCircle(x, y0 + 3, 4); }
      });
      // The stranger's climb, ready or not.
      const ready = Math.max(0, (climbReady.get(ctx.player) ?? 0) - time);
      g.fillStyle(ready > 0 ? 0x3a3a3a : PLAYER_TINT, 1); g.fillRect(x0 + 140, y0 + 4, 4, 26);
    },

    destroy() { for (const m of masts) for (const t of m.plates) t?.remove(); sights = []; },
  };
}

/** A training mast: pole, yard with the sail furled on it, crosstrees, two stays to the plates. */
function drawMast(g: G, m: Mast, time: number, aloft: number | null): void {
  const lean = m.state === 'falling' ? Math.min(1, (time - (m.at - FALL_WARN_MS)) / FALL_WARN_MS) : (m.stays[0] && m.stays[1] ? 0 : 0.08);
  // The lean tips the head toward the fall direction (or toward the remaining stay's far side).
  const dir = m.state === 'falling' ? m.dir : (!m.stays[0] ? Math.atan2(m.foot.y - m.anchors[0].y, m.foot.x - m.anchors[0].x) : Math.atan2(m.foot.y - m.anchors[1].y, m.foot.x - m.anchors[1].x));
  const tilt = lean * lean * 1.2;
  const hx = m.foot.x + Math.cos(dir) * MAST_H * Math.sin(tilt), hy = m.foot.y - MAST_H * Math.cos(tilt) + Math.sin(dir) * MAST_H * Math.sin(tilt) * 0.5;
  shadow(g, m.foot.x, m.foot.y + 3, 30, 9, 0.35);
  // Stays.
  for (const i of [0, 1] as const) {
    if (!m.stays[i]) continue;
    const a = m.anchors[i];
    rope(g, [{ x: hx, y: hy + 6 }, { x: a.x, y: a.y - 6 }], 2.2, TAR);
  }
  // Ratlines up one side.
  for (let k = 0; k < 7; k++) {
    const t = 0.12 + k * 0.11;
    const px = m.foot.x + (hx - m.foot.x) * t, py = m.foot.y + (hy - m.foot.y) * t;
    g.lineStyle(1.4, HEMP, 0.9); g.lineBetween(px - 9 + t * 5, py, px + 1, py);
  }
  g.lineStyle(9, OAK_DARK, 1); g.lineBetween(m.foot.x, m.foot.y, hx, hy);
  g.lineStyle(5, OAK, 1); g.lineBetween(m.foot.x - 1, m.foot.y, hx - 1, hy);
  g.lineStyle(1.5, lit(OAK, 0.3), 1); g.lineBetween(m.foot.x - 2, m.foot.y, hx - 2, hy);
  // Yard with a furled sail, crosstrees, a Queen's pennant.
  const yx = m.foot.x + (hx - m.foot.x) * 0.72, yy = m.foot.y + (hy - m.foot.y) * 0.72;
  g.lineStyle(5, OAK_DARK, 1); g.lineBetween(yx - 46, yy, yx + 46, yy);
  g.fillStyle(CANVAS_SHADE, 1); g.fillRoundedRect(yx - 42, yy, 84, 9, 4);
  g.fillStyle(CANVAS, 1); g.fillRoundedRect(yx - 40, yy, 80, 6, 3);
  for (let s = -30; s <= 30; s += 15) { g.lineStyle(1.5, HEMP, 1); g.lineBetween(yx + s, yy - 1, yx + s + 2, yy + 9); }
  g.fillStyle(PINE, 1); g.fillRect(hx - 16, hy + 12, 32, 4);
  const wave = Math.sin(time / 160) * 4;
  g.fillStyle(QUEEN, 1); g.fillTriangle(hx, hy - 2, hx, hy + 8, hx + 22, hy + 3 + wave);
  if (aloft !== null) {
    // Whoever is aloft: a crow's-nest hoop in their colour, and their line hauled up the ratlines.
    g.fillStyle(0x000000, 0.3); g.fillEllipse(hx, hy + 16, 40, 10);
    g.lineStyle(3, aloft, 0.9); g.strokeEllipse(hx, hy + 12, 36, 11);
    g.lineStyle(1.5, aloft, 0.6); g.lineBetween(m.foot.x + 6, m.foot.y - 20, hx + 6, hy + 14);
    g.fillStyle(aloft, 1); g.fillCircle(hx, hy + 2, 5 + Math.sin(time / 120));
  }
}

export const FALLEN_SHROUDS_AND_STAYS: GimmickDef = {
  id: ID,
  rules: 'Stand at a mast to climb out of reach. Strike both stay-plates and the mast falls — on anyone below it, and with whoever is up it.',
  make,
};
