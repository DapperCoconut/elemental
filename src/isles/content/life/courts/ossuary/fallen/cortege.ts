import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, glow, lit, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, O, OCOL, alive, clamp, dist, drawFlame, drawLily, segDist } from '../util';

/**
 * NEVER CROSS THE CORTÈGE — Brother Amice, Lantern-Bearer of the Night Procession.
 *
 * Every night a cart comes down from the Glasshouse and the pruned are carried the length of the
 * Lily Road to the beds: a lantern at the head, pallbearers with the bier, a veiled mourner behind,
 * and a black pall-cord strung between them on staves. It is the oldest rule in the court that
 * nobody cuts across a cortège. In the King's telling Amice led it, and reported whoever did.
 *
 * The procession walks the yard, its lantern always turning toward you. Cross the line of it —
 * between any two of the bearers, whether you step through or it walks through you — and you are
 * marked: you take half again from every hit for a few seconds. Go round its head or its tail.
 * Amice walks around it too, but a dash or a shove that carries him across marks him the same.
 * Strike the lead lantern and the procession turns about where it stands, the tail now leading.
 * Halfway down the staves are lit and the pall-cord smoulders: touching it burns.
 */

const ID = fallenId('ossuary', 'cortege');
const BEARERS = 6;
const SPACING = 50;
const MARK_MS = 5000;
const MARK_MULT = 1.5;

