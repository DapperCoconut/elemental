import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { nib } from '../art';
import { GLOW, GLOW_LIT, INK, PAPER_FOX, PAPER_LIT, RED } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { pips, proofSlip } from './common';

/**
 * Written in Lemon — Night-Writer Henrike Vellacott, who wrote the Censor's reports in lemon juice
 * between the lines of ordinary hymn sheets, so they could be carried past anyone.
 *
 * As she fights she writes on the stones around you in lemon: loops of script that only glisten
 * faintly where they dry. Lemon writing shows itself when it is warmed, and nothing warms it like a
 * cast: whoever casts near a line of it sets it browning, and a moment later the whole line
 * scorches up out of the stone and burns everyone beside it — the writer as well as the reader.
 *
 * So step clear of her writing before you cast, and cast where she stands in it: her own casts
 * warm it under her feet as surely as yours. Past half, a dash across a line warms it too.
 */

const WARM_R = 100;
const BURN_R = 64;
const MAX_MARKS = 10;

interface Mark { x: number; y: number; rot: number; seed: number; writeAt: number; warmAt: number; born: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const marks: Mark[] = [];
  const burns: { x: number; y: number; at: number }[] = [];
  let started = false;
  let half = false;
  let nextWrite = 0;
  const WARM_MS = 1100;

  /** A cast warms every latent line within reach of the caster. */
  function warmNear(f: Fighter): void {
    const now = ctx.scene.time.now;
    let any = false;
    for (const m of marks) {
      if (m.warmAt || now < m.writeAt || dist(f.x, f.y, m.x, m.y) > WARM_R) continue;
      m.warmAt = now; any = true;
    }
    if (any) ctx.sfx('sizzle');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextWrite = time + 900; }
      if (!half && npc.hp < npc.maxHp * 0.5) half = true;

