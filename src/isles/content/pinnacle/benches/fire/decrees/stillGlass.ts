import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../../art/IsleArt';
import { OBS, seam } from '../../../../../art/PinnacleArt';
import { EMB } from '../art';
import { WHO, type Who, alive, clamp, dist, side, stepDt } from './util';

/**
 * Decree of the Still Glass — Councilor Petra Slagge, Seat of the Caldera.
 *
 * Slagge wrote the rendering clause and appointed Basalt, the prince who never moved. In her room
 * whatever stands still cools as lava does — into obsidian:
 *
 *  - Standing still (or near it) grows a coat of black glass on a fighter, facet by facet from the
 *    feet up. Moving sheds it slowly; a dash bursts a third of it off at once.
 *  - The coat is ARMOUR (up to 35% less damage taken) and it holds the heat in (cooldowns up to
 *    1.5× faster). Turrets are rewarded.
 *  - At a full coat you are GLASSED: held fast (a real root) and the armour is gone. The first
 *    blow to land on glassed glass SHATTERS it — a heavy bonus hit and the coat is lost.
 *
 * A perfected Magma bot plants volcanoes, parks pools on them and stands among its cones — it
 * glasses up. It knows the rule: it steps off before it is full, and closes in when *you* are
 * about to glass. A clever player lets it turret, watches its coat, and is in its face with a
 * blow ready the moment it goes rigid.
 */

const STILL_SPEED = 46;
const GROW_PER_S = 26;
const SHED_PER_S = 22;
const DASH_SHED = 34;
const ARMOUR = 0.35;
const HASTE = 0.5;
const GLASSED_MS = 1500;
const BRITTLE_MS = 700;
const AFTER = 35;

