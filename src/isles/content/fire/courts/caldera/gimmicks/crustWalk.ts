import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { CAL, makeClock } from '../palette';

/**
 * Crust Walk — Crustwalker Hekla.
 *
 * The whole floor is a skin of cooled crust laid over live lava, cut into plates. Every plate
 * takes *strain* while anyone stands on it — the cracks you can see spreading across it are
 * the strain meter — and a plate that reaches full strain gives way: for a few seconds it is a
 * square of open lava that burns and bogs down whoever is on it, then it skins over again.
 *
 * Hekla is a crustwalker: she never lingers, and every few seconds she *stomps* — the plate
 * under your feet is marked with her bootprint and takes a slab of strain a beat later. The
 * rule is symmetric, so the clever play is to fight her on plates she has already cracked:
 * every plate she flees from is one you can pin her against.
 */

const COLS = 8;
const ROWS = 5;
const DECAY = 0.22;
const STOMP_STRAIN = 0.42;
const COOL_MS = 1300;
const TICK_MS = 450;

interface Plate {
  col: number;
  row: number;
  poly: Pt[];
  cx: number;
  cy: number;
  /** Crack polylines radiating from the plate's weak point. Drawn up to `strain`. */
  cracks: Pt[][];
  strain: number;
  state: 'crust' | 'lava' | 'cooling';
  /** When the current lava / cooling state ends. */
  until: number;
  seed: number;
}

