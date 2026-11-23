import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { OBS } from '../../../../../art/PinnacleArt';
import { SIDE_NPC, SIDE_NPC_CSS, SIDE_PLAYER, SIDE_PLAYER_CSS, VOLT, bolt, leydenJar, sparks } from '../art';
import { type Who, WHO, alive, clamp, dist, other, segDist } from '../util';

/**
 * DECREE OF CONDUCTION — Councilor Cassius Ampleforth, Seat of the Draw (electricity).
 *
 * Ampleforth drafted the Draw itself, and his law of the room is the law of current: nothing
 * here is insulated. Every shot in flight is a live terminal, and any two of one side's shots
 * close enough together string an arc between them that burns the other side as it crosses.
 * Four Leyden jars stand at the corners; strike one and it is wired to you — your shots arc to
 * your jars too, and on every beat each pair of jars you hold discharges along the line between
 * them. A perfected Electricity bot fires its balls in pairs and owns the corners.
 *
 * The turn: the jars are anybody's. Strike his jar and it is yours; a player who holds two
 * opposite corners owns a live wire through the middle of the room, and a player with no shots at
 * all can still wire the corners and walk him into the beat.
 */

const ARC_SHOT = 170;
const ARC_JAR = 230;
const SHOT_DMG = 5;
const JAR_DMG = 9;
const HIT_CD = 420;
const HIT_R = 22;
const MAX_SHOTS = 16;

interface Jar { x: number; y: number; owner: Who | null; target: StrikeTarget | null; flash: number }
interface Arc { ax: number; ay: number; bx: number; by: number; owner: Who; jar: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const CHARGE = ctx.tk.warn(ctx.hard ? 1300 : 1600);
  const LIVE = ctx.hard ? 1300 : 1000;
  const REST = ctx.hard ? 500 : 700;
  const CYCLE = CHARGE + LIVE + REST;
  const jars: Jar[] = [
    { x: 150, y: top + 130 }, { x: W - 150, y: top + 130 }, { x: 150, y: H - 70 }, { x: W - 150, y: H - 70 },
  ].map((p) => ({ x: p.x, y: p.y, owner: null, target: null, flash: 0 }));
  let started = -1;
  let arcs: Arc[] = [];
  const hitReady: Record<Who, number> = { player: 0, npc: 0 };
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const colorOf = (w: Who | null): number => (w === 'player' ? SIDE_PLAYER : w === 'npc' ? SIDE_NPC : VOLT);

  for (const j of jars) {
    j.target = ctx.target({
      x: j.x, y: j.y - 40, r: 30,
      onStruck: (by) => {
        if (j.owner === by) return;
        j.owner = by;
        j.flash = ctx.scene.time.now;
        ctx.sfx('electric-charge');
        ctx.flash(j.x, j.y - 60, colorOf(by));
        ctx.float(j.x, j.y - 120, by === 'player' ? 'WIRED TO YOU' : 'WIRED TO HIM', by === 'player' ? SIDE_PLAYER_CSS : SIDE_NPC_CSS);
      },
    });
  }

  /** Where the beat is: 'charge' (jars filling), 'live' (discharging), 'rest'. */
  const beat = (time: number): { phase: 'charge' | 'live' | 'rest'; k: number } => {
    if (started < 0) return { phase: 'rest', k: 0 };
    const t = (time - started) % CYCLE;
    if (t < CHARGE) return { phase: 'charge', k: t / CHARGE };
    if (t < CHARGE + LIVE) return { phase: 'live', k: (t - CHARGE) / LIVE };
    return { phase: 'rest', k: (t - CHARGE - LIVE) / REST };
  };

  const jarPairs = (w: Who): [Jar, Jar][] => {
    const mine = jars.filter((j) => j.owner === w);
    const out: [Jar, Jar][] = [];
    for (let i = 0; i < mine.length; i++) for (let k = i + 1; k < mine.length; k++) out.push([mine[i], mine[k]]);
    return out;
  };

  const strike = (time: number, a: Arc) => {
    const foeWho = other(a.owner);
    const foe = fighter(foeWho);
    if (!alive(foe) || time < hitReady[foeWho] || ctx.isAirborne(foe)) return;
    if (segDist(foe.x, foe.y, a.ax, a.ay, a.bx, a.by) > HIT_R) return;
    hitReady[foeWho] = time + HIT_CD;
    ctx.hit(foe, a.jar ? JAR_DMG : SHOT_DMG, foe.x, foe.y);
    ctx.flash(foe.x, foe.y, colorOf(a.owner));
    ctx.sfx(a.jar ? 'thunder' : 'zap');
  };