type Side = 'player' | 'npc';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const clock = new Clock();
  let now = 0;
  let trail: Pt[] = [];
  for (let i = 0; i <= BEARERS * 2; i++) trail.push({ x: 360 - i * (SPACING / 2), y: top + 130 });
  let way: Pt = { x: 600, y: top + 300 };
  let lit2 = false;
  let turnedAt = -1e9;
  let stepPhase = 0;
  const markUntil: Record<Side, number> = { player: 0, npc: 0 };
  const markedAt: Record<Side, number> = { player: -1e9, npc: -1e9 };
  const burnAt: Record<Side, number> = { player: 0, npc: 0 };
  const prevSide: Record<Side, number[]> = { player: [], npc: [] };
  const fighter = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);

  /** Bearer i (0 = the lantern at the head) sits i×SPACING back along the trail. */
  const bearers = (): Pt[] => {
    const out: Pt[] = [{ ...trail[0] }];
    let need = SPACING;
    for (let i = 1; i < trail.length && out.length < BEARERS; i++) {
      const a = trail[i - 1], b = trail[i];
      const seg = dist(a.x, a.y, b.x, b.y);
      let pos = 0;
      while (seg - pos >= need && out.length < BEARERS) {
        pos += need;
        const t = pos / seg;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        need = SPACING;
      }
      need -= seg - pos;
    }
    while (out.length < BEARERS) out.push({ ...out[out.length - 1] });
    return out;
  };
  let B = bearers();

  const lantern: StrikeTarget = ctx.target({
    x: B[0].x, y: B[0].y - 10, r: 24,
    onStruck(by) {
      if (now - turnedAt < 2400) return;
      turnedAt = now;
      // Turn about where it stands: the tail leads, and the trail is the bearers in reverse.
      trail = B.slice().reverse();
      B = bearers();
      pickWay();
      ctx.sfx('whoosh');
      ctx.float(B[0].x, B[0].y - 50, by === 'player' ? 'THE CORTÈGE TURNS' : 'AMICE TURNS THE CORTÈGE', by === 'player' ? OCOL.green : OCOL.bone);
    },
  });

  function pickWay(): void {
    const p = ctx.player;
    const a = ctx.rng() * Math.PI * 2, r = 90 + ctx.rng() * 110;
    way = { x: clamp(p.x + Math.cos(a) * r, 80, W - 80), y: clamp(p.y + Math.sin(a) * r, top + 70, H - 50) };
  }

  const mark = (s: Side): void => {
    if (now - markedAt[s] < 1200) return;
    markedAt[s] = now;
    markUntil[s] = now + MARK_MS;
    const f = fighter(s);
    ctx.sfx('curse-cast');
    if (s === 'player') { tk.hitPlayer(6, f.x, f.y); ctx.float(f.x, f.y - 56, 'YOU CROSSED THE DEAD', OCOL.red); }
    else { ctx.hit(f, 10, f.x, f.y); ctx.float(f.x, f.y - 56, 'AMICE CROSSED THE DEAD', OCOL.green); }
  };

  /** Which side of segment k a point lies on (±1), or 0 when it is beside the segment's ends. */
  const sideOf = (k: number, x: number, y: number): number => {
    const a = B[k], b = B[k + 1];
    const vx = b.x - a.x, vy = b.y - a.y;
    const L2 = vx * vx + vy * vy;
    if (L2 < 1) return 0;
    const t = ((x - a.x) * vx + (y - a.y) * vy) / L2;
    if (t < 0 || t > 1) return 0;
    const c = vx * (y - a.y) - vy * (x - a.x);
    if (Math.abs(c) / Math.sqrt(L2) > 34) return 0;
    return c >= 0 ? 1 : -1;
  };

  const crosses = (ax: number, ay: number, bx: number, by: number): boolean => {
    const ccw = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
    for (let k = 0; k < BEARERS - 1; k++) {
      const c = B[k], d = B[k + 1];
      const d1 = ccw(ax, ay, bx, by, c.x, c.y), d2 = ccw(ax, ay, bx, by, d.x, d.y);
      const d3 = ccw(c.x, c.y, d.x, d.y, ax, ay), d4 = ccw(c.x, c.y, d.x, d.y, bx, by);
      if (d1 * d2 < 0 && d3 * d4 < 0) return true;
    }
    return false;
  };

  return {
    update(time: number) {
      const dt = clock.tick(time);
      now = time;
      if (dt === 0) return;
      if (!lit2 && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        lit2 = true;
        ctx.banner('THE STAVES ARE LIT — THE PALL-CORD BURNS', OCOL.marrow);
        ctx.sfx('flame-burst');
      }
      // The lead walks on toward the next waypoint near you.
      const speed = lit2 ? 88 : 70;
      const L = trail[0];
      const d = dist(L.x, L.y, way.x, way.y);
      if (d < 24) pickWay();
      else {
        const nx = L.x + ((way.x - L.x) / d) * speed * dt, ny = L.y + ((way.y - L.y) / d) * speed * dt;
        if (dist(nx, ny, trail[1].x, trail[1].y) > 6) trail.unshift({ x: nx, y: ny }); else trail[0] = { x: nx, y: ny };
        if (trail.length > 80) trail.length = 80;
        stepPhase += speed * dt;
      }
      B = bearers();
      lantern.moveTo(B[0].x, B[0].y - 10);
      // Crossing the line.
      for (const s of ['player', 'npc'] as Side[]) {
        const f = fighter(s);
        if (!alive(f)) continue;
        const prev = prevSide[s];
        for (let k = 0; k < BEARERS - 1; k++) {
          const cur = sideOf(k, f.x, f.y);
          if (cur !== 0 && prev[k] && prev[k] !== cur) mark(s);
          prev[k] = cur;
        }
        if (lit2 && now >= burnAt[s]) {
          for (let k = 0; k < BEARERS - 1; k++) {
            if (segDist(f.x, f.y, B[k].x, B[k].y, B[k + 1].x, B[k + 1].y) > 30) continue;
            burnAt[s] = now + 500;
            if (s === 'player') tk.hitPlayer(5, f.x, f.y); else ctx.hit(f, 8, f.x, f.y);
            ctx.sfx('sizzle');
            break;
          }
        }
      }
    },

    playerTakenMult: () => (now < markUntil.player ? MARK_MULT : 1),
    npcTakenMult: () => (now < markUntil.npc ? MARK_MULT : 1),

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      if (lit2) {
        for (let k = 0; k < BEARERS - 1; k++) {
          if (segDist(n.x, n.y, B[k].x, B[k].y, B[k + 1].x, B[k + 1].y) > 48) continue;
          const mx = (B[k].x + B[k + 1].x) / 2, my = (B[k].y + B[k + 1].y) / 2;
          const a = Math.atan2(n.y - my, n.x - mx);
          return { x: tk.clampX(n.x + Math.cos(a) * 80), y: tk.clampY(n.y + Math.sin(a) * 80) };
        }
      }
      // You are on the far side of the line: round the nearer end, never through.
      if (!crosses(n.x, n.y, p.x, p.y)) return null;
      const head = B[0], tail = B[BEARERS - 1];
      const useHead = dist(n.x, n.y, head.x, head.y) + dist(p.x, p.y, head.x, head.y) < dist(n.x, n.y, tail.x, tail.y) + dist(p.x, p.y, tail.x, tail.y);
      const end = useHead ? head : tail, next = useHead ? B[1] : B[BEARERS - 2];
      const a = Math.atan2(end.y - next.y, end.x - next.x);
      return { x: tk.clampX(end.x + Math.cos(a) * 70), y: tk.clampY(end.y + Math.sin(a) * 70) };
    },

    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      // Where the lantern is bound: a faint lily laid on the road ahead.
      drawLily(g, way.x, way.y + 6, 5, 0.6, 0, 0.5);
      // Footprints of the procession in the dust behind it.
      for (let i = 4; i < trail.length; i += 3) {
        const t = trail[i];
        g.fillStyle(O.loamDeep, clamp(0.5 - i / 160, 0, 0.5)); g.fillEllipse(t.x + (i % 2 ? 6 : -6), t.y + 18, 7, 4);
      }
      // The line itself, as the cord's shadow on the ground.
      for (let k = 0; k < BEARERS - 1; k++) {
        g.lineStyle(10, 0x000000, 0.18); g.lineBetween(B[k].x, B[k].y + 16, B[k + 1].x, B[k + 1].y + 16);
        g.lineStyle(2, lit2 ? O.marrowLit : O.dusk, 0.35 + Math.sin(time / 300 + k) * 0.1); g.lineBetween(B[k].x, B[k].y + 16, B[k + 1].x, B[k + 1].y + 16);
      }
      for (const b of B) shadow(g, b.x, b.y + 18, 36, 10, 0.3);
    },

    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      // The bier, carried between bearers 1 and 4: boards, a white shroud, lilies laid on it.
      const b1 = B[1], b4 = B[4];
      const ang = Math.atan2(b4.y - b1.y, b4.x - b1.x);
      const len = dist(b1.x, b1.y, b4.x, b4.y);
      const cx = (b1.x + b4.x) / 2, cy = (b1.y + b4.y) / 2 - 26;
      const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
      const R = (u: number, v: number): Pt => ({ x: cx + ux * u + nx * v, y: cy + uy * u + ny * v });
      const hl = Math.max(30, len / 2 + 6);
      g.fillStyle(O.timber, 1); g.fillPoints([R(-hl, -12), R(hl, -12), R(hl, 12), R(-hl, 12)], true);
      g.fillStyle(O.lily, 1); g.fillPoints([R(-hl + 6, -9), R(hl - 6, -9), R(hl - 10, 9), R(-hl + 10, 9)], true);
      g.fillStyle(O.lilyShade, 1); g.fillPoints([R(-hl + 10, 3), R(hl - 10, 3), R(hl - 10, 9), R(-hl + 10, 9)], true);
      for (let i = -1; i <= 1; i++) { const p = R(i * hl * 0.5, -2); drawLily(g, p.x, p.y + 6, 4, 1, 0); }
      // The bearers, tail first so the head draws on top.
      for (let i = BEARERS - 1; i >= 0; i--) drawBearer(g, B[i], i, time, stepPhase, lit2);
      // The pall-cord on its staves.
      for (let k = 0; k < BEARERS - 1; k++) {
        const a = B[k], b = B[k + 1];
        const sag = 6;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 30 + sag;
        g.lineStyle(3, 0x141016, 1);
        g.beginPath(); g.moveTo(a.x + 12, a.y - 34); g.lineTo(mx, my); g.lineTo(b.x + 12, b.y - 34); g.strokePath();
        if (lit2) {
          g.lineStyle(1.5, O.marrowLit, 0.6 + Math.sin(time / 90 + k) * 0.3);
          g.beginPath(); g.moveTo(a.x + 12, a.y - 34); g.lineTo(mx, my); g.lineTo(b.x + 12, b.y - 34); g.strokePath();
        }
      }
      // A mark over whoever crossed: a black ribbon bow with the seconds burning down.
      for (const s of ['player', 'npc'] as Side[]) {
        const f = fighter(s);
        if (!alive(f) || now >= markUntil[s]) continue;
        const k = (markUntil[s] - now) / MARK_MS;
        const x = f.x, y = f.y - 58;
        g.fillStyle(0x141016, 1); g.fillTriangle(x, y, x - 12, y - 7, x - 12, y + 7); g.fillTriangle(x, y, x + 12, y - 7, x + 12, y + 7);
        g.fillStyle(O.sinewLit, 1); g.fillCircle(x, y, 3);
        g.fillStyle(O.dusk, 1); g.fillRect(x - 12, y + 10, 24 * k, 3);
      }
    },

    drawHud(g: Phaser.GameObjects.Graphics) {
      if (now >= markUntil.player) return;
      const k = (markUntil.player - now) / MARK_MS;
      g.fillStyle(0x141016, 0.18 * k + 0.06); g.fillRect(0, top, 10, H - top); g.fillRect(W - 10, top, 10, H - top);
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(W / 2 - 64, H - 34, 128, 16, 6);
      g.fillStyle(O.dusk, 1); g.fillRoundedRect(W / 2 - 60, H - 30, 120 * k, 8, 4);
    },

    destroy() { lantern.remove(); },
  };
}

