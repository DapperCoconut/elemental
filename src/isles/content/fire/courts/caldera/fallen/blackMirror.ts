import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { CAL, dist, makeClock } from '../palette';

/**
 * Black Mirror — Glasscutter Obsa Vane (Gunpowder).
 *
 * Obsa cut the Kiln's window-glass, the polished black panes the King looked out of; in the
 * telling she cut them for him gladly. She fights among three of her best sheets, stood on
 * edge in iron easels and turning slowly on their feet. A shot that meets a pane's face banks
 * off it like a ball off a cushion and flies on, still its shooter's — cover for whoever hides
 * behind one, a bank shot for whoever reads the angle. Every bounce cracks the sheet; the fifth
 * crack shatters it into a ring of shards that cut both fighters, and Obsa scores a new one
 * elsewhere (its outline is scribed on the floor first).
 *
 * Halfway down she breathes on the glass and it goes *true black*: from then on a pane sends
 * every shot back at whoever fired it. Shoot through glass and you shoot yourself — and so does
 * she, if you stand where her musket has to go through a pane to find you.
 */

const HALF = 50;
const MAX_CRACKS = 5;
const SHARD_DMG = 10;
const PANE_HIT_R = 14;

interface Pane { x: number; y: number; a: number; spin: number; cracks: number[]; bornAt: number; scribing: boolean }
interface Shard { x: number; y: number; vx: number; vy: number; dieAt: number; rot: number }
interface Recent { x: number; y: number; t: number }

