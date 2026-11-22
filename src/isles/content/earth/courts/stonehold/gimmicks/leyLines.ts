import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { lit } from '../../../../../art/IsleArt';
import { leyLine, spiralStone } from '../art';
import { DUST, LEY, LEY_DARK } from '../palette';
import { alive, clamp, dist, segDist, segNearest, stepDt } from '../util';

/**
 * Ley Lines — Dowser Hazel.
 *
 * Five standing stones stand about the yard, and ley lines glow between each stone and its two
 * nearest neighbours. Standing on a line charges you: you move quicker and your blows land a
 * third harder. Every few seconds a surge runs down every line — the lines brighten first — and
 * whoever is standing on one is mended by it.
 *
 * The stones are heavy but not fixed: walk into one and you shove it along, slowly. Move a stone
 * and the lines re-route, because a line always runs to the *nearest* stones — push one away
 * from Hazel's line and it snaps out from under her; drag one to where you stand and a line
 * follows it. Hazel dowses for the nearest line with her rod and will walk a long way to find it.
 *
 * (Ley lines in the old songs "quicken the hand"; abilities' cooldowns are not something an arena
 * rule may touch, so the quickening is a speed and damage charge instead.)
 */

const STONE_R = 20;
const ON_LINE = 22;
const SURGE_EVERY = 7000;
const SURGE_WARN = 1100;
const SURGE_HEAL = 6;

interface Stone { x: number; y: number; seed: number; shovedAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 10;
  const stones: Stone[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2 + (rng() - 0.5) * 0.3;
    stones.push({ x: cx + Math.cos(a) * 280, y: cy + Math.sin(a) * 175, seed: rng() * 10, shovedAt: -9999 });
  }
  let lines: [number, number][] = [];
  let nextSurge = 0;
  let surgeAt = -9999;
  let warned = false;
  let started = false;
  const charged = new Map<Fighter, number>([[player, 0], [npc, 0]]);