/**
 * One of the procession: the lantern-bearer at the head (a lantern on a pole), the veiled mourner at
 * the tail, and hooded pallbearers between, each with a stave for the pall-cord.
 */
function drawBearer(g: Phaser.GameObjects.Graphics, p: Pt, i: number, time: number, step: number, burning: boolean): void {
  const bob = Math.sin(step / 9 + i * 1.3) * 1.5;
  const x = p.x, y = p.y + bob;
  const robe = i === BEARERS - 1 ? 0x1a1418 : i === 0 ? 0x2a2230 : 0x241e26;
  // Robe, hood, and the dark of the face.
  g.fillStyle(dim(robe, 0.2), 1); g.fillTriangle(x - 15, y + 16, x + 15, y + 16, x, y - 26);
  g.fillStyle(robe, 1); g.fillTriangle(x - 12, y + 16, x + 11, y + 16, x, y - 24);
  g.fillStyle(lit(robe, 0.15), 1); g.fillEllipse(x, y - 26, 20, 20);
  g.fillStyle(0x08060a, 1); g.fillEllipse(x, y - 24, 11, 12);
  if (i === BEARERS - 1) {
    // The mourner's veil, falling to the shoulders.
    g.fillStyle(0x0e0a10, 0.85); g.fillTriangle(x - 13, y - 4, x + 13, y - 4, x, y - 36);
    g.fillStyle(O.lily, 1); g.fillCircle(x - 6, y - 8, 2);
  }
  if (i === 0) {
    // The lantern on its pole, swinging a little ahead.
    const lx = x + 16, ly = y - 54 + Math.sin(time / 300) * 2;
    g.lineStyle(3, O.timber, 1); g.lineBetween(x + 8, y + 6, lx, ly - 8);
    g.fillStyle(O.iron, 1); g.fillRect(lx - 7, ly - 6, 14, 3); g.fillRect(lx - 7, ly + 10, 14, 3);
    g.fillStyle(O.candle, 0.9); g.fillRect(lx - 5, ly - 3, 10, 13);
    drawFlame(g, lx, ly + 7, time / 1000, 0.8);
    glow(g, lx, ly + 3, 46, O.candle, 0.05, 3);
    g.lineStyle(1, O.iron, 1); g.strokeRect(lx - 6, ly - 3, 12, 13);
  } else {
    // A stave for the cord; lit on top once the procession burns.
    g.lineStyle(2.5, O.timberLit, 1); g.lineBetween(x + 10, y + 8, x + 12, y - 34);
    if (burning) { drawFlame(g, x + 12, y - 34, time / 1000 + i, 0.55); glow(g, x + 12, y - 38, 20, O.marrowLit, 0.04, 2); }
  }
}

export const FALLEN_CORTEGE: GimmickDef = {
  id: ID,
  rules: 'A night procession hunts you. Cross its line and you take +50% for 5s; go round its ends. Strike its lantern to turn it about. At half the cord burns.',
  make,
};