export const blackMirrorGimmick: GimmickDef = {
  id: fallenId('caldera', 'black-mirror'),
  rules: 'Obsidian panes bank shots and crack. Below half they turn true black and send every shot back at whoever fired it.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, rng } = ctx;
    const tick = makeClock();
    let black = false;
    let nowT = 0;
    let npcHurtAt = -9999;
    const panes: Pane[] = [
      { x: W * 0.3, y: top + 170, a: 0.5, spin: 0.22, cracks: [], bornAt: 0, scribing: false },
      { x: W * 0.7, y: top + 190, a: -0.6, spin: -0.18, cracks: [], bornAt: 0, scribing: false },
      { x: W * 0.5, y: H - 150, a: 0.1, spin: 0.2, cracks: [], bornAt: 0, scribing: false },
    ];
    const shards: Shard[] = [];
    const recent: Recent[] = [];

    const clampPt = (x: number, y: number): Pt => ({ x: Phaser.Math.Clamp(x, 70, W - 70), y: Phaser.Math.Clamp(y, top + 60, H - 60) });
    const ends = (p: Pane): [Pt, Pt] => {
      const c = Math.cos(p.a) * HALF, s = Math.sin(p.a) * HALF;
      return [{ x: p.x - c, y: p.y - s }, { x: p.x + c, y: p.y + s }];
    };
    /** Local coords: `along` the sheet and `perp` off its face. */
    const local = (p: Pane, x: number, y: number): { along: number; perp: number } => {
      const dx = x - p.x, dy = y - p.y, c = Math.cos(p.a), s = Math.sin(p.a);
      return { along: dx * c + dy * s, perp: -dx * s + dy * c };
    };
    const segCross = (a: Pt, b: Pt, c: Pt, d: Pt): boolean => {
      const o = (p: Pt, q: Pt, r: Pt): number => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
      return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
    };
    const blocking = (from: Fighter, to: Fighter): Pane | null => {
      for (const p of panes) {
        if (p.scribing) continue;
        const [e0, e1] = ends(p);
        if (segCross({ x: from.x, y: from.y }, { x: to.x, y: to.y }, e0, e1)) return p;
      }
      return null;
    };

    const shatter = (p: Pane, time: number): void => {
      ctx.sfx('crystal-shatter');
      ctx.flash(p.x, p.y, CAL.glassGleam);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + rng() * 0.3;
        shards.push({ x: p.x, y: p.y - 20, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, dieAt: time + 1500, rot: rng() * 6 });
      }
      // Obsa scores a new sheet somewhere clear of both fighters; it stands after the scribe.
      let spot: Pt = { x: p.x, y: p.y };
      for (let t = 0; t < 12; t++) {
        const c = clampPt(110 + rng() * (W - 220), top + 110 + rng() * (H - top - 220));
        const clear = [ctx.player, ctx.npc].every((f) => dist(f.x, f.y, c.x, c.y) > 120)
          && panes.every((o) => o === p || dist(o.x, o.y, c.x, c.y) > 170);
        if (clear) { spot = c; break; }
      }
      p.x = spot.x; p.y = spot.y; p.a = rng() * Math.PI; p.cracks = []; p.bornAt = time + 1700; p.scribing = true;
    };

    const pushOut = (f: Fighter): void => {
      if (!f.active) return;
      for (const p of panes) {
        if (p.scribing) continue;
        const l = local(p, f.x, f.y);
        if (Math.abs(l.along) > HALF + 6) continue;
        const min = 26;
        if (Math.abs(l.perp) < min) {
          const sgn = l.perp >= 0 ? 1 : -1, push = (min - Math.abs(l.perp)) * sgn;
          ctx.nudge(f, -Math.sin(p.a) * push, Math.cos(p.a) * push);
        }
      }
    };

    return {
      update(time: number) {
        const dt = tick(time);
        nowT = time;
        if (!black && ctx.npc.hp < ctx.npc.maxHp * 0.55) {
          black = true;
          ctx.banner('THE GLASS GOES TRUE BLACK', '#c9b8ff');
          ctx.sfx('curse-cast');
        }
        while (recent.length && time - recent[0].t > 160) recent.shift();
        for (const p of panes) {
          if (p.scribing) { if (time >= p.bornAt) { p.scribing = false; ctx.sfx('crystal-chime'); } continue; }
          p.a += p.spin * dt;
          for (const s of ctx.shotsNear(p.x, p.y, HALF + PANE_HIT_R)) {
            const l = local(p, s.x, s.y);
            if (Math.abs(l.along) > HALF + 4 || Math.abs(l.perp) > PANE_HIT_R) continue;
            const seen = recent.find((r) => dist(r.x, r.y, s.x, s.y) < 30);
            if (seen) { seen.x = s.x; seen.y = s.y; seen.t = time; continue; }
            recent.push({ x: s.x, y: s.y, t: time });
            const sgn = l.perp >= 0 ? 1 : -1;
            s.reflect(-Math.sin(p.a) * sgn, Math.cos(p.a) * sgn, !black);
            ctx.sfx(black ? 'prism' : 'clang');
            p.cracks.push(l.along);
            if (p.cracks.length >= MAX_CRACKS) { shatter(p, time); break; }
          }
        }
        for (let i = shards.length - 1; i >= 0; i--) {
          const s = shards[i];
          s.x += s.vx * dt; s.y += s.vy * dt; s.rot += dt * 9;
          let dead = time > s.dieAt;
          for (const f of [ctx.player, ctx.npc]) {
            if (!dead && f.active && f.hp > 0 && dist(f.x, f.y, s.x, s.y) < 22) { ctx.hit(f, SHARD_DMG, s.x, s.y); dead = true; }
          }
          if (dead) shards.splice(i, 1);
        }
        pushOut(ctx.player);
        pushOut(ctx.npc);
      },

      onNpcHurt() { npcHurtAt = nowT; },

      npcSeek(): Pt | null {
        const n = ctx.npc, pl = ctx.player;
        if (black) {
          // A true-black pane between her and her mark would return her own shot: step out of line.
          const p = blocking(n, pl);
          if (!p) return null;
          const a = Math.atan2(pl.y - n.y, pl.x - n.x) + Math.PI / 2;
          const side = Math.cos(a) * (n.x - p.x) + Math.sin(a) * (n.y - p.y) >= 0 ? 1 : -1;
          return clampPt(n.x + Math.cos(a) * 130 * side, n.y + Math.sin(a) * 130 * side);
        }
        // Clear glass: when she is taking hits, she ducks behind the nearest sheet.
        if (nowT - npcHurtAt > 1600) return null;
        let best: Pane | null = null, bd = 320;
        for (const p of panes) { if (p.scribing) continue; const d = dist(p.x, p.y, n.x, n.y); if (d < bd) { bd = d; best = p; } }
        if (!best) return null;
        const d = dist(pl.x, pl.y, best.x, best.y) || 1;
        return clampPt(best.x + ((best.x - pl.x) / d) * 48, best.y + ((best.y - pl.y) / d) * 48);
      },

      drawGround(g, time) {
        for (const p of panes) {
          const [e0, e1] = ends(p);
          if (p.scribing) {
            // The diamond's scribe line racing round the new sheet's footprint.
            const k = Phaser.Math.Clamp(1 - (p.bornAt - time) / 1700, 0, 1);
            g.lineStyle(1.5, CAL.glassGleam, 0.35 + 0.5 * k);
            g.lineBetween(e0.x, e0.y, e0.x + (e1.x - e0.x) * k, e0.y + (e1.y - e0.y) * k);
            g.fillStyle(0xffffff, 0.9); g.fillCircle(e0.x + (e1.x - e0.x) * k, e0.y + (e1.y - e0.y) * k, 2.5);
            continue;
          }
          // Shadow of the sheet and the iron feet of its easel.
          g.fillStyle(0x000000, 0.3);
          g.fillTriangle(e0.x, e0.y + 4, e1.x, e1.y + 4, p.x + 14, p.y + 22);
          for (const e of [e0, e1]) {
            g.fillStyle(CAL.iron, 1); g.fillRect(e.x - 7, e.y - 3, 14, 6);
            g.fillStyle(mixC(CAL.iron, 0xffffff, 0.2), 1); g.fillRect(e.x - 7, e.y - 3, 14, 2);
          }
        }
      },

      drawAir(g, time) {
        const glassTop = 58;
        for (const p of panes) {
          if (p.scribing) continue;
          const [e0, e1] = ends(p);
          // The sheet stood on edge: a dark quad rising from its foot, a violet gleam sliding
          // across it in clear glass, an ember rim when it has gone true black.
          const face = black ? 0x07060a : CAL.obsidianMid;
          g.fillStyle(face, 0.94);
          g.fillPoints([
            new Phaser.Geom.Point(e0.x, e0.y), new Phaser.Geom.Point(e1.x, e1.y),
            new Phaser.Geom.Point(e1.x, e1.y - glassTop), new Phaser.Geom.Point(e0.x, e0.y - glassTop),
          ], true, true);
          if (!black) {
            const k = ((time / 2400 + p.x * 0.001) % 1);
            const gx0 = e0.x + (e1.x - e0.x) * k, gy0 = e0.y + (e1.y - e0.y) * k;
            g.lineStyle(5, CAL.glassGleam, 0.18); g.lineBetween(gx0 - 6, gy0 - 4, gx0 + 8, gy0 - glassTop + 4);
            g.lineStyle(1.5, 0xffffff, 0.35); g.lineBetween(gx0 + 3, gy0 - 6, gx0 + 14, gy0 - glassTop + 8);
          } else {
            g.lineStyle(1.5, 0xffa040, 0.45 + Math.sin(time / 160 + p.x) * 0.2);
            g.strokePoints([
              new Phaser.Geom.Point(e0.x, e0.y), new Phaser.Geom.Point(e1.x, e1.y),
              new Phaser.Geom.Point(e1.x, e1.y - glassTop), new Phaser.Geom.Point(e0.x, e0.y - glassTop),
            ], true, true);
          }
          // Easel uprights clamping each edge.
          g.lineStyle(3, CAL.iron, 1);
          g.lineBetween(e0.x, e0.y, e0.x, e0.y - glassTop - 6);
          g.lineBetween(e1.x, e1.y, e1.x, e1.y - glassTop - 6);
          // Cracks: a star of jagged lines from each impact point, more as the sheet fails.
          p.cracks.forEach((al, i) => {
            const t = (al + HALF) / (HALF * 2);
            const cx = e0.x + (e1.x - e0.x) * t, cy = e0.y + (e1.y - e0.y) * t - glassTop * (0.3 + ((i * 37) % 5) / 10);
            g.lineStyle(1, black ? 0xffa040 : 0xdcd4f0, 0.8);
            for (let k = 0; k < 4; k++) {
              const a = k * 1.6 + i;
              const mx = cx + Math.cos(a) * 7, my = cy + Math.sin(a) * 6;
              g.lineBetween(cx, cy, mx, my);
              g.lineBetween(mx, my, mx + Math.cos(a + 0.6) * 8, my + Math.sin(a + 0.6) * 7);
            }
          });
        }
        // Flying shards: thin slivers turning over, catching the light.
        for (const s of shards) {
          const c = Math.cos(s.rot) * 7, sn = Math.sin(s.rot) * 7;
          g.fillStyle(CAL.obsidianLit, 1); g.fillTriangle(s.x - c, s.y - sn, s.x + c, s.y + sn, s.x + sn * 0.3, s.y - c * 0.3);
          g.lineStyle(1, CAL.glassGleam, 0.8); g.lineBetween(s.x - c, s.y - sn, s.x + c, s.y + sn);
        }
      },

      drawHud(g) {
        // Three little sheets, top-left of the field: their cracks, and clear or black.
        panes.forEach((p, i) => {
          const x = 30 + i * 30, y = top + 12;
          g.fillStyle(0x000000, 0.5); g.fillRect(x - 11, y - 3, 22, 32);
          g.fillStyle(p.scribing ? 0x2a2630 : black ? 0x07060a : CAL.obsidianLit, 1); g.fillRect(x - 8, y, 16, 26);
          if (black) { g.lineStyle(1, 0xffa040, 0.8); g.strokeRect(x - 8, y, 16, 26); }
          for (let k = 0; k < MAX_CRACKS; k++) {
            g.fillStyle(k < p.cracks.length ? 0xffa040 : 0x3a3247, 1);
            g.fillRect(x - 8 + k * 3.4, y + 29, 2.4, 3);
          }
        });
      },

      destroy() { shards.length = 0; recent.length = 0; },
    };
  },
};
