import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_QUARRY } from '../encounters';
import {
  BLOOD, FOAM, FOE_C, GRAVEL, MINE_C, RIVER, RIVER_DEEP, RIVER_LIT, clamp, dist, frameClock, hound, noise,
  pawprint,
} from '../util';

/**
 * Quarry — Huntmaster Bracken runs his pack the old way: the hounds hunt by nose, not by eye.
 * Every step anyone takes leaves **scent** — a faint trail of motes on the turf (yours blue, his
 * amber), fading over seven seconds. The pack follows the **stronger** trail, hound by hound,
 * point by point, nose down; once it is close enough to sight its quarry it breaks off the line
 * and runs straight in to bite.
 *
 * A ford runs down the middle of the glade. **Wading it washes you clean** — your trail fades
 * away behind you and you leave none while you are in the water — and a pack that loses its line
 * casts about, then takes up whatever scent is left. Blood carries furthest: every hit taken
 * spills a splash of strong scent where the hurt one stands.
 *
 * The rule the player can turn: **the hounds do not care whose feet they follow.** Wash off in
 * the ford, bloody Bracken, and his own pack turns on him. He knows it — he wades when they do.
 */

interface Scent { x: number; y: number; born: number; str: number; id: number }
type Side = 'p' | 'n';
type HState = 'trail' | 'cast' | 'sight' | 'worry' | 'mill';
interface Hound {
  x: number; y: number; dir: number; ph: number;
  state: HState; until: number; followId: number; lastBite: number;
  castX: number; castY: number; coat: number; seed: number;
}

const LIFE = 7000;
const DROP_MS = 120;
const SIGHT_R = 230;
const BITE_R = 30;