      // She writes a fresh line on the stones near you.
      if (time >= nextWrite && alive(npc)) {
        nextWrite = time + (half ? 1300 : 1600);
        if (marks.length < MAX_MARKS) {
          const a = rng() * Math.PI * 2, r = 70 + rng() * 90;
          marks.push({
            x: clamp(player.x + Math.cos(a) * r, 60, W - 60), y: clamp(player.y + Math.sin(a) * r, top + 50, H - 40),
            rot: (rng() - 0.5) * 0.6, seed: rng() * 100, writeAt: time + 500, warmAt: 0, born: time,
          });
        }
      }
      if (half) for (const f of [player, npc]) if (alive(f) && ctx.dashing(f)) {
        for (const m of marks) if (!m.warmAt && time >= m.writeAt && dist(f.x, f.y, m.x, m.y) < 44) m.warmAt = time;
      }
      for (let i = marks.length - 1; i >= 0; i--) {
        const m = marks[i];
        if (m.warmAt && time - m.warmAt >= WARM_MS) {
          for (const f of [player, npc]) if (alive(f) && !ctx.isAirborne(f) && dist(f.x, f.y, m.x, m.y) < BURN_R) ctx.hit(f, 12, f.x, f.y);
          burns.push({ x: m.x, y: m.y, at: time });
          ctx.sfx('flame-burst');
          marks.splice(i, 1);
          continue;
        }
        // Old writing soaks into the stone and is gone.
        if (!m.warmAt && time - m.born > 22000) marks.splice(i, 1);
      }
      for (let i = burns.length - 1; i >= 0; i--) if (time - burns[i].at > 800) burns.splice(i, 1);
    },

    onPlayerCast() { warmNear(player); },
    onNpcCast() { warmNear(npc); },

    npcSeek() {
      if (!alive(npc)) return null;
      let best: Pt = { x: npc.x, y: npc.y }, bestScore = Infinity;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, rr = i % 2 ? 190 : 260;
        const p = { x: clamp(player.x + Math.cos(a) * rr, 60, W - 60), y: clamp(player.y + Math.sin(a) * rr, top + 50, H - 40) };
        let score = dist(p.x, p.y, npc.x, npc.y) * 0.2;
        for (const m of marks) if (dist(p.x, p.y, m.x, m.y) < WARM_R + 10) score += m.warmAt ? 900 : 300;
        if (score < bestScore) { bestScore = score; best = p; }
      }
      return best;
    },

    drawGround(g, time) {
      for (const m of marks) {
        if (time < m.writeAt) continue;
        const k = m.warmAt ? clamp((time - m.warmAt) / WARM_MS, 0, 1) : 0;
        if (m.warmAt) {
          g.fillStyle(GLOW, 0.08 + 0.18 * k); g.fillCircle(m.x, m.y, BURN_R);
          g.lineStyle(2, RED, 0.4 + 0.5 * k); g.strokeCircle(m.x, m.y, BURN_R);
        }
        script(g, m, time, k);
      }
      for (const b of burns) {
        const k = clamp((time - b.at) / 800, 0, 1);
        g.fillStyle(0x2a1a10, 0.4 * (1 - k)); g.fillEllipse(b.x, b.y, 110, 50);
      }
    },

    drawAir(g, time) {
      // Her nib writing a line that has not dried yet.
      for (const m of marks) {
        if (time >= m.writeAt) continue;
        const k = clamp(1 - (m.writeAt - time) / 500, 0, 1);
        const px = m.x - 34 + k * 68, py = m.y - 4 + Math.sin(k * 14) * 5;
        nib(g, px, py, 22, -Math.PI / 3, GLOW_LIT);
        g.fillStyle(GLOW_LIT, 0.5); g.fillCircle(px, py, 3);
      }
      // Scorched words lifting off the stone as smoke and flame.
      for (const b of burns) {
        const k = clamp((time - b.at) / 800, 0, 1);
        for (let i = 0; i < 10; i++) {
          const a = i * 0.63;
          const fx = b.x + Math.cos(a) * 40 * (0.4 + k), fy = b.y + Math.sin(a) * 18 - k * 40;
          g.fillStyle(i % 2 ? 0xff8a3a : GLOW_LIT, 0.9 * (1 - k)); g.fillTriangle(fx - 4, fy, fx + 4, fy, fx, fy - 12 - k * 10);
        }
        g.fillStyle(0x5a4a40, 0.4 * (1 - k)); g.fillCircle(b.x, b.y - 30 - k * 50, 18 + k * 20);
      }
    },

    drawHud(g) {
      const x = W / 2, y = top + 4;
      proofSlip(g, x, y, 150, 26);
      pips(g, x + 6, y + 13, MAX_MARKS, marks.length, GLOW);
      let warm = 0;
      for (const m of marks) if (m.warmAt) warm++;
      if (warm) { g.fillStyle(RED, 1); g.fillCircle(x + 66, y + 13, 4); }
    },
  };
}

/**
 * A line of lemon script: three rows of looped hand that only glisten when cold, then brown from
 * the middle outward to scorched sepia as `k` (warmth) runs to 1.
 */
function script(g: G, m: Mark, time: number, k: number): void {
  const c = Math.cos(m.rot), s = Math.sin(m.rot);
  const cold = 0.14 + Math.sin(time / 400 + m.seed) * 0.05;
  for (let row = 0; row < 3; row++) {
    const len = 70 - row * 14;
    const pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, u = -len / 2 + t * len;
      const v = (row - 1) * 12 + Math.sin(t * 22 + m.seed + row) * 4 - Math.abs(Math.sin(t * 11 + m.seed)) * 3;
      pts.push({ x: m.x + u * c - v * s, y: m.y + u * s + v * c });
    }
    const col = k > 0 ? (k > 0.6 ? INK : PAPER_FOX) : PAPER_LIT;
    const a = k > 0 ? 0.4 + 0.6 * k : cold;
    g.lineStyle(k > 0 ? 2.4 : 1.8, col, a);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
  }
  // A wet glint on the cold juice.
  if (!k) { g.fillStyle(GLOW_LIT, cold * 1.5); g.fillEllipse(m.x - 14, m.y - 6, 10, 3); }
}

export const FALLEN_LEMON: GimmickDef = {
  id: fallenId('libretto', 'lemon'),
  rules: 'She writes in lemon round you. A cast warms nearby writing, and it scorches up, burning all beside it. Step clear to cast; make her cast in it.',
  make,
};
