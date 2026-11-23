import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { OBS } from '../../../../../art/PinnacleArt';
import { OCHRE, OCHRE_LIT, SANDSTONE } from '../art';
import { type Who, WHO, alive, clamp, dist, poly } from '../util';

/**
 * Decree of the Polished Table — Councilor Ysolde Carrow, Seat of Facets (crystal).
 *
 * The floor is the top of a gem, seen from above: a brilliant cut — the table in the middle, a
 * ring of star facets round it, a ring of girdle facets round that, set in an ochre bezel. A
 * lapidary's wheel travels the stone and grinds one facet at a time (hurting and slowing whoever
 * stands under it); a facet it has finished is *polished* to a mirror for a while. Whoever stands
 * on a polished facet turns shots back: anything fired at them within arm's reach bounces back at
 * whoever threw it (a shot that cannot bounce shatters instead).
 *
 * A perfected Crystal fills the air with shards. Stand on the mirror and send them home.
 */

type G = Phaser.GameObjects.Graphics;

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, rng } = ctx;
  const C: Pt = { x: W / 2, y: (top + H) / 2 + 4 };
  const R0 = 92, R1 = 172, R2 = 252;
  const N = 17;
  const POLISH_MS = ctx.hard ? 9500 : 11500;
  const GRIND_MS = 2400;
  const WHEEL_R = 44;
  const SPEED = ctx.hard ? 200 : 170;
  const MIRROR_R = 52;
  const TAU = Math.PI * 2;
  const polishedAt = new Array<number>(N).fill(-1e9);
  const wheel = { x: C.x, y: top + 40, to: 0, state: 'travel' as 'travel' | 'grind', at: 0, spin: 0, tick: 0 };
  const glints: { x: number; y: number; t: number }[] = [];
  let lastChime = 0;
  let lastWord = 0;
  let started = false;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  /** Frost speckles on each facet, fixed for the fight. */
  const frost: Pt[][] = [];

  const facetAt = (x: number, y: number): number => {
    const r = dist(x, y, C.x, C.y);
    const a = (Math.atan2(y - C.y, x - C.x) + TAU) % TAU;
    if (r < R0) return 0;
    if (r < R1) return 1 + (Math.floor(((a + Math.PI / 8) % TAU) / (Math.PI / 4)) % 8);
    if (r < R2) return 9 + (Math.floor(a / (Math.PI / 4)) % 8);
    return -1;
  };
  const centroid = (i: number): Pt => {
    if (i === 0) return { ...C };
    const ring = i < 9 ? 0 : 1;
    const k = ring === 0 ? i - 1 : i - 9;
    const a = k * (Math.PI / 4) + (ring === 0 ? 0 : Math.PI / 8);
    const r = ring === 0 ? (R0 + R1) / 2 : (R1 + R2) / 2;
    return { x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r };
  };
  const shape = (i: number): Pt[] => {
    const at = (a: number, r: number): Pt => ({ x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r });
    if (i === 0) return Array.from({ length: 8 }, (_, k) => at(k * Math.PI / 4 + Math.PI / 8, R0 / Math.cos(Math.PI / 8)));
    if (i < 9) {
      const c = (i - 1) * Math.PI / 4;
      return [at(c - Math.PI / 8, R0 / Math.cos(Math.PI / 8)), at(c, R1), at(c + Math.PI / 8, R0 / Math.cos(Math.PI / 8))];
    }
    const c = (i - 9) * Math.PI / 4 + Math.PI / 8;
    return [at(c - Math.PI / 8, R1), at(c - Math.PI / 8, R2), at(c, R2 + 6), at(c + Math.PI / 8, R2), at(c + Math.PI / 8, R1), at(c, R1 + 18)];
  };
  for (let i = 0; i < N; i++) {
    const c = centroid(i);
    const r = i === 0 ? 70 : i < 9 ? 30 : 34;
    frost.push(Array.from({ length: 10 }, () => ({ x: c.x + (rng() - 0.5) * r * 1.6, y: c.y + (rng() - 0.5) * r * 1.2 })));
  }

  const polished = (i: number, time: number): boolean => i >= 0 && time - polishedAt[i] < POLISH_MS;

  const choose = (time: number) => {
    const p = ctx.player;
    let best = 0, bw = -1;
    for (let i = 0; i < N; i++) {
      if (polished(i, time) || i === wheel.to) continue;
      const c = centroid(i);
      const w = rng() * (1 + (dist(c.x, c.y, p.x, p.y) < 220 ? 1.6 : 0));
      if (w > bw) { bw = w; best = i; }
    }
    wheel.to = best;
    wheel.state = 'travel';
  };

  const mirror = (f: Fighter, who: Who, time: number) => {
    if (!polished(facetAt(f.x, f.y), time)) return;
    for (const s of ctx.shotsNear(f.x, f.y, MIRROR_R)) {
      if (s.owner === who) continue;
      const d = dist(s.x, s.y, f.x, f.y) || 1;
      const ok = s.reflect((s.x - f.x) / d, (s.y - f.y) / d);
      if (!ok) s.block();
      glints.push({ x: s.x, y: s.y, t: time });
      if (time - lastChime > 120) { lastChime = time; ctx.sfx('crystal-chime'); }
      if (time - lastWord > 1800) { lastWord = time; ctx.float(f.x, f.y - 54, ok ? 'RETURNED' : 'SHATTERED', '#e8deff'); }
    }
  };

  return {
    update(time, dt) {
      if (!started) {
        started = true;
        wheel.to = 0;
        wheel.state = 'travel';
        ctx.banner('THE TABLE IS TO BE POLISHED', '#e8deff');
      }
      wheel.spin += dt * (wheel.state === 'grind' ? 18 : 6);
      const tgt = centroid(wheel.to);
      if (wheel.state === 'travel') {
        const d = dist(wheel.x, wheel.y, tgt.x, tgt.y);
        const step = SPEED * clamp(dt, 0, 0.05);
        if (d <= step) {
          wheel.x = tgt.x; wheel.y = tgt.y;
          wheel.state = 'grind';
          wheel.at = time + GRIND_MS;
          wheel.tick = time;
          ctx.sfx('gear-turn');
        } else {
          wheel.x += (tgt.x - wheel.x) / d * step;
          wheel.y += (tgt.y - wheel.y) / d * step;
        }
      } else {
        if (time - wheel.tick >= 380) {
          wheel.tick = time;
          for (const w of WHO) {
            const f = fighter(w);
            if (alive(f) && dist(f.x, f.y, wheel.x, wheel.y) < WHEEL_R + 14) ctx.hit(f, 6, f.x, f.y);
          }
        }
        if (time >= wheel.at) {
          polishedAt[wheel.to] = time;
          ctx.sfx('crystal-shatter');
          ctx.flash(wheel.x, wheel.y, 0xe8deff);
          choose(time);
        }
      }
      for (const w of WHO) if (alive(fighter(w))) mirror(fighter(w), w, time);
      while (glints.length && time - glints[0].t > 420) glints.shift();
    },

    playerSpeedMult() {
      return wheel.state === 'grind' && dist(ctx.player.x, ctx.player.y, wheel.x, wheel.y) < WHEEL_R + 14 ? 0.7 : 1;
    },
    npcSpeedMult() {
      return wheel.state === 'grind' && dist(ctx.npc.x, ctx.npc.y, wheel.x, wheel.y) < WHEEL_R + 14 ? 0.7 : 1;
    },

    npcSeek() {
      const n = ctx.npc, time = ctx.scene.time.now;
      // Off the wheel first.
      if (wheel.state === 'grind' && dist(n.x, n.y, wheel.x, wheel.y) < WHEEL_R + 40) {
        const a = Math.atan2(n.y - wheel.y, n.x - wheel.x);
        return { x: clamp(wheel.x + Math.cos(a) * 130, 50, W - 50), y: clamp(wheel.y + Math.sin(a) * 130, top + 40, H - 40) };
      }
      // Then to the nearest mirror the wheel is not heading for.
      const here = facetAt(n.x, n.y);
      if (polished(here, time) && here !== wheel.to) return null;
      let best: Pt | null = null, bd = Infinity;
      for (let i = 0; i < N; i++) {
        if (!polished(i, time) || i === wheel.to) continue;
        const c = centroid(i);
        const d = dist(n.x, n.y, c.x, c.y);
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    },

    drawGround(g, time) {
      // The bezel: an ochre setting round the girdle.
      const ring = Array.from({ length: 32 }, (_, k) => ({ x: C.x + Math.cos(k * TAU / 32) * (R2 + 16), y: C.y + Math.sin(k * TAU / 32) * (R2 + 16) }));
      poly(g, ring, dim(OCHRE, 0.45), 0.9);
      for (let k = 0; k < 16; k++) {
        const a = k * TAU / 16;
        g.fillStyle(OCHRE_LIT, 0.7); g.fillCircle(C.x + Math.cos(a) * (R2 + 9), C.y + Math.sin(a) * (R2 + 9), 3);
      }
      for (let i = 0; i < N; i++) {
        const pts = shape(i);
        const age = time - polishedAt[i];
        const on = age < POLISH_MS;
        const fading = on && age > POLISH_MS - 1800 && Math.floor(time / 120) % 2 === 0;
        if (on && !fading) {
          // A mirror: dark and deep, a sweep of reflected light across it, a scatter of reflected stars.
          poly(g, pts, OBS.sheen, 0.95);
          const c = centroid(i);
          const sw = ((time / 1600) + i * 0.13) % 1;
          g.fillStyle(0xffffff, 0.12 + 0.1 * Math.sin(sw * Math.PI));
          g.fillTriangle(c.x - 30 + sw * 40, c.y - 26, c.x - 18 + sw * 40, c.y - 26, c.x - 40 + sw * 40, c.y + 26);
          for (const q of frost[i].slice(0, 5)) { g.fillStyle(0xffffff, 0.4 + 0.4 * Math.sin(time / 200 + q.x)); g.fillCircle(q.x, q.y, 1.1); }
        } else {
          // Rough: frosted, ground but not finished.
          poly(g, pts, OBS.facet, 0.7);
          for (const q of frost[i]) { g.fillStyle(0xbab0d8, 0.18); g.fillCircle(q.x, q.y, 2.2); }
        }
        g.lineStyle(1.2, OBS.edge, 0.6);
        g.strokePoints(pts.map((p) => ({ x: p.x, y: p.y })) as unknown as Phaser.Math.Vector2[], true);
      }
      // The brilliant's long cut lines, from the table's corners to the girdle.
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 + Math.PI / 8;
        g.lineStyle(1, OBS.edge, 0.25);
        g.lineBetween(C.x + Math.cos(a) * R0, C.y + Math.sin(a) * R0, C.x + Math.cos(a) * R2, C.y + Math.sin(a) * R2);
      }
      // Where the wheel is going: a dotted way and a ring on the facet.
      const tgt = centroid(wheel.to);
      if (wheel.state === 'travel') {
        const d = dist(wheel.x, wheel.y, tgt.x, tgt.y);
        for (let s = 18; s < d; s += 22) {
          const k = s / d;
          g.fillStyle(OBS.seamLit, 0.5); g.fillCircle(wheel.x + (tgt.x - wheel.x) * k, wheel.y + (tgt.y - wheel.y) * k, 2);
        }
      }
      const pulse = 0.5 + 0.5 * Math.sin(time / 120);
      g.lineStyle(2, wheel.state === 'grind' ? 0xffb08a : OBS.seamLit, 0.4 + pulse * 0.4);
      g.strokeCircle(tgt.x, tgt.y, WHEEL_R + 14);
      // Slurry round a grinding wheel.
      if (wheel.state === 'grind') {
        g.fillStyle(0xbab0d8, 0.22); g.fillEllipse(wheel.x, wheel.y + 6, (WHEEL_R + 24) * 2, (WHEEL_R + 10) * 1.2);
      }
    },

    drawAir(g, time) {
      // The wheel: a cast lap on a spindle, grooves turning, sparks of crystal dust off its rim.
      const x = wheel.x, y = wheel.y;
      g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 6, y + 14, WHEEL_R * 2.1, WHEEL_R * 0.9);
      g.fillStyle(dim(SANDSTONE, 0.55), 1); g.fillEllipse(x, y + 5, WHEEL_R * 2, WHEEL_R * 1.1);
      g.fillStyle(dim(SANDSTONE, 0.25), 1); g.fillEllipse(x, y, WHEEL_R * 2, WHEEL_R * 1.1);
      for (let k = 0; k < 10; k++) {
        const a = wheel.spin + k * TAU / 10;
        g.lineStyle(1.4, dim(SANDSTONE, 0.6), 0.8);
        g.lineBetween(x + Math.cos(a) * 10, y + Math.sin(a) * 5.5, x + Math.cos(a) * (WHEEL_R - 4), y + Math.sin(a) * (WHEEL_R - 4) * 0.55);
      }
      g.lineStyle(1.4, lit(SANDSTONE, 0.3), 0.9); g.strokeEllipse(x, y, WHEEL_R * 2, WHEEL_R * 1.1);
      g.fillStyle(OBS.facet, 1); g.fillCircle(x, y, 9);
      g.fillStyle(OBS.seamLit, 1); g.fillCircle(x, y, 3);
      // The spindle running up out of frame.
      g.fillStyle(OBS.glass, 1); g.fillRect(x - 4, top, 8, y - top - 6);
      g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(x + 4, top, x + 4, y - 6);
      if (wheel.state === 'grind') {
        for (let i = 0; i < 12; i++) {
          const ph = ((time / 260) + i / 12) % 1;
          const a = wheel.spin * 0.7 + i * 2.1;
          const sx = x + Math.cos(a) * (WHEEL_R + ph * 50), sy = y + Math.sin(a) * (WHEEL_R * 0.55 + ph * 28) - ph * 10;
          g.fillStyle(i % 3 ? 0xe8deff : OBS.seamLit, 1 - ph); g.fillCircle(sx, sy, 1.6);
        }
      }
      // Mirror-shod fighters: a faceted halo; returned shots leave a star of light.
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f) || !polished(facetAt(f.x, f.y), time)) continue;
        const r = MIRROR_R - 8;
        const pts = Array.from({ length: 6 }, (_, k) => ({ x: f.x + Math.cos(k * Math.PI / 3 + time / 900) * r, y: f.y + Math.sin(k * Math.PI / 3 + time / 900) * r * 0.8 }));
        g.lineStyle(1.4, 0xe8deff, 0.55);
        for (let k = 0; k < 6; k++) g.lineBetween(pts[k].x, pts[k].y, pts[(k + 1) % 6].x, pts[(k + 1) % 6].y);
      }
      for (const s of glints) {
        const k = (time - s.t) / 420;
        g.lineStyle(2 * (1 - k), 0xffffff, 1 - k);
        g.lineBetween(s.x - 10 - k * 8, s.y, s.x + 10 + k * 8, s.y);
        g.lineBetween(s.x, s.y - 10 - k * 8, s.x, s.y + 10 + k * 8);
      }
    },

    drawHud(g, time) {
      // A little diagram of the stone: lit facets are mirrors.
      const cx = W / 2, cy = top + 22, sc = 0.07;
      for (let i = 0; i < N; i++) {
        const pts = shape(i).map((p) => ({ x: cx + (p.x - C.x) * sc, y: cy + (p.y - C.y) * sc }));
        poly(g, pts, polished(i, time) ? 0xe8deff : OBS.facet, polished(i, time) ? 0.9 : 0.8);
      }
      const w = centroid(wheel.to);
      g.lineStyle(1.4, 0xffb08a, 0.9); g.strokeCircle(cx + (w.x - C.x) * sc, cy + (w.y - C.y) * sc, 4);
      g.lineStyle(1, OBS.edge, 0.7); g.strokeCircle(cx, cy, R2 * sc + 1);
    },
  };
};

export const DECREE_TABLE: GimmickDef = {
  id: 'bench-earth-table',
  rules: 'The wheel polishes the gem facet by facet and grinds whoever it sits on. Whoever stands on a polished facet turns shots back on the thrower.',
  make,
};