  function relink(): void {
    const set = new Set<string>();
    const out: [number, number][] = [];
    stones.forEach((s, i) => {
      const order = stones.map((o, j) => ({ j, d: j === i ? Infinity : dist(s.x, s.y, o.x, o.y) })).sort((a, b) => a.d - b.d);
      for (const { j } of order.slice(0, 2)) {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!set.has(key)) { set.add(key); out.push(i < j ? [i, j] : [j, i]); }
      }
    });
    lines = out;
  }

  const onLine = (f: Fighter) => alive(f) && lines.some(([i, j]) => segDist(f.x, f.y, stones[i].x, stones[i].y, stones[j].x, stones[j].y) < ON_LINE);

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSurge = time + SURGE_EVERY; }
      // Shoves: a fighter overlapping a stone pushes it, and is held back by its weight.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        for (const s of stones) {
          const d = dist(f.x, f.y, s.x, s.y);
          const overlap = STONE_R + 20 - d;
          if (overlap <= 0 || d < 0.01) continue;
          const nx = (s.x - f.x) / d, ny = (s.y - f.y) / d;
          s.x = clamp(s.x + nx * overlap * 0.55, 60, W - 60);
          s.y = clamp(s.y + ny * overlap * 0.55, top + 50, H - 40);
          ctx.nudge(f, -nx * overlap * 0.45, -ny * overlap * 0.45);
          if (time - s.shovedAt > 900) ctx.sfx('stone-rise');
          s.shovedAt = time;
        }
      }
      // Stones never sit on top of one another.
      for (let i = 0; i < stones.length; i++) {
        for (let j = i + 1; j < stones.length; j++) {
          const a = stones[i], b = stones[j];
          const d = dist(a.x, a.y, b.x, b.y);
          if (d < STONE_R * 3 && d > 0.01) {
            const k = (STONE_R * 3 - d) / 2, nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
            a.x -= nx * k; a.y -= ny * k; b.x += nx * k; b.y += ny * k;
          }
        }
      }
      relink();
      for (const f of [player, npc]) {
        const on = onLine(f);
        const was = charged.get(f) ?? 0;
        charged.set(f, clamp(was + (on ? dt * 4 : -dt * 3), 0, 1));
        if (on && was === 0 && f === player) ctx.float(f.x, f.y - 44, 'LEY-CHARGED', '#b8ffe8');
      }
      // The surge.
      if (!warned && time >= nextSurge - SURGE_WARN) { warned = true; ctx.banner('THE LEY SURGES', '#b8ffe8'); ctx.sfx('beam-charge'); }
      if (time >= nextSurge) {
        nextSurge = time + SURGE_EVERY;
        warned = false;
        surgeAt = time;
        ctx.sfx('crystal-chime');
        for (const f of [player, npc]) {
          if (!onLine(f)) continue;
          ctx.heal(f, SURGE_HEAL);
          ctx.float(f.x, f.y - 50, `+${SURGE_HEAL}`, '#b8ffe8');
        }
      }
    },

    playerSpeedMult() { return 1 + 0.18 * (charged.get(player) ?? 0); },
    npcSpeedMult() { return 1 + 0.18 * (charged.get(npc) ?? 0); },
    // Whoever is charged hits harder: the *other* fighter takes more.
    playerTakenMult() { return 1 + 0.33 * (charged.get(npc) ?? 0); },
    npcTakenMult() { return 1 + 0.33 * (charged.get(player) ?? 0); },

    npcSeek() {
      // The nearest point on any line; when you are charged too, a point on a line far from you.
      let best: Pt | null = null;
      let bs = Infinity;
      for (const [i, j] of lines) {
        const a = stones[i], b = stones[j];
        const p = segNearest(npc.x, npc.y, a.x, a.y, b.x, b.y);
        const score = dist(npc.x, npc.y, p.x, p.y) - Math.min(260, dist(player.x, player.y, p.x, p.y)) * 0.4;
        if (score < bs) { bs = score; best = p; }
      }
      return best ? { x: clamp(best.x, 60, W - 60), y: clamp(best.y, top + 50, H - 40) } : null;
    },

    drawGround(g, time) {
      const surging = time - surgeAt < 600;
      const warnK = warned ? clamp(1 - (nextSurge - time) / SURGE_WARN, 0, 1) : 0;
      // The dowsed earth: a faint scored ring round each stone where it has been dragged.
      for (const s of stones) {
        g.fillStyle(LEY_DARK, 0.12); g.fillEllipse(s.x, s.y + 2, 70, 24);
        if (time - s.shovedAt < 500) { g.fillStyle(DUST, 0.35); g.fillEllipse(s.x, s.y + 4, 60, 18); }
      }
      for (const [i, j] of lines) {
        const a = stones[i], b = stones[j];
        leyLine(g, a.x, a.y, b.x, b.y, time, 0.7 + warnK * 0.8 + (surging ? 1 : 0));
        if (surging) {
          const k = (time - surgeAt) / 600;
          g.lineStyle(18 * (1 - k), lit(LEY, 0.5), 0.4 * (1 - k)); g.lineBetween(a.x, a.y, b.x, b.y);
        }
      }
      // Charged fighters stand in a ring of ley light.
      for (const [f, c] of charged) {
        if (!alive(f) || c <= 0) continue;
        g.lineStyle(2, LEY, 0.5 * c); g.strokeEllipse(f.x, f.y + 14, 50, 18);
        g.fillStyle(LEY, 0.1 * c); g.fillEllipse(f.x, f.y + 14, 50, 18);
      }
    },

    drawAir(g, time) {
      for (const s of stones) {
        const glowA = lines.length ? 0.6 + Math.sin(time / 400 + s.seed) * 0.3 : 0;
        spiralStone(g, s.x, s.y + 14, 1.35, glowA);
      }
      // Charged motes rising off whoever stands on a line.
      for (const [f, c] of charged) {
        if (!alive(f) || c <= 0) continue;
        for (let i = 0; i < 5; i++) {
          const ph = ((time / 900) + i / 5) % 1;
          g.fillStyle(lit(LEY, 0.3), 0.7 * c * (1 - ph));
          g.fillCircle(f.x + Math.sin(i * 2.1 + time / 300) * 14, f.y + 10 - ph * 50, 2);
        }
      }
    },

    drawHud(g) {
      // Two little dowsing gauges: how charged each of you is.
      for (const [f, x, d] of [[player, 20, 1], [npc, W - 20, -1]] as [Fighter, number, number][]) {
        const c = charged.get(f) ?? 0;
        const w = 110, x0 = d > 0 ? x : x - w, y = top + 10;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 2, y - 2, w + 4, 12, 5);
        g.fillStyle(LEY, 0.9);
        g.fillRoundedRect(d > 0 ? x0 : x0 + w - w * c, y, Math.max(2, w * c), 8, 4);
        const sx = d > 0 ? x0 + w + 12 : x0 - 12;
        g.lineStyle(2, LEY, 0.8); g.beginPath(); g.arc(sx, y + 4, 4, 0, Math.PI * 1.6, false); g.strokePath();
      }
    },
  };
}

export const LEY_LINES: GimmickDef = {
  id: 'stonehold-ley-lines',
  rules: 'Ley lines run between the nearest standing stones: stand on one to move faster and hit harder, and be mended by its surge. Walk into a stone to shove it and re-route the lines.',
  make,
};