interface Coat {
  glass: number;
  lx: number; ly: number;
  /** Held fast until; brittle (shatterable) until `brittleUntil`. */
  heldUntil: number;
  brittleUntil: number;
  shatterAt: number;
  dashShedAt: number;
  /** Fixed facet layout for this fighter's coat. */
  facets: { a: number; r: number; w: number; h: number }[];
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const SHATTER = ctx.hard ? 24 : 20;
  const grow = GROW_PER_S * (ctx.hard ? 1.15 : 1);
  const facets = () => Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2 + rng() * 0.3, r: 18 + rng() * 6, w: 10 + rng() * 6, h: 14 + rng() * 10 }));
  const coats: Record<Who, Coat> = {
    player: { glass: 0, lx: ctx.player.x, ly: ctx.player.y, heldUntil: 0, brittleUntil: 0, shatterAt: -9999, dashShedAt: -9999, facets: facets() },
    npc: { glass: 0, lx: ctx.npc.x, ly: ctx.npc.y, heldUntil: 0, brittleUntil: 0, shatterAt: -9999, dashShedAt: -9999, facets: facets() },
  };
  let guard = false;
  let shards: { x: number; y: number; vx: number; vy: number; born: number; s: number }[] = [];
  const brittle = (w: Who, now: number) => now < coats[w].brittleUntil;
  const armourOf = (w: Who, now: number) => (brittle(w, now) ? 1 : 1 - ARMOUR * (coats[w].glass / 100));

  function glassed(w: Who, time: number): void {
    const f = side(ctx, w);
    const c = coats[w];
    c.glass = 100;
    c.heldUntil = time + GLASSED_MS;
    c.brittleUntil = time + GLASSED_MS + BRITTLE_MS;
    ctx.root(f, GLASSED_MS);
    ctx.float(f.x, f.y - 52, 'GLASSED', '#c9b0ff');
    ctx.sfx('crystal-chime');
    ctx.flash(f.x, f.y, OBS.seamLit);
  }

  function shatter(w: Who, time: number): void {
    const f = side(ctx, w);
    const c = coats[w];
    c.glass = 0;
    c.brittleUntil = 0;
    c.heldUntil = 0;
    c.shatterAt = time;
    guard = true;
    try { ctx.hit(f, SHATTER, f.x, f.y); } finally { guard = false; }
    ctx.float(f.x, f.y - 58, 'SHATTERED', '#ffe8b8');
    ctx.sfx('crystal-shatter');
    ctx.flash(f.x, f.y, EMB.core);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rng() * 0.3;
      const sp = 140 + rng() * 160;
      shards.push({ x: f.x, y: f.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, born: time, s: 4 + rng() * 5 });
    }
  }

  function hurt(w: Who): void {
    if (guard) return;
    const now = ctx.scene.time.now;
    if (brittle(w, now) && alive(side(ctx, w))) shatter(w, now);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      for (const w of WHO) {
        const f = side(ctx, w);
        const c = coats[w];
        if (!alive(f)) continue;
        const moved = dt > 0 ? dist(f.x, f.y, c.lx, c.ly) / dt : 0;
        c.lx = f.x; c.ly = f.y;
        if (time < c.brittleUntil) continue;
        if (c.brittleUntil > 0) {
          // Nobody struck it in time: the coat sloughs to a crust and the fighter walks out.
          c.brittleUntil = 0;
          c.glass = AFTER;
          ctx.sfx('crystal-chime');
        }
        if (ctx.dashing(f) && time - c.dashShedAt > 400 && c.glass > 2) {
          c.dashShedAt = time;
          c.glass = Math.max(0, c.glass - DASH_SHED);
          for (let i = 0; i < 6; i++) {
            const a = rng() * Math.PI * 2;
            shards.push({ x: f.x, y: f.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - 30, born: time, s: 2.5 + rng() * 2.5 });
          }
        }
        if (moved < STILL_SPEED) c.glass = Math.min(100, c.glass + grow * dt);
        else c.glass = Math.max(0, c.glass - SHED_PER_S * dt);
        if (c.glass >= 100) glassed(w, time);
      }
      shards = shards.filter((s) => time - s.born < 900);
    },

    playerTakenMult() { return armourOf('player', ctx.scene.time.now); },
    npcTakenMult() { return armourOf('npc', ctx.scene.time.now); },
    playerCooldownRate() { return 1 + HASTE * (coats.player.glass / 100); },
    npcCooldownRate() { return 1 + HASTE * (coats.npc.glass / 100); },
    onPlayerHurt(amount) { if (amount > 0) hurt('player'); },
    onNpcHurt(amount) { if (amount > 0) hurt('npc'); },

    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      if (!alive(n) || !alive(p)) return null;
      const now = ctx.scene.time.now;
      // The challenger is rigid: be on them.
      if (brittle('player', now) || coats.player.glass > 72) return { x: p.x + (n.x < p.x ? -46 : 46), y: p.y };
      // Its own coat is getting heavy: walk it off — a slow strafe round the challenger.
      if (coats.npc.glass > 58) {
        const a = Math.atan2(n.y - p.y, n.x - p.x) + 0.9;
        const r = clamp(dist(n.x, n.y, p.x, p.y), 160, 300);
        return { x: clamp(p.x + Math.cos(a) * r, 60, W - 60), y: clamp(p.y + Math.sin(a) * r, top + 60, H - 50) };
      }
      return null;
    },

    drawGround(g, time) {
      // Cooling rings round anyone standing still: the floor's own glass creeping toward them.
      for (const w of WHO) {
        const f = side(ctx, w);
        const c = coats[w];
        if (!alive(f) || c.glass < 4) continue;
        const k = c.glass / 100;
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 1400) + i / 3) % 1;
          const r = 70 - ph * 44;
          g.lineStyle(1.5, mixC(EMB.ember, OBS.seam, k), (0.12 + k * 0.3) * ph);
          g.strokeEllipse(f.x, f.y + 14, r * 2, r * 0.7);
        }
        g.fillStyle(OBS.glass, 0.35 * k); g.fillEllipse(f.x, f.y + 16, 64, 20);
      }
    },

    drawAir(g, time) {
      for (const w of WHO) {
        const f = side(ctx, w);
        const c = coats[w];
        if (!alive(f)) continue;
        if (c.glass > 1 || time < c.brittleUntil) drawCoat(g, f.x, f.y, c, time);
      }
      for (const s of shards) {
        const k = (time - s.born) / 900;
        const x = s.x + s.vx * k * 0.9, y = s.y + s.vy * k * 0.9 + 140 * k * k;
        g.fillStyle(OBS.facet, 1 - k);
        g.fillTriangle(x - s.s, y + s.s * 0.6, x + s.s, y + s.s * 0.4, x + s.s * 0.2, y - s.s);
        g.lineStyle(1, OBS.edge, 0.8 * (1 - k)); g.lineBetween(x + s.s * 0.2, y - s.s, x + s.s, y + s.s * 0.4);
        if (time - coats.player.shatterAt < 900 || time - coats.npc.shatterAt < 900) { g.fillStyle(EMB.hot, 0.6 * (1 - k)); g.fillCircle(x, y, 1.4); }
      }
    },

    drawHud(g, time) {
      // Two coat gauges: a column of glass filling over an ember core, one in each top corner.
      const draw = (w: Who, x: number) => {
        const c = coats[w];
        const y = top + 14;
        g.fillStyle(OBS.glass, 0.88); g.fillRoundedRect(x - 70, y - 4, 140, 18, 6);
        g.lineStyle(1.2, OBS.edge, 0.6); g.strokeRoundedRect(x - 70, y - 4, 140, 18, 6);
        const k = c.glass / 100;
        g.fillStyle(dim(EMB.ember, 0.3), 1); g.fillRect(x - 64, y + 1, 128, 8);
        g.fillStyle(time < c.brittleUntil ? OBS.seamLit : mixC(OBS.sheen, OBS.edge, k), 1); g.fillRect(x - 64, y + 1, 128 * k, 8);
        for (let i = 1; i < 8; i++) { g.lineStyle(1, OBS.glass, 0.8); g.lineBetween(x - 64 + i * 16, y + 1, x - 64 + i * 16, y + 9); }
        if (k > 0.75 && Math.floor(time / 160) % 2 === 0) { g.lineStyle(1.5, OBS.seamLit, 0.9); g.strokeRect(x - 65, y, 130, 10); }
      };
      draw('player', 92);
      draw('npc', W - 92);
    },

    destroy() { shards = []; },
  };

  /** A fighter's glass coat: facets climb from the feet as it thickens; glassed, it closes over the head. */
  function drawCoat(g: Phaser.GameObjects.Graphics, x: number, y: number, c: Coat, time: number): void {
    const held = time < c.brittleUntil;
    const k = held ? 1 : c.glass / 100;
    const shown = Math.ceil(c.facets.length * k);
    // Facets sorted bottom-up (largest sin first = lowest on screen).
    const order = c.facets.map((f, i) => ({ f, i, low: Math.sin(f.a) })).sort((a, b) => b.low - a.low);
    for (let n = 0; n < shown; n++) {
      const { f, i } = order[n];
      const fx = x + Math.cos(f.a) * f.r, fy = y + Math.sin(f.a) * f.r * 0.95;
      const tilt = f.a + Math.PI / 2;
      const p0 = { x: fx + Math.cos(tilt) * f.w * 0.5, y: fy + Math.sin(tilt) * f.w * 0.5 };
      const p1 = { x: fx - Math.cos(tilt) * f.w * 0.5, y: fy - Math.sin(tilt) * f.w * 0.5 };
      const p2 = { x: fx + Math.cos(f.a) * f.h * 0.45, y: fy + Math.sin(f.a) * f.h * 0.45 };
      g.fillStyle(i % 2 ? OBS.glass : OBS.facet, held ? 0.95 : 0.55 + k * 0.35);
      g.fillTriangle(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
      g.lineStyle(1, OBS.edge, 0.4 + k * 0.4); g.lineBetween(p1.x, p1.y, p2.x, p2.y);
    }
    if (k > 0.5) {
      // Ember still alive under the coat.
      const pulse = 0.5 + 0.5 * Math.sin(time / 220);
      g.fillStyle(EMB.ember, 0.08 + pulse * 0.06 * k); g.fillCircle(x, y, 26);
    }
    if (held) {
      // Closed over: a full shell, the violet line round it, and the strike-me crack.
      const brittleK = clamp((c.brittleUntil - time) / (GLASSED_MS + BRITTLE_MS), 0, 1);
      g.lineStyle(2, OBS.seamLit, 0.6 + 0.3 * Math.sin(time / 80)); g.strokeCircle(x, y, 27);
      const crack: Pt[] = [{ x: x - 4, y: y - 28 }, { x: x + 6, y: y - 12 }, { x: x - 6, y: y + 2 }, { x: x + 5, y: y + 16 }, { x: x - 2, y: y + 27 }];
      seam(g, crack.slice(0, 2 + Math.floor((1 - brittleK) * 3)), 1.4, 1, 1 - brittleK, EMB.hot);
      g.fillStyle(lit(OBS.seamLit, 0.3), 0.15 + 0.1 * Math.sin(time / 60)); g.fillCircle(x, y, 30);
    }
  }
}

export const STILL_GLASS: GimmickDef = {
  id: 'bench-fire-still-glass',
  rules: 'What stands still shall cool to glass: armoured and quickened as it thickens, held fast when full — and struck glass shatters.',
  make,
};