  return {
    update(time) {
      if (started < 0) {
        started = time;
        ctx.banner('DECREE OF CONDUCTION — NOTHING HERE IS INSULATED', '#ffe14a');
        ctx.sfx('electric-charge');
      }
      const next: Arc[] = [];
      const shots = ctx.shotsNear(W / 2, (H + top) / 2, 1400);
      for (const w of WHO) {
        const mine = shots.filter((s) => s.owner === w).slice(0, MAX_SHOTS);
        for (let i = 0; i < mine.length; i++) {
          for (let k = i + 1; k < mine.length; k++) {
            if (dist(mine[i].x, mine[i].y, mine[k].x, mine[k].y) <= ARC_SHOT) next.push({ ax: mine[i].x, ay: mine[i].y, bx: mine[k].x, by: mine[k].y, owner: w, jar: false });
          }
          for (const j of jars) {
            if (j.owner === w && dist(mine[i].x, mine[i].y, j.x, j.y - 66) <= ARC_JAR) next.push({ ax: mine[i].x, ay: mine[i].y, bx: j.x, by: j.y - 66, owner: w, jar: false });
          }
        }
      }
      const b = beat(time);
      if (b.phase === 'live') {
        for (const w of WHO) for (const [a, c] of jarPairs(w)) next.push({ ax: a.x, ay: a.y - 66, bx: c.x, by: c.y - 66, owner: w, jar: true });
      }
      const wasLive = arcs.some((a) => a.jar);
      if (!wasLive && next.some((a) => a.jar)) ctx.sfx('plasma-arc');
      arcs = next;
      for (const a of arcs) strike(time, a);
    },
    npcSeek(): Pt | null {
      const n = ctx.npc;
      const held = jars.filter((j) => j.owner === 'npc').length;
      const b = beat(ctx.scene.time.now);
      // In the charge, step off the line of the player's jars — he reads his own drafting.
      if (b.phase === 'charge' && b.k > 0.35) {
        for (const [a, c] of jarPairs('player')) {
          if (segDist(n.x, n.y, a.x, a.y - 66, c.x, c.y - 66) < 70) {
            const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2 - 66;
            const vx = n.x - mx, vy = n.y - my;
            const l = Math.hypot(vx, vy) || 1;
            const vert = Math.abs(a.x - c.x) < Math.abs(a.y - c.y);
            return vert
              ? { x: clamp(n.x + (n.x < mx ? -140 : 140), 70, W - 70), y: n.y }
              : { x: n.x, y: clamp(n.y + (vy / l < 0 ? -140 : 140), top + 60, H - 50) };
          }
        }
      }
      if (held >= 3) return null;
      // Wire the nearest corner that is not his, standing just inside it.
      let best: Jar | null = null, bd = Infinity;
      for (const j of jars) {
        if (j.owner === 'npc') continue;
        const d = dist(n.x, n.y, j.x, j.y);
        if (d < bd) { bd = d; best = j; }
      }
      if (!best) return null;
      return { x: best.x + (best.x < W / 2 ? 46 : -46), y: best.y - 30 };
    },
    drawGround(g, time) {
      const b = beat(time);
      const t = time / 1000;
      // Bus-bars from each wired jar to its wall, and the charge telegraph between paired jars.
      for (const w of WHO) {
        const c = colorOf(w);
        for (const [a, d] of jarPairs(w)) {
          if (b.phase === 'charge') {
            const steps = 18;
            for (let i = 0; i <= steps; i++) {
              const f = i / steps;
              if ((i + Math.floor(time / 90)) % 3 !== 0) continue;
              g.fillStyle(c, 0.25 + b.k * 0.55);
              g.fillCircle(a.x + (d.x - a.x) * f, a.y - 66 + (d.y - a.y) * f, 2 + b.k * 2.5);
            }
            g.lineStyle(HIT_R * 2, c, 0.04 + b.k * 0.1);
            g.lineBetween(a.x, a.y - 66, d.x, d.y - 66);
          }
        }
      }
      for (const j of jars) {
        const c = colorOf(j.owner);
        const charge = j.owner ? (b.phase === 'charge' ? 0.3 + b.k * 0.7 : b.phase === 'live' ? 1 : 0.3) : 0.12;
        g.fillStyle(c, 0.06 + charge * 0.06); g.fillCircle(j.x, j.y, 50);
        g.lineStyle(2, c, 0.25 + charge * 0.3); g.strokeCircle(j.x, j.y, 46);
        leydenJar(g, j.x, j.y, 0.72, charge, t + j.x * 0.01, c);
        const since = time - j.flash;
        if (since < 500) sparks(g, j.x, j.y - 85, 28 * (1 - since / 500) + 10, Math.floor(time / 40) + j.x, c, 1 - since / 500);
      }
    },
    drawAir(g, time) {
      const seed = Math.floor(time / 45);
      arcs.forEach((a, i) => {
        const c = colorOf(a.owner);
        bolt(g, a.ax, a.ay, a.bx, a.by, seed + i * 17, a.jar ? 3 : 1.6, c, a.jar ? 1 : 0.85, a.jar ? 2 : 1);
      });
    },
    drawHud(g, time) {
      const b = beat(time);
      const cx = W / 2, cy = top + 18;
      g.fillStyle(OBS.glass, 0.88); g.fillRoundedRect(cx - 104, cy - 12, 208, 24, 8);
      g.lineStyle(1.5, VOLT, 0.8); g.strokeRoundedRect(cx - 104, cy - 12, 208, 24, 8);
      jars.forEach((j, i) => {
        const x = cx - 84 + i * 24;
        g.fillStyle(colorOf(j.owner), j.owner ? 0.95 : 0.3); g.fillRoundedRect(x - 6, cy - 8, 12, 16, 3);
      });
      const k = b.phase === 'charge' ? b.k : b.phase === 'live' ? 1 : 0;
      g.fillStyle(0x1a1626, 1); g.fillRect(cx + 4, cy - 4, 92, 8);
      g.fillStyle(b.phase === 'live' ? 0xffffff : VOLT, 1); g.fillRect(cx + 4, cy - 4, 92 * k, 8);
    },
    destroy() {
      for (const j of jars) { j.target?.remove(); j.target = null; }
    },
  };
}

export const DECREE_CONDUCTION: GimmickDef = {
  id: 'bench-electricity-conduction',
  rules: 'Nothing is insulated: two of one side\'s shots close together arc and burn the other. Strike a corner jar to wire it to you.',
  make,
};
