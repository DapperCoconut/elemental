import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { crater, trebuchet } from '../art';
import { RED, STONE, STONE_DARK, STONE_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Siege Line — Engineer Trebuchet.
 *
 * Two trebuchets stand at the east end of the yard and take turns. Each one cocks, picks out
 * whoever is standing *farthest* from it — a red marker over their head says who — and lobs a
 * stone. The shadow of the stone swells where it will land; the stone bursts on whoever is in it,
 * either side, and leaves a crater of thrown clay that nobody can walk through until it is
 * filled in again. So the yard fills up with holes, and the fighter who keeps closer to the
 * engines than the other one is never their mark: stand nearer the trebuchets than the Engineer
 * and he eats his own stones.
 */

interface Engine { x: number; y: number; face: number; arm: number; cockAt: number; releaseAt: number; mark: Fighter | null }
interface Stone { fromX: number; fromY: number; x: number; y: number; firedAt: number; landAt: number }
interface Crater { x: number; y: number; r: number; bornAt: number; dieAt: number }

const COCK_MS = 1200;
const FLIGHT_MS = 1250;
const BLAST_R = 62;
const CRATER_R = 40;
const MAX_CRATERS = 5;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const engines: Engine[] = [
    { x: W - 66, y: top + 150, face: 3, arm: 0.6, cockAt: -1, releaseAt: -1, mark: null },
    { x: W - 66, y: H - 70, face: 5, arm: 0.6, cockAt: -1, releaseAt: -1, mark: null },
  ];
  const DMG = ctx.hard ? 20 : 16;
  const EVERY = ctx.hard ? 2200 : 2700;
  const stones: Stone[] = [];
  const craters: Crater[] = [];
  let nextShot = 0;
  let turn = 0;
  let started = false;

  /** Who is farther from this engine — that is who it throws at. */
  const markFor = (e: Engine): Fighter | null => {
    const pa = alive(player), na = alive(npc);
    if (!pa && !na) return null;
    if (!na) return player;
    if (!pa) return npc;
    return dist(e.x, e.y, player.x, player.y) >= dist(e.x, e.y, npc.x, npc.y) ? player : npc;
  };

  function land(s: Stone, time: number): void {
    ctx.sfx('explosion-medium');
    ctx.flash(s.x, s.y, STONE_LIT);
    tk().explode(s.x, s.y, BLAST_R, DMG, STONE);
    if (alive(npc) && dist(s.x, s.y, npc.x, npc.y) <= BLAST_R) {
      ctx.hit(npc, DMG, npc.x, npc.y);
      ctx.float(npc.x, npc.y - 50, 'OWN GOAL', '#ffd8a0');
    }
    craters.push({ x: s.x, y: s.y, r: CRATER_R, bornAt: time, dieAt: time + 14000 });
    if (craters.length > MAX_CRATERS) craters.shift();
  }

  const tk = () => ctx.tk;

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextShot = time + 1800; }

      // The next engine in turn cocks and picks its mark.
      if (time >= nextShot) {
        const e = engines[turn % 2];
        turn++;
        nextShot = time + EVERY;
        e.cockAt = time;
        e.releaseAt = time + tk().warn(COCK_MS);
        ctx.sfx('gear-turn');
      }
      for (const e of engines) {
        if (e.releaseAt >= 0) {
          e.mark = markFor(e);
          const k = clamp((time - e.cockAt) / (e.releaseAt - e.cockAt), 0, 1);
          e.arm = 0.6 + k * 1.9; // drawn down to cocked
          if (time >= e.releaseAt) {
            e.releaseAt = -1;
            const m = e.mark;
            if (m && alive(m)) {
              const ax = e.x - 50, ay = e.y - 150;
              stones.push({ fromX: ax, fromY: ay, x: clamp(m.x, 50, W - 50), y: clamp(m.y, top + 40, H - 40), firedAt: time, landAt: time + FLIGHT_MS });
              ctx.sfx('mortar-launch');
            }
            e.mark = null;
          }
        } else {
          // Swing through and settle back.
          e.arm += (-1.2 - e.arm) * Math.min(1, dt * 9);
          if (e.arm < -1.1) e.arm = 0.6;
        }
      }
      for (let i = stones.length - 1; i >= 0; i--) {
        if (time >= stones[i].landAt) { land(stones[i], time); stones.splice(i, 1); }
      }
      // Craters: nobody walks through a crater — they are turned at its lip.
      for (let i = craters.length - 1; i >= 0; i--) {
        const c = craters[i];
        if (time >= c.dieAt) { craters.splice(i, 1); continue; }
        if (time - c.bornAt < 300) continue;
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const d = dist(c.x, c.y, f.x, f.y);
          if (d < c.r + 10) {
            const a = d > 0.5 ? Math.atan2(f.y - c.y, f.x - c.x) : rng() * Math.PI * 2;
            const push = Math.min(14, c.r + 10 - d);
            ctx.nudge(f, Math.cos(a) * push, Math.sin(a) * push);
          }
        }
      }
    },

    npcSeek() {
      // Stay nearer the engines than you, between them, and out from under any stone in the air.
      const ex = W - 66, ey = (engines[0].y + engines[1].y) / 2;
      const pd = dist(ex, ey, player.x, player.y);
      const want = Math.max(110, pd - 150);
      const a = Math.atan2(player.y - ey, player.x - ex);
      let p: Pt = { x: ex + Math.cos(a) * want, y: ey + Math.sin(a) * want * 0.8 };
      for (const s of stones) {
        if (dist(s.x, s.y, p.x, p.y) < BLAST_R + 40) p = { x: p.x + (p.x - s.x) * 1.2, y: p.y + (p.y - s.y) * 1.2 };
      }
      return { x: clamp(p.x, 140, W - 130), y: clamp(p.y, top + 60, H - 50) };
    },

    drawGround(g, time) {
      for (const c of craters) {
        const fade = clamp((c.dieAt - time) / 1500, 0, 1);
        crater(g, c.x, c.y, c.r * (0.4 + fade * 0.6), clamp(1 - (time - c.bornAt) / 4000, 0, 1));
      }
      // Each stone's swelling shadow, a ring tightening on the landing.
      for (const s of stones) {
        const k = clamp((time - s.firedAt) / (s.landAt - s.firedAt), 0, 1);
        spokes(s.x, s.y, k);
        g.lineStyle(2, RED, 0.35 + k * 0.5); g.strokeCircle(s.x, s.y, BLAST_R * (1.4 - k * 0.4));
        g.fillStyle(0x000000, 0.12 + k * 0.3); g.fillEllipse(s.x, s.y, BLAST_R * 2 * (0.3 + k * 0.7), BLAST_R * 0.8 * (0.3 + k * 0.7));
      }
      function spokes(x: number, y: number, k: number): void {
        g.lineStyle(1, RED, 0.2 + k * 0.3);
        for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + time / 600; g.lineBetween(x + Math.cos(a) * BLAST_R, y + Math.sin(a) * BLAST_R * 0.5, x + Math.cos(a) * BLAST_R * 0.6, y + Math.sin(a) * BLAST_R * 0.3); }
      }
    },

    drawAir(g, time) {
      for (const e of engines) trebuchet(g, e.x, e.y, 0.9, e.arm, e.face, -1, e.releaseAt >= 0);
      // The mark: a red chevron over whoever the cocking engine has picked.
      for (const e of engines) {
        if (e.releaseAt < 0 || !e.mark || !alive(e.mark)) continue;
        const m = e.mark;
        const bob = Math.sin(time / 90) * 3;
        g.fillStyle(RED, 0.95); g.fillTriangle(m.x - 9, m.y - 64 + bob, m.x + 9, m.y - 64 + bob, m.x, m.y - 52 + bob);
        g.lineStyle(1.5, RED, 0.35); g.lineBetween(e.x - 40, e.y - 120, m.x, m.y - 52);
      }
      // Stones in flight, high on their arc.
      for (const s of stones) {
        const k = clamp((time - s.firedAt) / (s.landAt - s.firedAt), 0, 1);
        const x = s.fromX + (s.x - s.fromX) * k, y = s.fromY + (s.y - s.fromY) * k - Math.sin(k * Math.PI) * 240;
        const r = 9 + Math.sin(k * Math.PI) * 6;
        g.fillStyle(STONE_DARK, 1); g.fillCircle(x, y, r);
        g.fillStyle(STONE, 1); g.fillCircle(x - 1.5, y - 1.5, r * 0.8);
        g.fillStyle(STONE_LIT, 0.7); g.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.3);
      }
    },
  };
}

export const SIEGE_LINE: GimmickDef = {
  id: 'war-siege-line',
  rules: 'Trebuchets lob stones at whoever stands farthest from them — either side. Landing stones leave craters nobody can cross. Keep nearer the engines than your foe.',
  make,
};