export const crustWalkGimmick: GimmickDef = {
  id: 'caldera-crust',
  rules: 'Plates crack under anyone who lingers, then run as lava. Hekla stomps the plate you stand on — keep moving.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, rng, hard } = ctx;
    const tick = makeClock();
    const x0 = 14, x1 = W - 14, y0 = top + 2, y1 = H - 6;
    const tw = (x1 - x0) / COLS, th = (y1 - y0) / ROWS;
    const strainPerSec = hard ? 1 / 1.1 : 1 / 1.45;
    const lavaMs = hard ? 3900 : 3100;
    const stompEvery = hard ? 4300 : 5600;
    const lavaTick = hard ? 9 : 8;

    // A jittered lattice so plates tessellate without looking like graph paper.
    const lattice: Pt[][] = [];
    for (let r = 0; r <= ROWS; r++) {
      const row: Pt[] = [];
      for (let c = 0; c <= COLS; c++) {
        const edge = r === 0 || r === ROWS || c === 0 || c === COLS;
        row.push({
          x: x0 + c * tw + (edge ? 0 : (rng() - 0.5) * tw * 0.28),
          y: y0 + r * th + (edge ? 0 : (rng() - 0.5) * th * 0.28),
        });
      }
      lattice.push(row);
    }

    const plates: Plate[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const poly = [lattice[r][c], lattice[r][c + 1], lattice[r + 1][c + 1], lattice[r + 1][c]];
        const cx = poly.reduce((s, p) => s + p.x, 0) / 4;
        const cy = poly.reduce((s, p) => s + p.y, 0) / 4;
        const wx = cx + (rng() - 0.5) * tw * 0.3, wy = cy + (rng() - 0.5) * th * 0.3;
        const cracks: Pt[][] = [];
        const n = 4 + Math.floor(rng() * 2);
        for (let k = 0; k < n; k++) {
          let a = (Math.PI * 2 * k) / n + rng() * 0.6;
          let px = wx, py = wy;
          const line: Pt[] = [{ x: px, y: py }];
          for (let s = 0; s < 4; s++) {
            const len = Math.min(tw, th) * (0.1 + rng() * 0.07);
            px += Math.cos(a) * len; py += Math.sin(a) * len;
            line.push({ x: px, y: py });
            a += (rng() - 0.5) * 0.9;
          }
          cracks.push(line);
        }
        plates.push({ col: c, row: r, poly, cx, cy, cracks, strain: rng() * 0.15, state: 'crust', until: 0, seed: Math.floor(rng() * 9999) });
      }
    }

    const plateAt = (x: number, y: number): Plate | null => {
      const c = Phaser.Math.Clamp(Math.floor((x - x0) / tw), 0, COLS - 1);
      const r = Phaser.Math.Clamp(Math.floor((y - y0) / th), 0, ROWS - 1);
      return plates[r * COLS + c] ?? null;
    };

    let stompAt = 3200;
    let stompMark: Plate | null = null;
    let stompLandsAt = 0;
    let firstBreak = true;
    const lastTick = new Map<Fighter, number>();
    let started = -1;

    const breakPlate = (p: Plate, now: number): void => {
      p.state = 'lava';
      p.until = now + lavaMs;
      p.strain = 1;
      ctx.flash(p.cx, p.cy, CAL.lavaLit);
      ctx.sfx('stone-slam');
      if (firstBreak) { firstBreak = false; ctx.float(p.cx, p.cy - 20, 'THE CRUST GIVES', '#ffa133'); }
    };

    const burn = (f: Fighter, now: number): void => {
      if (!f.active || f.hp <= 0) return;
      const pl = plateAt(f.x, f.y);
      if (!pl || pl.state !== 'lava') return;
      const last = lastTick.get(f) ?? 0;
      if (now - last < TICK_MS) return;
      lastTick.set(f, now);
      ctx.hit(f, lavaTick, f.x, f.y);
    };

    const onLava = (f: Fighter): boolean => {
      const pl = plateAt(f.x, f.y);
      return !!pl && pl.state === 'lava';
    };

    return {
      update(time: number) {
        const dt = tick(time);
        if (started < 0) { started = time; stompAt = time + 3200; }
        const occupied = new Map<Plate, number>();
        for (const f of [ctx.player, ctx.npc]) {
          if (!f.active || f.hp <= 0) continue;
          const pl = plateAt(f.x, f.y);
          if (pl) occupied.set(pl, (occupied.get(pl) ?? 0) + 1);
        }
        for (const p of plates) {
          if (p.state === 'lava') {
            if (time >= p.until) { p.state = 'cooling'; p.until = time + COOL_MS; p.strain = 0; ctx.sfx('sizzle'); }
            continue;
          }
          if (p.state === 'cooling') {
            if (time >= p.until) p.state = 'crust';
            continue;
          }
          const n = occupied.get(p) ?? 0;
          if (n > 0) p.strain += strainPerSec * n * dt;
          else p.strain = Math.max(0, p.strain - DECAY * dt);
          if (p.strain >= 1) breakPlate(p, time);
        }
        // Hekla's stomp: marks your plate, lands a beat later.
        if (!stompMark && time >= stompAt && ctx.npc.active && ctx.npc.hp > 0) {
          const pl = plateAt(ctx.player.x, ctx.player.y);
          if (pl && pl.state === 'crust') {
            stompMark = pl;
            stompLandsAt = time + (hard ? 850 : 1050);
            ctx.float(pl.cx, pl.cy - 24, 'STOMP!', '#ffcf7a');
            ctx.sfx('drum-hit');
          }
          stompAt = time + stompEvery;
        }
        if (stompMark && time >= stompLandsAt) {
          if (stompMark.state === 'crust') {
            stompMark.strain += STOMP_STRAIN;
            ctx.sfx('quake');
            if (stompMark.strain >= 1) breakPlate(stompMark, time);
          }
          stompMark = null;
        }
        burn(ctx.player, time);
        burn(ctx.npc, time);
      },

      playerSpeedMult: () => (onLava(ctx.player) ? 0.68 : 1),
      npcSpeedMult: () => (onLava(ctx.npc) ? 0.68 : 1),

      npcSeek(): Pt | null {
        const me = plateAt(ctx.npc.x, ctx.npc.y);
        if (!me || (me.state === 'crust' && me.strain < 0.5)) return null;
        // Step to the soundest plate nearby, leaning toward the player so she keeps pressure on.
        let best: Plate | null = null;
        let bestScore = Infinity;
        for (const p of plates) {
          if (p === me || p.state === 'lava') continue;
          const dc = Math.abs(p.col - me.col), dr = Math.abs(p.row - me.row);
          if (dc > 2 || dr > 2) continue;
          const toPlayer = Math.hypot(p.cx - ctx.player.x, p.cy - ctx.player.y);
          const score = p.strain * 400 + (dc + dr) * 40 + toPlayer * 0.25 + (p.state === 'cooling' ? -30 : 0);
          if (score < bestScore) { bestScore = score; best = p; }
        }
        return best ? { x: best.cx, y: best.cy } : null;
      },

      drawGround(g, time) {
        // The live lava under everything — only visible through the seams and broken plates.
        g.fillStyle(CAL.seam, 1);
        g.fillRect(x0 - 4, y0 - 2, x1 - x0 + 8, y1 - y0 + 6);
        const seamPulse = 0.35 + Math.sin(time / 420) * 0.12;
        g.fillStyle(CAL.lava, seamPulse);
        g.fillRect(x0 - 4, y0 - 2, x1 - x0 + 8, y1 - y0 + 6);

        for (const p of plates) {
          const inset = p.poly.map((q) => new Phaser.Geom.Point(p.cx + (q.x - p.cx) * 0.94, p.cy + (q.y - p.cy) * 0.94));
          if (p.state === 'lava') {
            const left = Math.max(0, (p.until - time) / lavaMs);
            g.fillStyle(CAL.lava, 1); g.fillPoints(inset, true, true);
            // Brighter core where it is still welling up.
            const core = p.poly.map((q) => new Phaser.Geom.Point(p.cx + (q.x - p.cx) * 0.6, p.cy + (q.y - p.cy) * 0.6));
            g.fillStyle(CAL.lavaLit, 0.55 + left * 0.35); g.fillPoints(core, true, true);
            // Slow convection bubbles and the first black flecks of the new skin forming.
            for (let i = 0; i < 5; i++) {
              const s = p.seed + i * 131;
              const ph = ((time / 900 + (s % 97) / 97) % 1);
              const bx = p.cx + Math.sin(s) * tw * 0.3, by = p.cy + Math.cos(s * 1.3) * th * 0.28;
              g.lineStyle(1.5, CAL.lavaHot, 1 - ph); g.strokeCircle(bx, by, 2 + ph * 6);
            }
            const flecks = Math.floor((1 - left) * 9);
            for (let i = 0; i < flecks; i++) {
              const s = p.seed + i * 53;
              g.fillStyle(CAL.crust, 0.85);
              g.fillEllipse(p.cx + Math.sin(s * 2.1) * tw * 0.34, p.cy + Math.cos(s * 1.7) * th * 0.32, 10 + (s % 7), 5 + (s % 4));
            }
            continue;
          }
          const k = p.state === 'cooling' ? 0 : p.strain;
          const shake = k > 0.75 ? Math.sin(time / 28 + p.seed) * 1.6 : 0;
          const pts = inset.map((q) => new Phaser.Geom.Point(q.x + shake, q.y));
          // The plate: dark crust, warming as it strains.
          g.fillStyle(mixC(CAL.crust, CAL.crustLit, k * 0.7), 1);
          g.fillPoints(pts, true, true);
          const bevel = p.poly.map((q) => new Phaser.Geom.Point(p.cx + (q.x - p.cx) * 0.82 + shake, p.cy + (q.y - p.cy) * 0.82 - 2));
          g.fillStyle(mixC(CAL.crustMid, CAL.crustLit, k * 0.5), 0.9);
          g.fillPoints(bevel, true, true);
          // Grain on the crust.
          for (let i = 0; i < 4; i++) {
            const s = p.seed + i * 71;
            g.fillStyle(CAL.crust, 0.6);
            g.fillEllipse(p.cx + Math.sin(s) * tw * 0.3 + shake, p.cy + Math.cos(s * 0.7) * th * 0.3, 14, 4);
          }
          if (p.state === 'cooling') {
            const t = (p.until - time) / COOL_MS;
            g.lineStyle(3, CAL.lavaLit, Math.max(0, t) * 0.8);
            g.strokePoints(pts, true, true);
            continue;
          }
          // The cracks are the strain meter: they lengthen and heat up as it climbs.
          if (k > 0.04) {
            const col = mixC(CAL.seam, CAL.lavaHot, k);
            for (const line of p.cracks) {
              const segs = (line.length - 1) * k;
              const whole = Math.floor(segs);
              g.lineStyle(1 + k * 2.6, col, 0.6 + k * 0.4);
              g.beginPath();
              g.moveTo(line[0].x + shake, line[0].y);
              for (let s = 1; s <= whole; s++) g.lineTo(line[s].x + shake, line[s].y);
              if (whole < line.length - 1) {
                const a = line[whole], b = line[whole + 1], f = segs - whole;
                g.lineTo(a.x + (b.x - a.x) * f + shake, a.y + (b.y - a.y) * f);
              }
              g.strokePath();
            }
            if (k > 0.75) {
              g.fillStyle(CAL.lavaHot, (k - 0.75) * 2.4 * (0.6 + Math.sin(time / 60) * 0.4));
              g.fillCircle(p.cracks[0][0].x + shake, p.cracks[0][0].y, 3 + k * 3);
            }
          }
        }

        // Hekla's bootprint on the marked plate.
        if (stompMark) {
          const left = Math.max(0, (stompLandsAt - time) / 1050);
          const p = stompMark;
          g.lineStyle(3, 0xffcf7a, 0.9 - left * 0.4);
          g.strokePoints(p.poly.map((q) => new Phaser.Geom.Point(p.cx + (q.x - p.cx) * 0.9, p.cy + (q.y - p.cy) * 0.9)), true, true);
          g.fillStyle(0x1a0c06, 0.75);
          g.fillEllipse(p.cx - 9, p.cy + 4, 16, 30);
          g.fillEllipse(p.cx + 9, p.cy - 6, 16, 30);
          g.fillStyle(0xffcf7a, 0.25 + (1 - left) * 0.4);
          g.fillCircle(p.cx, p.cy, 18 + (1 - left) * 30);
        }
      },

      drawAir(g) {
        // Your own plate's strain, as a small arc over your head — so you never have to squint at cracks.
        const p = ctx.player;
        const pl = plateAt(p.x, p.y);
        if (!pl || pl.state !== 'crust' || pl.strain < 0.2) return;
        const k = pl.strain;
        g.lineStyle(4, 0x000000, 0.5);
        g.beginPath(); g.arc(p.x, p.y - 44, 11, -Math.PI / 2, Math.PI * 1.5, false); g.strokePath();
        g.lineStyle(3, mixC(CAL.lavaLit, 0xff2a10, k), 0.95);
        g.beginPath(); g.arc(p.x, p.y - 44, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
      },

      destroy() { lastTick.clear(); },
    };
  },
};
