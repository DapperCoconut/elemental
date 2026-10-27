import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { CAL, dist, hexPts, makeClock } from '../palette';

/**
 * Magma Tide — Tidecaller Lavra.
 *
 * The floor is a shore. On a slow clock the lava lake comes in: the source edge glows and
 * chevrons point inward (the warning), then a molten front rolls across the whole room, holds,
 * and draws back, leaving a skin of slag that drags at the feet for a moment. The only dry
 * ground is five basalt islands — and every tide, Lavra condemns one of them: it is marked
 * with glowing cracks during the warning and goes under with everything else.
 *
 * The tide burns both of you. Lavra heads for the nearest sound island as soon as the shore
 * glows, so the fight compresses onto islands every cycle — and the clever play is to claim
 * the island she is running for, or to stand between her and it.
 */

const ISLAND_TICK_MS = 400;

type Phase = 'calm' | 'warn' | 'rise' | 'hold' | 'ebb' | 'slag';
type Dir = 'w' | 'e' | 'n' | 's';

interface Island { x: number; y: number; r: number; seed: number }

const DIR_NAME: Record<Dir, string> = { w: 'WEST', e: 'EAST', n: 'NORTH', s: 'SOUTH' };

export const magmaTideGimmick: GimmickDef = {
  id: 'caldera-tide',
  rules: 'A lava tide floods the room from one side. Only basalt islands stay dry — and one island sinks each tide.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, rng, hard } = ctx;
    const tick = makeClock();
    const R = hard ? 52 : 58;
    const islands: Island[] = [
      { x: W * 0.2, y: top + 125, r: R, seed: 11 },
      { x: W * 0.8, y: top + 115, r: R, seed: 23 },
      { x: W * 0.5, y: top + (H - top) * 0.5, r: R + 6, seed: 37 },
      { x: W * 0.24, y: H - 105, r: R, seed: 41 },
      { x: W * 0.77, y: H - 100, r: R, seed: 53 },
    ];
    const calmMs = hard ? 3200 : 4300;
    const warnMs = 2300;
    const riseSpeed = 300;
    const holdMs = hard ? 2200 : 1800;
    const ebbSpeed = 240;
    const slagMs = 1600;
    const lavaDmg = hard ? 8 : 7;

    let phase: Phase = 'calm';
    let phaseAt = -1;
    let dir: Dir = 'w';
    let pincer = false;
    let front = 0;
    let sinking = -1;
    let tides = 0;
    const lastBurn = new Map<Fighter, number>();

    /** Length of the room along the tide's axis. */
    const span = (): number => (dir === 'w' || dir === 'e' ? W : H - top);
    /** How far a point is from the tide's source edge. */
    const depthOf = (x: number, y: number): number => {
      switch (dir) {
        case 'w': return x;
        case 'e': return W - x;
        case 'n': return y - top;
        case 's': return H - y;
      }
    };
    const submerged = (x: number, y: number): boolean => {
      if (phase !== 'rise' && phase !== 'hold' && phase !== 'ebb') return false;
      const d = depthOf(x, y);
      return pincer ? d < front || d > span() - front : d < front;
    };
    const islandAt = (x: number, y: number): number => islands.findIndex((i) => dist(i.x, i.y, x, y) < i.r - 6);
    const inLava = (f: Fighter): boolean => {
      if (!submerged(f.x, f.y)) return false;
      const i = islandAt(f.x, f.y);
      return i < 0 || i === sinking;
    };
    const onSlag = (f: Fighter): boolean => phase === 'slag' && islandAt(f.x, f.y) < 0;

    const startTide = (now: number): void => {
      const dirs: Dir[] = (['w', 'e', 'n', 's'] as Dir[]).filter((d) => d !== dir);
      dir = dirs[Math.floor(rng() * dirs.length)];
      tides++;
      pincer = hard && tides % 2 === 0;
      sinking = Math.floor(rng() * islands.length);
      phase = 'warn';
      phaseAt = now;
      ctx.banner(pincer ? 'THE TIDE CLOSES IN' : `TIDE FROM THE ${DIR_NAME[dir]}`, '#ff8a3a');
      ctx.sfx('boss-phase');
      const s = islands[sinking];
      ctx.float(s.x, s.y - 40, 'SINKING', '#ff5a2a');
    };

    return {
      update(time: number) {
        const dt = tick(time);
        if (phaseAt < 0) { phaseAt = time; }
        const el = time - phaseAt;
        switch (phase) {
          case 'calm': if (el >= calmMs) startTide(time); break;
          case 'warn':
            if (el >= warnMs) { phase = 'rise'; phaseAt = time; front = 0; ctx.sfx('geyser'); }
            break;
          case 'rise':
            front += riseSpeed * dt;
            if (front >= (pincer ? span() / 2 + 30 : span() + 30)) { phase = 'hold'; phaseAt = time; }
            break;
          case 'hold': if (el >= holdMs) { phase = 'ebb'; phaseAt = time; } break;
          case 'ebb':
            front -= ebbSpeed * dt;
            if (front <= 0) { front = 0; phase = 'slag'; phaseAt = time; ctx.sfx('sizzle'); }
            break;
          case 'slag': if (el >= slagMs) { phase = 'calm'; phaseAt = time; sinking = -1; } break;
        }
        for (const f of [ctx.player, ctx.npc]) {
          if (!f.active || f.hp <= 0 || !inLava(f)) continue;
          const last = lastBurn.get(f) ?? 0;
          if (time - last >= ISLAND_TICK_MS) { lastBurn.set(f, time); ctx.hit(f, lavaDmg, f.x, f.y); }
        }
      },

      playerSpeedMult: () => (inLava(ctx.player) ? 0.62 : onSlag(ctx.player) ? 0.85 : 1),
      npcSpeedMult: () => (inLava(ctx.npc) ? 0.62 : onSlag(ctx.npc) ? 0.85 : 1),

      npcSeek(): Pt | null {
        if (phase === 'calm' || phase === 'slag') return null;
        const n = ctx.npc;
        const here = islandAt(n.x, n.y);
        if (here >= 0 && here !== sinking) return null;
        let best = -1;
        let bestD = Infinity;
        islands.forEach((i, k) => {
          if (k === sinking) return;
          const d = dist(i.x, i.y, n.x, n.y);
          if (d < bestD) { bestD = d; best = k; }
        });
        return best >= 0 ? { x: islands[best].x, y: islands[best].y } : null;
      },

      drawGround(g, time) {
        const now = time;
        // The shore itself: ash-grey beach with old tide lines.
        g.lineStyle(2, CAL.crustMid, 0.35);
        for (let k = 1; k < 4; k++) {
          const o = k * 0.22;
          g.strokeEllipse(W / 2, (top + H) / 2, W * (1.1 - o), (H - top) * (1.1 - o));
        }
        // Warning: the source edge glows and chevrons point inward.
        if (phase === 'warn') {
          const k = (now - phaseAt) / warnMs;
          const pulse = 0.4 + Math.sin(now / 90) * 0.25;
          const band = 26 + k * 30;
          const edges: Dir[] = pincer ? [dir, ({ w: 'e', e: 'w', n: 's', s: 'n' } as Record<Dir, Dir>)[dir]] : [dir];
          for (const e of edges) {
            g.fillStyle(CAL.lava, pulse);
            if (e === 'w') g.fillRect(0, top, band, H - top);
            if (e === 'e') g.fillRect(W - band, top, band, H - top);
            if (e === 'n') g.fillRect(0, top, W, band);
            if (e === 's') g.fillRect(0, H - band, W, band);
            g.lineStyle(4, CAL.lavaHot, 0.5 + k * 0.4);
            for (let i = 0; i < 6; i++) {
              const t = (i + 0.5) / 6;
              const off = band + 20 + ((now / 8) % 40);
              let cx = 0, cy = 0, ax = 0, ay = 0;
              if (e === 'w') { cx = off; cy = top + (H - top) * t; ax = 1; }
              if (e === 'e') { cx = W - off; cy = top + (H - top) * t; ax = -1; }
              if (e === 'n') { cx = W * t; cy = top + off; ay = 1; }
              if (e === 's') { cx = W * t; cy = H - off; ay = -1; }
              const px = -ay, py = ax;
              g.lineBetween(cx - px * 12 - ax * 8, cy - py * 12 - ay * 8, cx, cy);
              g.lineBetween(cx + px * 12 - ax * 8, cy + py * 12 - ay * 8, cx, cy);
            }
          }
        }
        // The tide body.
        if (phase === 'rise' || phase === 'hold' || phase === 'ebb') {
          const rects: { x: number; y: number; w: number; h: number; e: Dir }[] = [];
          const add = (e: Dir, f: number): void => {
            if (e === 'w') rects.push({ x: 0, y: top, w: f, h: H - top, e });
            if (e === 'e') rects.push({ x: W - f, y: top, w: f, h: H - top, e });
            if (e === 'n') rects.push({ x: 0, y: top, w: W, h: f, e });
            if (e === 's') rects.push({ x: 0, y: H - f, w: W, h: f, e });
          };
          add(dir, front);
          if (pincer) add(({ w: 'e', e: 'w', n: 's', s: 'n' } as Record<Dir, Dir>)[dir], front);
          for (const r of rects) {
            g.fillStyle(CAL.lava, 0.94); g.fillRect(r.x, r.y, r.w, r.h);
            // Flow streaks travelling inward with the tide.
            const horiz = r.e === 'w' || r.e === 'e';
            const sign = r.e === 'w' || r.e === 'n' ? 1 : -1;
            g.lineStyle(3, CAL.lavaLit, 0.55);
            for (let i = 0; i < 18; i++) {
              const s = i * 53;
              const along = ((now / 6 + s * 7) % 400) / 400;
              if (horiz) {
                const x = sign > 0 ? r.x + along * r.w : r.x + r.w - along * r.w;
                const y = top + ((s * 13) % (H - top));
                g.lineBetween(x, y, x - sign * 22, y);
              } else {
                const y = sign > 0 ? r.y + along * r.h : r.y + r.h - along * r.h;
                const x = (s * 17) % W;
                g.lineBetween(x, y, x, y - sign * 22);
              }
            }
            // Floating crust rafts.
            for (let i = 0; i < 10; i++) {
              const s = i * 97;
              const fx = horiz ? r.x + ((s * 3 + now / 20) % Math.max(1, r.w)) : (s * 11) % W;
              const fy = horiz ? top + ((s * 7) % (H - top)) : r.y + ((s * 3 + now / 20) % Math.max(1, r.h));
              g.fillStyle(CAL.crust, 0.75); g.fillEllipse(fx, fy, 22 + (s % 9), 9);
            }
            // The front: a bright frothing crest.
            g.fillStyle(CAL.lavaHot, 0.9);
            for (let i = 0; i < 24; i++) {
              const t = i / 23;
              const wob = Math.sin(now / 120 + i * 1.3) * 6;
              if (r.e === 'w') g.fillCircle(r.x + r.w + wob, top + t * (H - top), 9);
              if (r.e === 'e') g.fillCircle(r.x + wob, top + t * (H - top), 9);
              if (r.e === 'n') g.fillCircle(t * W, r.y + r.h + wob, 9);
              if (r.e === 's') g.fillCircle(t * W, r.y + wob, 9);
            }
          }
        }
        // Slag skin after it ebbs.
        if (phase === 'slag') {
          const k = 1 - (now - phaseAt) / slagMs;
          g.fillStyle(CAL.crustMid, 0.45 * k); g.fillRect(0, top, W, H - top);
          g.lineStyle(1.5, CAL.lavaLit, 0.35 * k);
          for (let i = 0; i < 30; i++) {
            const x = (i * 211) % W, y = top + ((i * 137) % (H - top));
            g.lineBetween(x, y, x + 16, y + 6);
          }
        }
        // Islands: clustered basalt column tops standing proud of the shore.
        islands.forEach((isl, idx) => {
          const sink = idx === sinking && phase !== 'calm';
          const under = sink && (phase === 'rise' || phase === 'hold' || phase === 'ebb') && submerged(isl.x, isl.y);
          const drop = under ? 4 : 0;
          g.fillStyle(0x000000, 0.4); g.fillEllipse(isl.x, isl.y + 8, isl.r * 2.2, isl.r * 1.1);
          g.fillStyle(CAL.basaltDark, under ? 0.5 : 1); g.fillEllipse(isl.x, isl.y + 4 + drop, isl.r * 2.05, isl.r * 1.3);
          const cells: [number, number, number][] = [[0, 0, 0.42], [-0.55, -0.12, 0.34], [0.55, -0.1, 0.34], [-0.3, 0.38, 0.32], [0.3, 0.4, 0.32], [0, -0.48, 0.3], [-0.62, 0.32, 0.22], [0.64, 0.3, 0.22]];
          cells.forEach(([ox, oy, rr], ci) => {
            const lift = ((isl.seed + ci * 7) % 5) * 1.6;
            const cx = isl.x + ox * isl.r, cy = isl.y + oy * isl.r * 0.62 - lift + drop;
            const tone = ((isl.seed + ci * 3) % 4) / 10;
            g.fillStyle(mixC(CAL.basaltDark, CAL.basalt, 0.4), under ? 0.5 : 1);
            g.fillPoints(hexPts(cx, cy + 5, rr * isl.r, Math.PI / 6, 0.6), true, true);
            g.fillStyle(mixC(CAL.basaltMid, CAL.basaltLit, tone), under ? 0.45 : 1);
            g.fillPoints(hexPts(cx, cy, rr * isl.r, Math.PI / 6, 0.6), true, true);
            g.lineStyle(1, CAL.basaltLit, under ? 0.3 : 0.7);
            g.strokePoints(hexPts(cx, cy, rr * isl.r, Math.PI / 6, 0.6), true, true);
          });
          if (sink) {
            const pulse = 0.55 + Math.sin(now / 80) * 0.35;
            g.lineStyle(3, CAL.lavaHot, pulse);
            g.lineBetween(isl.x - isl.r * 0.7, isl.y - 8, isl.x - isl.r * 0.1, isl.y + 4);
            g.lineBetween(isl.x - isl.r * 0.1, isl.y + 4, isl.x + isl.r * 0.6, isl.y - 12);
            g.lineBetween(isl.x - isl.r * 0.1, isl.y + 4, isl.x + isl.r * 0.1, isl.y + isl.r * 0.45);
            g.lineStyle(2, 0xff3a1a, pulse * 0.7);
            g.strokeEllipse(isl.x, isl.y + 2, isl.r * 2.15, isl.r * 1.35);
          } else if (phase === 'warn' || phase === 'rise' || phase === 'hold') {
            g.lineStyle(2, 0xe8e2d8, 0.35 + Math.sin(now / 200) * 0.15);
            g.strokeEllipse(isl.x, isl.y + 2, isl.r * 2.15, isl.r * 1.35);
          }
        });
      },

      drawAir(g, time) {
        // Heat haze over the flood.
        if (phase !== 'hold' && phase !== 'rise') return;
        for (let i = 0; i < 12; i++) {
          const ph = (time / 900 + i / 12) % 1;
          const x = (i * 173 + time / 30) % W;
          const y = H - ph * (H - top);
          if (!submerged(x, y)) continue;
          g.fillStyle(CAL.lavaLit, (1 - ph) * 0.5); g.fillCircle(x, y, 2 + (1 - ph) * 2);
        }
      },

      drawHud(g, time) {
        // A tide gauge: a short bar under the HUD strip that fills toward the next flood.
        const x = W / 2 - 90, y = top + 10, w = 180;
        let k = 0;
        let col = CAL.basaltMid;
        if (phase === 'calm') { k = Math.min(1, (time - phaseAt) / calmMs); col = CAL.lavaLit; }
        else if (phase === 'warn') { k = 1; col = (Math.floor(time / 150) % 2) ? CAL.lavaHot : CAL.lava; }
        else if (phase === 'slag') { k = 0; }
        else { k = 1; col = CAL.lava; }
        g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 3, y - 3, w + 6, 12, 5);
        g.fillStyle(col, 0.95); g.fillRoundedRect(x, y, w * k, 6, 3);
      },

      destroy() { lastBurn.clear(); },
    };
  },
};
