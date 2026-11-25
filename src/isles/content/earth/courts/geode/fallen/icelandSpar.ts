import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { poly } from '../art';
import { BRASS, BRASS_DARK, FLAG_DARK, GRIT_DARK, IRON, QUARTZ_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Iceland Spar — Spar-Cutter Hedda Vink, who in the King's telling cut the Prince's sighting-glass
 * from clear calcite, the stone that shows you everything twice.
 *
 * Three great rhombs of clear calcite stand in timber cradles about the yard. Calcite splits
 * light — and here it splits *shots*: any shot that flies into a rhomb comes out the far side
 * as two rays, each a little weaker, spreading apart. Near the slab both rays strike; far off
 * they straddle you. So keep the spar close to your foe and far from yourself.
 *
 * Hedda shifts the rhombs on their runners: every few seconds the cradle nearest you is shoved
 * along a chalked runner that passes through where you stand (a second's warning), and it
 * flattens whoever it meets — her too. Halfway, the spar starts to cleave thrice: three rays.
 */

const ID = fallenId('geode', 'iceland-spar');
const SLAB_R = 34;
const SLAB_UP = 16;
const SPLIT = 0.2;
const SLIDE_WARN = 1100;
const SLIDE_SPEED = 320;
const SLIDE_HALF = 40;
const SLIDE_DMG = 15;

interface Slab { x: number; y: number; tilt: number; flashAt: number }
interface Slide { s: Slab; fx: number; fy: number; tx: number; ty: number; warnAt: number; goAt: number; endAt: number; struck: Set<string> }
interface Ray { x: number; y: number; a: number; at: number; col: number }
interface Seen { x: number; y: number; owner: 'player' | 'npc' }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk, player, npc } = ctx;
  const slabs: Slab[] = [
    { x: W * 0.27, y: top + 170, tilt: 0.25, flashAt: -9999 },
    { x: W * 0.73, y: top + 190, tilt: -0.3, flashAt: -9999 },
    { x: W * 0.5, y: H - 130, tilt: 0.05, flashAt: -9999 },
  ];
  const rays: Ray[] = [];
  let seen: Seen[] = [];
  let slide: Slide | null = null;
  let nextSlide = 0;
  let halved = false;
  let started = false;

  /** Split one shot that has entered a slab. */
  function cleave(sl: Slab, sx: number, sy: number, owner: 'player' | 'npc', damage: number, dt: number, time: number): void {
    // Its heading: from where it was last frame, else from whoever fired it.
    let best: Seen | null = null, bd = 64;
    for (const p of seen) {
      if (p.owner !== owner) continue;
      const d = dist(p.x, p.y, sx, sy);
      if (d > 0.5 && d < bd) { bd = d; best = p; }
    }
    const from = best ?? (owner === 'player' ? player : npc);
    const a = Math.atan2(sy - from.y, sx - from.x);
    const speed = best ? clamp(bd / Math.max(dt, 1 / 120), 340, 700) : 520;
    const target = owner === 'player' ? npc : player;
    const dmg = Math.max(3, Math.round(damage * 0.68));
    const fans = halved ? [-SPLIT, 0, SPLIT] : [-SPLIT * 0.5, SPLIT * 0.5];
    const col = owner === 'player' ? 0xfff0c8 : 0xffb070;
    for (const off of fans) {
      const ang = a + off;
      const ox = sl.x + Math.cos(a) * (SLAB_R + 6), oy = sl.y - SLAB_UP + Math.sin(a) * (SLAB_R + 6);
      tk.spawnBullet({ x: ox, y: oy, angle: ang, speed, damage: dmg, r: 6, lifeMs: 2200, color: col, hits: [target] });
      rays.push({ x: ox, y: oy, a: ang, at: time, col });
    }
    sl.flashAt = time;
    ctx.sfx('prism');
  }

  function startSlide(time: number): void {
    // The slab nearest the player, shoved along a runner through where they stand.
    let s = slabs[0], sd = Infinity;
    for (const sl of slabs) { const d = dist(sl.x, sl.y, player.x, player.y); if (d < sd) { sd = d; s = sl; } }
    const a = Math.atan2(player.y - s.y, player.x - s.x);
    const len = Math.max(sd + 180, 300);
    const tx = clamp(s.x + Math.cos(a) * len, 70, W - 70), ty = clamp(s.y + Math.sin(a) * len, top + 70, H - 50);
    const travel = (dist(s.x, s.y, tx, ty) / SLIDE_SPEED) * 1000;
    slide = { s, fx: s.x, fy: s.y, tx, ty, warnAt: time, goAt: time + tk.warn(SLIDE_WARN), endAt: time + tk.warn(SLIDE_WARN) + travel, struck: new Set() };
    ctx.sfx('gear-turn');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSlide = time + 4200; }
      if (!halved && alive(npc) && npc.hp < npc.maxHp * 0.5) {
        halved = true;
        ctx.banner('THE SPAR CLEAVES THRICE', '#fff0c8');
        ctx.sfx('crystal-shatter');
      }
      // Shots into the spar.
      const now: Seen[] = [];
      for (const sl of slabs) {
        for (const h of ctx.shotsNear(sl.x, sl.y - SLAB_UP, SLAB_R + 70)) {
          if (dist(h.x, h.y, sl.x, sl.y - SLAB_UP) <= SLAB_R) {
            const x = h.x, y = h.y, owner = h.owner, damage = h.damage;
            h.block();
            cleave(sl, x, y, owner, damage, dt, time);
          } else now.push({ x: h.x, y: h.y, owner: h.owner });
        }
      }
      seen = now;
      for (let i = rays.length - 1; i >= 0; i--) if (time - rays[i].at > 260) rays.splice(i, 1);
      // Hedda's runner.
      if (!slide && time >= nextSlide && alive(player)) startSlide(time);
      if (slide && time >= slide.goAt) {
        const k = clamp((time - slide.goAt) / Math.max(1, slide.endAt - slide.goAt), 0, 1);
        slide.s.x = slide.fx + (slide.tx - slide.fx) * k;
        slide.s.y = slide.fy + (slide.ty - slide.fy) * k;
        for (const [key, f] of [['p', player], ['n', npc]] as const) {
          if (slide.struck.has(key) || !alive(f) || dist(f.x, f.y, slide.s.x, slide.s.y) > SLAB_R + 20) continue;
          slide.struck.add(key);
          ctx.hit(f, SLIDE_DMG, f.x, f.y);
          const ax = slide.tx - slide.fx, ay = slide.ty - slide.fy;
          const len = Math.hypot(ax, ay) || 1;
          let nx = -ay / len, ny = ax / len;
          if ((f.x - slide.s.x) * nx + (f.y - slide.s.y) * ny < 0) { nx = -nx; ny = -ny; }
          ctx.nudge(f, nx * 60, ny * 60);
          ctx.sfx('stone-slam');
        }
        if (k >= 1) { slide = null; nextSlide = time + (halved ? 5200 : 6800); ctx.sfx('land'); }
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Off a runner about to slide.
      if (slide && segDist(npc.x, npc.y, slide.fx, slide.fy, slide.tx, slide.ty) < SLIDE_HALF + 40) {
        const ax = slide.tx - slide.fx, ay = slide.ty - slide.fy;
        const len = Math.hypot(ax, ay) || 1;
        let nx = -ay / len, ny = ax / len;
        if ((npc.x - slide.fx) * nx + (npc.y - slide.fy) * ny < 0) { nx = -nx; ny = -ny; }
        return { x: clamp(npc.x + nx * 110, 60, W - 60), y: clamp(npc.y + ny * 110, top + 50, H - 40) };
      }
      // Put the rhomb nearest the player between them, and stand well back from it.
      let s = slabs[0], sd = Infinity;
      for (const sl of slabs) { const d = dist(sl.x, sl.y, player.x, player.y); if (d < sd) { sd = d; s = sl; } }
      if (sd > 260) return null;
      const a = Math.atan2(s.y - player.y, s.x - player.x);
      const p: Pt = { x: s.x + Math.cos(a) * 250, y: s.y + Math.sin(a) * 250 };
      return { x: clamp(p.x, 60, W - 60), y: clamp(p.y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      if (slide) {
        const warm = clamp((time - slide.warnAt) / Math.max(1, slide.goAt - slide.warnAt), 0, 1);
        const ax = slide.tx - slide.fx, ay = slide.ty - slide.fy;
        const len = Math.hypot(ax, ay) || 1;
        const nx = -ay / len, ny = ax / len;
        // Two timber runners greased with grit, and the chalked band between them.
        g.fillStyle(0xf6f0e8, 0.08 + warm * 0.14);
        g.fillPoints([
          { x: slide.fx + nx * SLIDE_HALF, y: slide.fy + ny * SLIDE_HALF }, { x: slide.tx + nx * SLIDE_HALF, y: slide.ty + ny * SLIDE_HALF },
          { x: slide.tx - nx * SLIDE_HALF, y: slide.ty - ny * SLIDE_HALF }, { x: slide.fx - nx * SLIDE_HALF, y: slide.fy - ny * SLIDE_HALF },
        ], true);
        for (const side of [-1, 1]) {
          const ox = nx * side * (SLIDE_HALF - 6), oy = ny * side * (SLIDE_HALF - 6);
          g.lineStyle(6, TIMBER_DARK, 0.85); g.lineBetween(slide.fx + ox, slide.fy + oy, slide.tx + ox, slide.ty + oy);
          g.lineStyle(2, TIMBER_LIT, 0.8); g.lineBetween(slide.fx + ox, slide.fy + oy - 1, slide.tx + ox, slide.ty + oy - 1);
        }
        // Chevrons marching the way it will go.
        const n = Math.floor(len / 34);
        for (let i = 0; i < n; i++) {
          const k = ((i + time / 220) % n) / n;
          const px = slide.fx + ax * k, py = slide.fy + ay * k;
          const ux = ax / len, uy = ay / len;
          g.lineStyle(2, 0xffffff, (0.25 + warm * 0.5) * (1 - k * 0.5));
          g.lineBetween(px - ux * 8 + nx * 12, py - uy * 8 + ny * 12, px, py);
          g.lineBetween(px - ux * 8 - nx * 12, py - uy * 8 - ny * 12, px, py);
        }
      }
      for (const sl of slabs) shadow(g, sl.x, sl.y + 4, 92, 22);
    },

    drawAir(g, time) {
      for (const sl of slabs) drawSpar(g, sl, time);
      for (const r of rays) {
        const k = (time - r.at) / 260;
        g.lineStyle(4 * (1 - k), r.col, 0.8 * (1 - k)); g.lineBetween(r.x, r.y, r.x + Math.cos(r.a) * 70, r.y + Math.sin(r.a) * 70);
        g.lineStyle(1.5, 0xffffff, 0.9 * (1 - k)); g.lineBetween(r.x, r.y, r.x + Math.cos(r.a) * 50, r.y + Math.sin(r.a) * 50);
      }
    },
  };
}

/**
 * One calcite rhomb in its cradle: a leaning six-faced block of water-clear stone. Through it the
 * grit of the floor shows twice — the doubled lines that give the stone its name — and it rings
 * gold when it splits a shot.
 */
function drawSpar(g: G, sl: Slab, time: number): void {
  const { x, y, tilt } = sl;
  // The cradle: two timber chocks and an iron strap.
  for (const side of [-1, 1]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + side * 30 - 9, y - 10, 18, 12);
    g.fillStyle(TIMBER, 1); g.fillRect(x + side * 30 - 8, y - 10, 16, 8);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(x + side * 30 - 8, y - 10, 16, 2);
  }
  // The rhomb: front face, top face, side face — a sheared box.
  const sh = tilt * 22;
  const fl = { x: x - 30, y: y - 4 }, fr = { x: x + 22, y: y - 4 };
  const tl = { x: x - 30 + sh + 10, y: y - 52 }, tr = { x: x + 22 + sh + 10, y: y - 52 };
  const bk = 12;
  const clear = 0xe8f4ff;
  poly(g, [fr, { x: fr.x + bk, y: fr.y - bk * 0.7 }, { x: tr.x + bk, y: tr.y - bk * 0.7 }, tr], dim(clear, 0.2), 0.55);
  poly(g, [tl, tr, { x: tr.x + bk, y: tr.y - bk * 0.7 }, { x: tl.x + bk, y: tl.y - bk * 0.7 }], lit(clear, 0.4), 0.6);
  poly(g, [fl, fr, tr, tl], clear, 0.32);
  // The floor seen through it, doubled: two sets of offset grit lines.
  for (let i = 0; i < 4; i++) {
    const yy = y - 12 - i * 10, xx = x - 22 + i * 3 + sh * (i / 4);
    g.lineStyle(1.2, GRIT_DARK, 0.55); g.lineBetween(xx, yy, xx + 30, yy);
    g.lineStyle(1.2, GRIT_DARK, 0.3); g.lineBetween(xx + 5, yy - 4, xx + 35, yy - 4);
  }
  g.fillStyle(FLAG_DARK, 0.5); g.fillCircle(x - 4, y - 22, 2.4); g.fillCircle(x + 1, y - 26, 2.4);
  // Cleavage edges and a bright edge light.
  g.lineStyle(1.5, QUARTZ_LIT, 0.9); g.strokePoints([fl, fr, tr, tl], true);
  g.lineStyle(1, QUARTZ_LIT, 0.6); g.lineBetween(tl.x, tl.y, tl.x + bk, tl.y - bk * 0.7); g.lineBetween(tr.x, tr.y, tr.x + bk, tr.y - bk * 0.7);
  g.lineBetween(tl.x + bk, tl.y - bk * 0.7, tr.x + bk, tr.y - bk * 0.7); g.lineBetween(fr.x + bk, fr.y - bk * 0.7, tr.x + bk, tr.y - bk * 0.7);
  g.lineStyle(2, 0xffffff, 0.7); g.lineBetween(fl.x + 3, fl.y - 3, tl.x + 2, tl.y + 3);
  // The strap.
  g.fillStyle(IRON, 1); g.fillRect(x - 32, y - 6, 66, 3);
  g.fillStyle(BRASS, 1); g.fillCircle(x - 30, y - 5, 2); g.fillCircle(x + 32, y - 5, 2);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 2, y - 7, 4, 5);
  const since = time - sl.flashAt;
  if (since < 300) {
    const k = since / 300;
    glow(g, x, y - SLAB_UP - 10, 30, 0xfff0c8, 0.14 * (1 - k), 3);
    g.lineStyle(2, 0xfff0c8, 1 - k); g.strokePoints([fl, fr, tr, tl], true);
  } else {
    const tw = (Math.sin(time / 400 + x) + 1) / 2;
    g.fillStyle(0xffffff, 0.3 + tw * 0.5); g.fillCircle(tr.x + bk - 2, tr.y - bk * 0.7 + 2, 1.6);
  }
}

export const FALLEN_ICELAND_SPAR: GimmickDef = {
  id: ID,
  rules: 'A shot through a calcite rhomb comes out as two spreading rays: near the rhomb both strike. Hedda slides the nearest one at you down a runner.',
  make,
};
