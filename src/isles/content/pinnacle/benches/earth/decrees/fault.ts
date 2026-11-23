import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { OBS, crackPath, seam, shard } from '../../../../../art/PinnacleArt';
import { OCHRE, SANDSTONE, STRATA, UMBER } from '../art';
import { type Who, WHO, alive, clamp, dist, poly, segDist } from '../util';

/**
 * Decree of the Fault — Councilor Ossian Bedwell, Seat of Bedrock (earth).
 *
 * The ground answers to the Seat of Bedrock. Every few seconds the councilor *files a fault*: a
 * violet crack creeps across the floor near the challenger. When it opens, anyone on the line is
 * swallowed (stunned, hurt) and anyone near it is thrown clear — except the councilor, who is
 * perfected Earth and cannot be moved. The fault then stands as a SCARP: a ridge of black glass with
 * the Hold's strata in its face, which stops every shot from either side. Strike a scarp three times
 * and it topples flat onto the side away from you, crushing whoever sheltered there.
 *
 * The councilor likes to hide behind her scarps. That is the trick.
 */

type G = Phaser.GameObjects.Graphics;

interface Fault {
  a: Pt;
  b: Pt;
  /** Unit left normal of a→b. */
  nx: number;
  ny: number;
  len: number;
  state: 'warn' | 'scarp' | 'topple' | 'rubble';
  /** When the current state ends (ms). */
  at: number;
  /** When the current state began (ms). */
  since: number;
  path: Pt[];
  segs: StrikeTarget[];
  blows: Record<Who, number>;
  lastBlow: Record<Who, number>;
  /** The side (+1 / −1 along the normal) the scarp falls toward. */
  fall: number;
  /** Shard tips along the ridge (seeded offsets). */
  teeth: number[];
}

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, rng } = ctx;
  const WARN = ctx.hard ? 1800 : 2200;
  const EVERY = ctx.hard ? 6400 : 7800;
  const SCARP_MS = 9500;
  const TOPPLE_MS = 650;
  const RUBBLE_MS = 1600;
  const SWALLOW_R = 26;
  const THROW_R = 100;
  const FALL_DEPTH = 100;
  const RIDGE = 12;
  const HEIGHT = 15;
  const faults: Fault[] = [];
  let nextAt = 0;
  let firstTopple = true;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);

  const file = (time: number) => {
    // Older scarps crumble so no more than two ever stand.
    const standing = faults.filter((f) => f.state === 'scarp');
    if (standing.length >= 2) crumble(standing[0], time);
    const p = ctx.player;
    const ang = rng() * Math.PI;
    const len = 420 + rng() * 160;
    const cx = clamp(p.x + (rng() - 0.5) * 220, 160, W - 160);
    const cy = clamp(p.y + (rng() - 0.5) * 160, top + 110, H - 110);
    const a = { x: clamp(cx - Math.cos(ang) * len / 2, 40, W - 40), y: clamp(cy - Math.sin(ang) * len / 2, top + 30, H - 30) };
    const b = { x: clamp(cx + Math.cos(ang) * len / 2, 40, W - 40), y: clamp(cy + Math.sin(ang) * len / 2, top + 30, H - 30) };
    const real = dist(a.x, a.y, b.x, b.y) || 1;
    faults.push({
      a, b, nx: -(b.y - a.y) / real, ny: (b.x - a.x) / real, len: real,
      state: 'warn', at: time + ctx.tk.warn(WARN), since: time,
      path: crackPath(a, b, rng, 12, 12), segs: [],
      blows: { player: 0, npc: 0 }, lastBlow: { player: -9999, npc: -9999 }, fall: 1,
      teeth: Array.from({ length: Math.ceil(real / 36) }, () => rng()),
    });
    if (faults.length === 1) ctx.banner('A FAULT IS FILED', '#c9b0ff');
    ctx.sfx('stone-rise');
  };

  const rupture = (f: Fault, time: number) => {
    ctx.sfx('quake');
    for (const w of WHO) {
      const ft = fighter(w);
      if (!alive(ft)) continue;
      const s = segDist(ft.x, ft.y, f.a, f.b);
      if (s.d < SWALLOW_R) {
        ctx.hit(ft, 20, ft.x, ft.y);
        ctx.stun(ft, 1100);
        ctx.float(ft.x, ft.y - 50, 'SWALLOWED', '#c9b0ff');
        ctx.flash(ft.x, ft.y, OBS.seamLit);
      } else if (s.d < THROW_R) {
        ctx.hit(ft, 9, ft.x, ft.y);
        if (w === 'npc') ctx.float(ft.x, ft.y - 50, 'UNMOVED', '#e8c27e');
        else {
          const push = 70 + (THROW_R - s.d) * 0.9;
          ctx.nudge(ft, f.nx * s.side * push, f.ny * s.side * push);
          ctx.float(ft.x, ft.y - 50, 'THROWN', '#e8c27e');
        }
      }
    }
    f.state = 'scarp';
    f.since = time;
    f.at = time + SCARP_MS;
    const n = Math.max(2, Math.ceil(f.len / 34));
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n;
      f.segs.push(ctx.target({ x: f.a.x + (f.b.x - f.a.x) * k, y: f.a.y + (f.b.y - f.a.y) * k, r: 19, onStruck: (by) => blow(f, by) }));
    }
  };

  const blow = (f: Fault, by: Who) => {
    if (f.state !== 'scarp') return;
    const time = ctx.scene.time.now;
    if (time - f.lastBlow[by] < 260) return;
    f.lastBlow[by] = time;
    f.blows[by]++;
    ctx.sfx('stone-slam');
    if (f.blows[by] < 3) return;
    const striker = fighter(by);
    const side = segDist(striker.x, striker.y, f.a, f.b).side;
    f.fall = -side;
    f.state = 'topple';
    f.since = time;
    f.at = time + TOPPLE_MS;
    if (firstTopple) { firstTopple = false; ctx.banner('THE SCARP FALLS', '#e8c27e'); }
  };

  const crush = (f: Fault, time: number) => {
    for (const w of WHO) {
      const ft = fighter(w);
      if (!alive(ft)) continue;
      const s = segDist(ft.x, ft.y, f.a, f.b);
      if (s.side === f.fall && s.d <= FALL_DEPTH && s.t > 0.001 && s.t < 0.999) {
        ctx.hit(ft, 22, ft.x, ft.y);
        ctx.stun(ft, 700);
        ctx.float(ft.x, ft.y - 50, 'CRUSHED', '#ffb08a');
      }
    }
    ctx.sfx('gravity-slam');
    crumble(f, time);
  };

  const crumble = (f: Fault, time: number) => {
    for (const s of f.segs) s.remove();
    f.segs = [];
    f.state = 'rubble';
    f.since = time;
    f.at = time + RUBBLE_MS;
  };

  /** The ridge's outline, raised by `lift` px (0 = its foot on the floor). */
  const ridge = (f: Fault, lift: number, half = RIDGE): Pt[] => [
    { x: f.a.x + f.nx * half, y: f.a.y + f.ny * half - lift }, { x: f.b.x + f.nx * half, y: f.b.y + f.ny * half - lift },
    { x: f.b.x - f.nx * half, y: f.b.y - f.ny * half - lift }, { x: f.a.x - f.nx * half, y: f.a.y - f.ny * half - lift },
  ];

  const drawScarp = (g: G, f: Fault, time: number, fade: number) => {
    // Shadow, foot, the strata face, then the lit top with its teeth.
    poly(g, ridge(f, -8, RIDGE + 4), 0x000000, 0.35 * fade);
    poly(g, ridge(f, 0), OBS.glass, fade);
    const foot = ridge(f, 0), crest = ridge(f, HEIGHT);
    // The face toward the viewer: whichever long edge sits lower on screen.
    const lowSide = f.ny > 0 ? [foot[0], foot[1], crest[1], crest[0]] : [foot[3], foot[2], crest[2], crest[3]];
    poly(g, lowSide, dim(UMBER, 0.2), fade);
    for (let i = 1; i <= 3; i++) {
      const k = i / 4;
      const p0 = { x: lowSide[0].x, y: lowSide[0].y + (lowSide[3].y - lowSide[0].y) * k };
      const p1 = { x: lowSide[1].x, y: lowSide[1].y + (lowSide[2].y - lowSide[1].y) * k };
      g.lineStyle(2.4, STRATA[(i * 2) % STRATA.length], 0.75 * fade);
      g.lineBetween(p0.x, p0.y, p1.x, p1.y);
    }
    poly(g, crest, OBS.facet, fade);
    g.lineStyle(1.3, OBS.edge, 0.8 * fade);
    g.lineBetween(crest[0].x, crest[0].y, crest[1].x, crest[1].y);
    g.lineBetween(crest[3].x, crest[3].y, crest[2].x, crest[2].y);
    f.teeth.forEach((r, i) => {
      const k = (i + 0.5) / f.teeth.length;
      const x = f.a.x + (f.b.x - f.a.x) * k, y = f.a.y + (f.b.y - f.a.y) * k - HEIGHT;
      shard(g, x, y + 4, 14 + r * 8, 10 + r * 12, (r - 0.5) * 8, 0.3);
    });
    // Cracks for each blow, from whichever side struck it.
    const hits = Math.max(f.blows.player, f.blows.npc);
    for (let i = 0; i < hits; i++) {
      const k = 0.2 + i * 0.3;
      const x = f.a.x + (f.b.x - f.a.x) * k, y = f.a.y + (f.b.y - f.a.y) * k - HEIGHT;
      seam(g, [{ x: x - 6, y: y - 6 }, { x: x + 3, y: y + 3 }, { x: x - 2, y: y + 12 }, { x: x + 5, y: y + 20 }], 1.2, fade, 0.6 + 0.4 * Math.sin(time / 90));
    }
    // A faint warning stripe on the side it would fall to, once it has been struck at all.
    if (hits > 0) {
      const side = f.blows.player >= f.blows.npc ? -segDist(ctx.player.x, ctx.player.y, f.a, f.b).side : -segDist(ctx.npc.x, ctx.npc.y, f.a, f.b).side;
      const ox = f.nx * side * FALL_DEPTH, oy = f.ny * side * FALL_DEPTH;
      poly(g, [f.a, f.b, { x: f.b.x + ox, y: f.b.y + oy }, { x: f.a.x + ox, y: f.a.y + oy }], OBS.seam, 0.04 * hits * fade);
    }
  };

  return {
    update(time) {
      if (nextAt === 0) nextAt = time + 2600;
      if (time >= nextAt) { nextAt = time + EVERY; file(time); }
      for (let i = faults.length - 1; i >= 0; i--) {
        const f = faults[i];
        if (time < f.at) continue;
        if (f.state === 'warn') rupture(f, time);
        else if (f.state === 'scarp') crumble(f, time);
        else if (f.state === 'topple') crush(f, time);
        else faults.splice(i, 1);
      }
    },

    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      // Off a filed line, on her own side of it.
      for (const f of faults) {
        if (f.state !== 'warn') continue;
        const s = segDist(n.x, n.y, f.a, f.b);
        if (s.d > 130) continue;
        const px = f.a.x + (f.b.x - f.a.x) * s.t, py = f.a.y + (f.b.y - f.a.y) * s.t;
        return { x: clamp(px + f.nx * s.side * 160, 50, W - 50), y: clamp(py + f.ny * s.side * 160, top + 40, H - 40) };
      }
      // Behind a standing scarp, with the ridge between her and the challenger.
      for (const f of faults) {
        if (f.state !== 'scarp') continue;
        const sp = segDist(p.x, p.y, f.a, f.b);
        const mid = { x: (f.a.x + f.b.x) / 2, y: (f.a.y + f.b.y) / 2 };
        if (dist(n.x, n.y, mid.x, mid.y) > 340) continue;
        return { x: clamp(mid.x - f.nx * sp.side * 70, 50, W - 50), y: clamp(mid.y - f.ny * sp.side * 70, top + 40, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const f of faults) {
        if (f.state === 'warn') {
          const k = clamp((time - f.since) / (f.at - f.since), 0, 1);
          // The danger bands: the throw zone faint, the line itself hot.
          const tx = f.nx * THROW_R, ty = f.ny * THROW_R;
          poly(g, [{ x: f.a.x + tx, y: f.a.y + ty }, { x: f.b.x + tx, y: f.b.y + ty }, { x: f.b.x - tx, y: f.b.y - ty }, { x: f.a.x - tx, y: f.a.y - ty }], OBS.seam, 0.04 + k * 0.07);
          const sx = f.nx * SWALLOW_R, sy = f.ny * SWALLOW_R;
          const blink = k > 0.75 && Math.floor(time / 100) % 2 === 0;
          poly(g, [{ x: f.a.x + sx, y: f.a.y + sy }, { x: f.b.x + sx, y: f.b.y + sy }, { x: f.b.x - sx, y: f.b.y - sy }, { x: f.a.x - sx, y: f.a.y - sy }], blink ? OBS.seamLit : OBS.seam, 0.1 + k * 0.14);
          // The crack creeping along, ochre strata glinting in it.
          const n = Math.max(2, Math.ceil(f.path.length * Math.min(1, k * 1.4)));
          const part = f.path.slice(0, n);
          seam(g, part, 1.6 + k * 1.6, 1, k);
          g.lineStyle(1, OCHRE, 0.6 * k);
          g.beginPath(); g.moveTo(part[0].x, part[0].y + 1); for (const q of part) g.lineTo(q.x, q.y + 1); g.strokePath();
          // Dust spurting up along the crack front.
          const tip = part[part.length - 1];
          for (let i = 0; i < 5; i++) {
            const ph = ((time / 300) + i * 0.2) % 1;
            g.fillStyle(SANDSTONE, 0.5 * (1 - ph));
            g.fillCircle(tip.x + Math.cos(i * 1.7) * ph * 18, tip.y - ph * 22, 2 + ph * 3);
          }
        } else if (f.state === 'scarp') {
          const rise = clamp((time - f.since) / 220, 0, 1);
          drawScarp(g, f, time, rise);
        } else if (f.state === 'rubble') {
          const fade = 1 - clamp((time - f.since) / RUBBLE_MS, 0, 1);
          f.teeth.forEach((r, i) => {
            const k = (i + 0.5) / f.teeth.length;
            const x = f.a.x + (f.b.x - f.a.x) * k + f.nx * f.fall * r * 60, y = f.a.y + (f.b.y - f.a.y) * k + f.ny * f.fall * r * 60;
            g.fillStyle(OBS.facet, fade); g.fillTriangle(x - 7, y + 3, x + 6, y + 4, x + (r - 0.5) * 6, y - 8 - r * 6);
            g.fillStyle(STRATA[i % 6], 0.6 * fade); g.fillRect(x - 3, y, 6, 2);
          });
        }
      }
    },

    drawAir(g, time) {
      for (const f of faults) {
        if (f.state !== 'topple') continue;
        const k = clamp((time - f.since) / TOPPLE_MS, 0, 1);
        const e = k * k;
        // The landing strip, bright — then the slab swinging down onto it.
        const ox = f.nx * f.fall * FALL_DEPTH, oy = f.ny * f.fall * FALL_DEPTH;
        poly(g, [f.a, f.b, { x: f.b.x + ox, y: f.b.y + oy }, { x: f.a.x + ox, y: f.a.y + oy }], 0xffb08a, 0.12 + 0.2 * k);
        const reach = e * FALL_DEPTH;
        const lift = (1 - e) * (HEIGHT + 40);
        const far = [{ x: f.b.x + f.nx * f.fall * reach, y: f.b.y + f.ny * f.fall * reach - lift }, { x: f.a.x + f.nx * f.fall * reach, y: f.a.y + f.ny * f.fall * reach - lift }];
        poly(g, [f.a, f.b, far[0], far[1]], OBS.glass, 1);
        poly(g, [
          { x: (f.a.x + far[1].x) / 2, y: (f.a.y + far[1].y) / 2 }, { x: (f.b.x + far[0].x) / 2, y: (f.b.y + far[0].y) / 2 }, far[0], far[1],
        ], OBS.facet, 1);
        for (let i = 1; i <= 3; i++) {
          const q = i / 4;
          g.lineStyle(2, STRATA[(i * 3) % STRATA.length], 0.7);
          g.lineBetween(f.a.x + (far[1].x - f.a.x) * q, f.a.y + (far[1].y - f.a.y) * q, f.b.x + (far[0].x - f.b.x) * q, f.b.y + (far[0].y - f.b.y) * q);
        }
        g.lineStyle(1.4, OBS.edge, 0.9); g.lineBetween(far[0].x, far[0].y, far[1].x, far[1].y);
      }
      // The swallowed: violet glass closing round their feet.
      for (const w of WHO) {
        const ft = fighter(w);
        for (const f of faults) {
          if (f.state !== 'scarp' || time - f.since > 1100) continue;
          if (segDist(ft.x, ft.y, f.a, f.b).d > SWALLOW_R + 6) continue;
          const k = (time - f.since) / 1100;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            shard(g, ft.x + Math.cos(a) * 16, ft.y + 14 + Math.sin(a) * 6, 10, 22 * (1 - k * 0.6), Math.cos(a) * -4, 0.4);
          }
        }
      }
    },

    drawHud(g, time) {
      // A plaque at the top: the next filing, as a crack running across a stone tablet.
      const cx = W / 2, cy = top + 18;
      const k = clamp(1 - (nextAt - time) / EVERY, 0, 1);
      g.fillStyle(OBS.glass, 0.9); g.fillRect(cx - 90, cy - 9, 180, 18);
      g.lineStyle(1.2, OBS.edge, 0.7); g.strokeRect(cx - 90, cy - 9, 180, 18);
      g.fillStyle(dim(OCHRE, 0.3), 1); g.fillRect(cx - 84, cy - 4, 168, 8);
      g.lineStyle(2, lit(OBS.seam, k * 0.4), 0.9);
      g.beginPath();
      g.moveTo(cx - 84, cy);
      for (let i = 1; i <= 12; i++) {
        const x = cx - 84 + (168 * i) / 12;
        if (x > cx - 84 + 168 * k) break;
        g.lineTo(x, cy + (i % 2 ? -3 : 3));
      }
      g.strokePath();
    },

    destroy() {
      for (const f of faults) for (const s of f.segs) s.remove();
      faults.length = 0;
    },
  };
};

export const DECREE_FAULT: GimmickDef = {
  id: 'bench-earth-fault',
  rules: 'A filed fault opens: on the line, swallowed; near it, thrown (the Seat is never moved). It stands as a scarp that stops shots. Three blows topple it onto its far side.',
  make,
};