function makeQuarry(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const trailSpd = hard ? 186 : 172;
  const runSpd = hard ? 196 : 184;
  const biteDmg = hard ? 9 : 7;
  const wadeMult = 0.74;

  // The ford: a band down the middle, bowing gently.
  const FORD_HW = 48;
  const fordX = (y: number): number => W * 0.52 + Math.sin(((y - top) / (H - top)) * Math.PI) * 34 - 14;
  const inFord = (x: number, y: number): boolean => Math.abs(x - fordX(y)) < FORD_HW;

  const trails: Record<Side, Scent[]> = { p: [], n: [] };
  const lastDrop: Record<Side, { x: number; y: number; at: number }> = {
    p: { x: ctx.player.x, y: ctx.player.y, at: 0 }, n: { x: ctx.npc.x, y: ctx.npc.y, at: 0 },
  };
  let nextId = 1;
  let pack: Side = 'p';
  let nextJudge = 0;
  let turnFlash = 0;

  const coats = [0x8a6a4a, 0xc8b49a, 0x5a4434, 0x9a7a5a];
  const hounds: Hound[] = [];
  for (let i = 0; i < (hard ? 4 : 3); i++) {
    hounds.push({
      x: 70 + i * 26, y: top + 70 + i * 30, dir: 1, ph: i, state: 'mill', until: 0, followId: 0, lastBite: 0,
      castX: 0, castY: 0, coat: coats[i], seed: i * 3.7,
    });
  }

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const fighter = (s: Side): Fighter => (s === 'p' ? ctx.player : ctx.npc);
  const other = (s: Side): Side => (s === 'p' ? 'n' : 'p');
  const strength = (s: Side, time: number): number =>
    trails[s].reduce((sum, c) => sum + c.str * Math.max(0, 1 - (time - c.born) / LIFE), 0);

  const lay = (s: Side, time: number, dt: number): void => {
    const f = fighter(s);
    if (!alive(f)) return;
    const ld = lastDrop[s];
    if (inFord(f.x, f.y)) {
      // The water takes it: everything you laid ages fast, and you lay nothing.
      for (const c of trails[s]) c.born -= dt * 3500;
      ld.x = f.x; ld.y = f.y;
      return;
    }
    if (time - ld.at < DROP_MS || dist(f.x, f.y, ld.x, ld.y) < 6) return;
    trails[s].push({ x: f.x, y: f.y + 10, born: time, str: 1, id: nextId++ });
    ld.x = f.x; ld.y = f.y; ld.at = time;
  };

  const bleed = (s: Side, amount: number): void => {
    const f = fighter(s);
    const time = ctx.scene.time.now;
    const n = Math.min(5, 1 + Math.floor(amount / 6));
    for (let i = 0; i < n; i++) {
      trails[s].push({ x: f.x + (ctx.rng() - 0.5) * 26, y: f.y + 8 + (ctx.rng() - 0.5) * 16, born: time, str: 2.6, id: nextId++ });
    }
  };

  /** The oldest point of `s`'s trail that is newer than `afterId`. */
  const nextPoint = (s: Side, afterId: number): Scent | null => {
    for (const c of trails[s]) if (c.id > afterId) return c;
    return null;
  };
  /** The nearest live point of a trail to (x, y), within `r`. */
  const nearestPoint = (s: Side, x: number, y: number, r: number): Scent | null => {
    let best: Scent | null = null, bd = r;
    for (const c of trails[s]) { const d = dist(x, y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
    return best;
  };

  const step = (h: Hound, tx: number, ty: number, spd: number, dt: number): void => {
    const d = dist(h.x, h.y, tx, ty);
    if (d < 0.5) return;
    const k = Math.min(1, (spd * dt) / d);
    const wet = inFord(h.x, h.y) ? 0.7 : 1;
    h.x += (tx - h.x) * k * wet; h.y += (ty - h.y) * k * wet;
    if (Math.abs(tx - h.x) > 1) h.dir = tx > h.x ? 1 : -1;
    h.ph += dt * spd * 0.09;
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;
      lay('p', time, dt);
      lay('n', time, dt);
      for (const s of ['p', 'n'] as Side[]) trails[s] = trails[s].filter((c) => time - c.born < LIFE);

      // The pack judges the wind every so often, and sticks with a line unless the other is clearly stronger.
      if (time >= nextJudge) {
        nextJudge = time + 1200;
        const sp = strength('p', time), sn = strength('n', time);
        const cur = pack === 'p' ? sp : sn, alt = pack === 'p' ? sn : sp;
        if (alt > cur * 1.2 + 1 && alive(fighter(other(pack)))) {
          pack = other(pack);
          turnFlash = time;
          const f = fighter(pack);
          ctx.float(f.x, f.y - 56, pack === 'n' ? 'THE PACK TURNS ON HIM' : 'THEY HAVE YOUR SCENT', pack === 'n' ? '#9ae8ff' : '#ffb27a');
          ctx.sfx('screech');
          for (const h of hounds) if (h.state !== 'worry') { h.state = 'cast'; h.until = time + 700; h.castX = h.x; h.castY = h.y; }
        }
      }

      const quarry = fighter(pack);
      for (const h of hounds) {
        if (!alive(quarry)) { h.state = 'mill'; }
        if (h.state === 'worry') {
          if (time >= h.until) { h.state = 'cast'; h.until = time + 400; h.castX = h.x; h.castY = h.y; }
          continue;
        }
        const dq = dist(h.x, h.y, quarry.x, quarry.y);
        // Sight: close, and the line is warm right here — break off and run in.
        if (h.state !== 'mill' && dq < SIGHT_R && !inFord(quarry.x, quarry.y)) {
          const warm = nearestPoint(pack, quarry.x, quarry.y, 70);
          if (warm && time - warm.born < 1600) h.state = 'sight';
        }
        if (h.state === 'sight') {
          if (inFord(quarry.x, quarry.y) || dq > SIGHT_R * 1.5) { h.state = 'cast'; h.until = time + 1100; h.castX = h.x; h.castY = h.y; continue; }
          step(h, quarry.x, quarry.y + 6, runSpd, dt);
          if (dq < BITE_R && time - h.lastBite > 1300) {
            h.lastBite = time;
            ctx.hit(quarry, biteDmg, quarry.x, quarry.y);
            const a = Math.atan2(quarry.y - h.y, quarry.x - h.x);
            ctx.nudge(quarry, Math.cos(a) * 14, Math.sin(a) * 14);
            ctx.sfx('slash');
            h.state = 'worry'; h.until = time + 800;
          }
          continue;
        }
        if (h.state === 'trail') {
          // `followId` is the last point passed; run on to the next one laid after it.
          const pt = nextPoint(pack, h.followId);
          if (!pt) { h.state = 'cast'; h.until = time + 1200; h.castX = h.x; h.castY = h.y; continue; }
          step(h, pt.x, pt.y, trailSpd, dt);
          if (dist(h.x, h.y, pt.x, pt.y) < 16) h.followId = pt.id;
          continue;
        }
        // Casting about (nose down, in loops) or milling (no line anywhere): look for scent.
        const loop = time / 260 + h.seed;
        const r = h.state === 'mill' ? 70 : 34;
        const cx = h.state === 'mill' ? W * 0.3 + (h.seed % 2) * W * 0.4 : h.castX;
        const cy = h.state === 'mill' ? (top + H) / 2 : h.castY;
        step(h, cx + Math.cos(loop) * r, cy + Math.sin(loop) * r * 0.7, 110, dt);
        if (time >= h.until) {
          const pick = nearestPoint(pack, h.x, h.y, 280);
          if (pick) { h.state = 'trail'; h.followId = pick.id - 1; }
          else { h.state = 'mill'; h.until = time + 900; }
        }
      }
    },

    onPlayerHurt(amount) { bleed('p', amount); },
    onNpcHurt(amount) { bleed('n', amount); },

    playerSpeedMult: () => (inFord(ctx.player.x, ctx.player.y) ? wadeMult : 1),
    npcSpeedMult: () => (inFord(ctx.npc.x, ctx.npc.y) ? wadeMult : 1),

    npcSeek(): Pt | null {
      const n = ctx.npc;
      if (pack !== 'n') return null;
      // The pack is on him: get into the water and stay there until they lose the line.
      const y = clamp(n.y, top + 50, H - 50);
      if (inFord(n.x, n.y) && strength('n', ctx.scene.time.now) > 2) return { x: fordX(y), y };
      if (!inFord(n.x, n.y)) return { x: fordX(y), y };
      return null;
    },

    drawGround(g, time) {
      const ts = time / 1000;
      // The ford: shelving gravel banks, a brown-green run of water, stepping stones, ripples.
      for (let y = top; y < H; y += 8) {
        const fx = fordX(y);
        g.fillStyle(GRAVEL, 0.9); g.fillRect(fx - FORD_HW - 12, y, FORD_HW * 2 + 24, 9);
      }
      for (let y = top; y < H; y += 6) {
        const fx = fordX(y);
        g.fillStyle(RIVER, 0.95); g.fillRect(fx - FORD_HW, y, FORD_HW * 2, 7);
        g.fillStyle(RIVER_DEEP, 0.6); g.fillRect(fx - FORD_HW * 0.45, y, FORD_HW * 0.9, 7);
      }
      for (let i = 0; i < 14; i++) {
        const y = top + ((i * 61 + ts * 48) % (H - top));
        const fx = fordX(y) + (noise(i * 2.1) - 0.5) * FORD_HW;
        g.lineStyle(1.5, RIVER_LIT, 0.45); g.lineBetween(fx - 10, y, fx + 8, y + 3);
      }
      for (let k = 0; k < 5; k++) {
        const y = top + 60 + k * ((H - top - 120) / 4);
        const fx = fordX(y) + (k % 2 ? 14 : -14);
        g.fillStyle(0x000000, 0.25); g.fillEllipse(fx + 2, y + 4, 30, 12);
        g.fillStyle(0x7a7468, 1); g.fillEllipse(fx, y, 28, 14);
        g.fillStyle(0xa8a296, 1); g.fillEllipse(fx - 3, y - 3, 14, 5);
        g.lineStyle(1.5, FOAM, 0.4 + 0.2 * Math.sin(ts * 3 + k)); g.strokeEllipse(fx, y + 2, 36, 16);
      }
      // Washing: a cloud of motes drifting downstream off whoever wades.
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f) || !inFord(f.x, f.y)) continue;
        const c = f === ctx.player ? MINE_C : FOE_C;
        for (let i = 0; i < 6; i++) {
          const ph = (ts * 0.9 + i / 6) % 1;
          g.fillStyle(c, 0.5 * (1 - ph)); g.fillCircle(f.x + Math.sin(i * 2 + ts) * 10, f.y + 14 + ph * 50, 2.5);
        }
        g.lineStyle(2, FOAM, 0.5); g.strokeEllipse(f.x, f.y + 16, 46, 14);
      }

      // Scent: motes on the turf, brightest fresh; blood as dark red splashes.
      for (const s of ['p', 'n'] as Side[]) {
        const c = s === 'p' ? MINE_C : FOE_C;
        const followed = s === pack;
        for (const p of trails[s]) {
          const k = 1 - (time - p.born) / LIFE;
          if (k <= 0) continue;
          if (p.str > 2) {
            g.fillStyle(BLOOD, 0.75 * k); g.fillCircle(p.x, p.y, 4.5);
            g.fillStyle(c, 0.35 * k); g.fillCircle(p.x, p.y, 9);
            continue;
          }
          const wob = Math.sin(ts * 3 + p.id) * 1.5;
          g.fillStyle(c, (followed ? 0.5 : 0.28) * k); g.fillCircle(p.x + wob, p.y, 2 + k * 1.6);
        }
      }
      // Hounds leave pawprints where they have been.
      for (const h of hounds) {
        if (Math.floor(h.ph * 2) % 3 === 0) pawprint(g, h.x, h.y + 12, h.dir > 0 ? 0 : Math.PI, 5, 0x1a140c, 0.25);
      }
    },

    drawAir(g, time) {
      const ts = time / 1000;
      for (const h of hounds) {
        const nose = h.state === 'cast' || h.state === 'mill' || h.state === 'trail';
        const bob = nose ? 2 : 0;
        hound(g, h.x, h.y + bob, h.dir, 1.05, h.ph, h.coat);
        if (h.state === 'sight') {
          g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(h.x - 4, h.y - 34, 8, 12, 2);
          g.fillCircle(h.x, h.y - 18, 2.4);
        } else if (h.state === 'cast') {
          // Nose working: little puffs off the muzzle.
          for (let i = 0; i < 3; i++) {
            const ph = (ts * 2.5 + i / 3) % 1;
            g.lineStyle(1.2, 0xffffff, 0.5 * (1 - ph)); g.strokeCircle(h.x + h.dir * (20 + ph * 8), h.y - 4, 2 + ph * 4);
          }
        } else if (h.state === 'worry') {
          g.lineStyle(2, BLOOD, 0.8); g.lineBetween(h.x + h.dir * 20, h.y - 6, h.x + h.dir * 28, h.y - 2);
        }
      }
      if (time - turnFlash < 900) {
        const k = (time - turnFlash) / 900;
        const f = fighter(pack);
        g.lineStyle(4 * (1 - k), pack === 'p' ? FOE_C : MINE_C, 0.8 * (1 - k)); g.strokeCircle(f.x, f.y, 30 + k * 70);
      }
    },

    drawHud(g, time) {
      // Two scent meters: whose line the pack is running.
      const sp = strength('p', time), sn = strength('n', time);
      const max = Math.max(20, sp, sn);
      const x = ctx.W / 2 - 110, y = top + 8;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 8, y - 4, 236, 30, 6);
      g.fillStyle(0x1a2a30, 1); g.fillRect(x, y, 100, 8); g.fillRect(x + 120, y, 100, 8);
      g.fillStyle(MINE_C, 0.9); g.fillRect(x + 100 - (sp / max) * 100, y, (sp / max) * 100, 8);
      g.fillStyle(FOE_C, 0.9); g.fillRect(x + 120, y, (sn / max) * 100, 8);
      // A paw on the side the pack is following.
      const px = pack === 'p' ? x + 50 : x + 170;
      pawprint(g, px, y + 18, -Math.PI / 2, 8, pack === 'p' ? MINE_C : FOE_C, 0.95);
    },
  };
}

export const QUARRY: GimmickDef = {
  id: GIM_QUARRY,
  rules: 'The hounds follow the stronger scent trail and bite what they find. Wade the ford to wash yours off. Blood carries.',
  make: makeQuarry,
};
