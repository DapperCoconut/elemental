import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { GILT, GILT_DARK, MIRROR, MIRROR_DARK, MIRROR_LIT, OAK, OAK_DARK, PAVE_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Quicksilver Spill — Silverer Zanetta Morosin, who lays the mercury behind the Hall of Mirrors'
 * glass, and who in the King's telling silvered the Tuners' reading-glasses so they could see a
 * Part through any mask.
 *
 * Her flasks tip quicksilver onto the workshop floor, a bead at a time. Mercury runs toward warmth,
 * so every bead rolls slowly after the nearest fighter, and beads that touch run together into one
 * fatter, slower, heavier bead. A bead on you bites on a clock (and drags at your feet) — harder
 * the fatter it is.
 *
 * The exploit is the strike: a fat bead hit bursts into droplets that fly on AWAY from whoever
 * struck it, cutting whoever they meet. Let the beads gather on her, then strike from the far side.
 * She does it to you. Halfway down she warms the floor: beads run faster, and the fat ones fume —
 * stand in a bead's vapour and you cannot cast.
 */

const ID = fallenId('masque', 'quicksilver');
const MAX_BEADS = 9;
const MAX_SIZE = 9;
const SPILL_MS = 3400;
const SPILL_HALF_MS = 2500;
const SPILL_WARN = 800;
const BITE_MS = 500;
const FUME_R = 86;
const DROP_SPEED = 340;
const DROP_DMG = 7;

interface Bead {
  x: number; y: number; size: number;
  t: StrikeTarget;
  wob: number;
  born: number;
  /** Next bite time per fighter. */
  bite: Map<Fighter, number>;
}
interface Pour { x: number; y: number; at: number }
interface Splash { x: number; y: number; a: number; at: number }

const radius = (size: number): number => 8 + 6 * Math.sqrt(size);

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const beads: Bead[] = [];
  const pours: Pour[] = [];
  const splashes: Splash[] = [];
  let nextSpill = 0;
  let started = false;
  let warm = false;
  let fumeTick = 0;

  /** A tin-foil sheet laid on the floor for each mirror being silvered — fixed per fight. */
  const sheets = Array.from({ length: 5 }, (_, i) => ({
    x: 120 + i * 180 + (rng() - 0.5) * 50, y: top + 90 + rng() * (H - top - 180), w: 110 + rng() * 40, h: 70 + rng() * 26,
  }));

  function spawnBead(x: number, y: number, size: number, now: number): void {
    const b: Bead = {
      x, y, size, wob: rng() * 6, born: now, bite: new Map(),
      t: null as unknown as StrikeTarget,
    };
    b.t = ctx.target({ x, y, r: radius(size) + 4, onStruck: (by) => burst(b, by === 'player' ? player : npc) });
    beads.push(b);
  }

  function removeBead(b: Bead): void {
    b.t.remove();
    const i = beads.indexOf(b);
    if (i >= 0) beads.splice(i, 1);
  }

  /** Struck: the bead bursts into droplets flying on away from the striker. */
  function burst(b: Bead, by: Fighter): void {
    if (!beads.includes(b)) return;
    const now = tk.now;
    const a = Math.atan2(b.y - by.y, b.x - by.x);
    removeBead(b);
    splashes.push({ x: b.x, y: b.y, a, at: now });
    if (b.size < 2) { ctx.sfx('bubble'); return; }
    const n = Math.min(8, b.size + 1);
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 0 : i / (n - 1) - 0.5;
      tk.spawnBullet({
        x: b.x + Math.cos(a) * radius(b.size), y: b.y + Math.sin(a) * radius(b.size),
        angle: a + k * 1.1, speed: DROP_SPEED * (0.9 + rng() * 0.2), damage: DROP_DMG,
        r: 6, lifeMs: 1400, color: MIRROR_LIT, hits: [player, npc],
      });
    }
    ctx.sfx('crystal-shatter');
    ctx.flash(b.x, b.y, MIRROR_LIT);
  }

  /** Where a new bead will drop: open floor, never on top of the player. */
  function spillSpot(): Pt {
    for (let i = 0; i < 12; i++) {
      const p = { x: 70 + rng() * (W - 140), y: top + 50 + rng() * (H - top - 100) };
      if (dist(p.x, p.y, player.x, player.y) > 150 && !beads.some((b) => dist(b.x, b.y, p.x, p.y) < 60)) return p;
    }
    return { x: W / 2, y: top + 60 };
  }

  const nearest = (x: number, y: number): Fighter | null => {
    const fs = [player, npc].filter(alive);
    if (!fs.length) return null;
    return fs.reduce((a, b) => (dist(a.x, a.y, x, y) <= dist(b.x, b.y, x, y) ? a : b));
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSpill = time + 1800; }
      if (!warm && npc.hp <= npc.maxHp * 0.5) {
        warm = true;
        ctx.banner('She warms the floor: the quicksilver runs, and fumes.', '#e6eef6');
        ctx.sfx('sizzle');
      }

      // Her flasks: a thread of silver pours, then a bead lands.
      if (time >= nextSpill - SPILL_WARN && !pours.some((p) => p.at > time) && beads.length < MAX_BEADS) {
        const p = spillSpot();
        pours.push({ ...p, at: nextSpill });
        nextSpill += warm ? SPILL_HALF_MS : SPILL_MS;
      }
      for (let i = pours.length - 1; i >= 0; i--) {
        if (time < pours[i].at) continue;
        spawnBead(pours[i].x, pours[i].y, 1, time);
        ctx.sfx('slime-splat');
        pours.splice(i, 1);
      }

      // Each bead runs for the nearest fighter, slower the fatter.
      for (const b of beads) {
        const f = nearest(b.x, b.y);
        if (!f) break;
        const d = dist(b.x, b.y, f.x, f.y);
        const sp = (62 / (1 + 0.12 * (b.size - 1))) * (warm ? 1.4 : 1);
        if (d > 6) { b.x += ((f.x - b.x) / d) * sp * dt; b.y += ((f.y - b.y) / d) * sp * dt; }
        b.x = clamp(b.x, 40, W - 40); b.y = clamp(b.y, top + 30, H - 30);
        b.wob += dt * (3 + b.size * 0.4);
        b.t.moveTo(b.x, b.y);
      }

      // Touching beads run together.
      for (let i = 0; i < beads.length; i++) {
        for (let j = beads.length - 1; j > i; j--) {
          const a = beads[i], c = beads[j];
          if (dist(a.x, a.y, c.x, c.y) > radius(a.size) + radius(c.size) - 6) continue;
          const s = Math.min(MAX_SIZE, a.size + c.size);
          a.x = (a.x * a.size + c.x * c.size) / (a.size + c.size);
          a.y = (a.y * a.size + c.y * c.size) / (a.size + c.size);
          a.size = s;
          a.t.setRadius(radius(s) + 4);
          removeBead(c);
          ctx.sfx('bubble');
        }
      }

      // A bead on you bites on its own clock.
      for (const b of beads) {
        for (const f of [player, npc]) {
          if (!alive(f) || dist(b.x, b.y, f.x, f.y) > radius(b.size) + 18) continue;
          const at = b.bite.get(f) ?? 0;
          if (time < at) continue;
          b.bite.set(f, time + BITE_MS);
          const dmg = 3 + b.size * 1.5;
          if (f === player) tk.hitPlayer(dmg, f.x, f.y);
          else ctx.hit(f, dmg * 1.25, f.x, f.y);
        }
      }

      // Warm floor: fat beads fume, and the fumes stop your casting.
      if (warm && time >= fumeTick) {
        fumeTick = time + 400;
        for (const b of beads) {
          if (b.size < 4) continue;
          for (const f of [player, npc]) if (alive(f) && dist(b.x, b.y, f.x, f.y) < FUME_R) ctx.silence(f, 650);
        }
      }
      while (splashes.length && time - splashes[0].at > 600) splashes.shift();
    },

    playerSpeedMult() {
      return beads.some((b) => dist(b.x, b.y, player.x, player.y) < radius(b.size) + 18) ? 0.72 : 1;
    },
    npcSpeedMult() {
      return beads.some((b) => dist(b.x, b.y, npc.x, npc.y) < radius(b.size) + 18) ? 0.72 : 1;
    },

    npcSeek() {
      // Get behind a fat bead that sits by the player, so the strike bursts it at them.
      let best: Bead | null = null;
      let bs = 0;
      for (const b of beads) {
        if (b.size < 2) continue;
        const dp = dist(b.x, b.y, player.x, player.y);
        if (dp > 280) continue;
        const score = b.size * 100 - dp;
        if (score > bs) { bs = score; best = b; }
      }
      if (best) {
        const a = Math.atan2(player.y - best.y, player.x - best.x);
        const off = radius(best.size) + 30;
        return { x: clamp(best.x - Math.cos(a) * off, 60, W - 60), y: clamp(best.y - Math.sin(a) * off, top + 40, H - 40) };
      }
      // Otherwise keep clear of the beads that run at her.
      const near = beads.find((b) => dist(b.x, b.y, npc.x, npc.y) < 110);
      if (!near) return null;
      const a = Math.atan2(npc.y - near.y, npc.x - near.x);
      return { x: clamp(npc.x + Math.cos(a) * 120, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 120, top + 40, H - 40) };
    },

    drawGround(g, time) {
      // The silvering floor: tin-foil sheets laid out flat, stained grey where mercury has run.
      for (const s of sheets) {
        g.fillStyle(PAVE_DARK, 0.4); g.fillRect(s.x - s.w / 2 + 3, s.y - s.h / 2 + 4, s.w, s.h);
        g.fillStyle(MIRROR_DARK, 0.55); g.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
        g.lineStyle(1, MIRROR, 0.4);
        for (let k = 1; k < 4; k++) g.lineBetween(s.x - s.w / 2 + 4, s.y - s.h / 2 + (k * s.h) / 4, s.x + s.w / 2 - 4, s.y - s.h / 2 + (k * s.h) / 4 + 2);
        g.lineStyle(2, OAK_DARK, 0.6); g.strokeRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
        g.fillStyle(MIRROR_LIT, 0.08 + 0.05 * Math.sin(time / 900 + s.x)); g.fillRect(s.x - s.w / 2 + 6, s.y - s.h / 2 + 5, s.w * 0.4, 6);
      }
      // Where a bead will land: a widening silver ring and its puddle-to-be.
      for (const p of pours) {
        const k = clamp(1 - (p.at - time) / SPILL_WARN, 0, 1);
        g.lineStyle(2, MIRROR_LIT, 0.3 + k * 0.5); g.strokeCircle(p.x, p.y, 26 - k * 10);
        g.fillStyle(MIRROR, 0.15 + k * 0.3); g.fillEllipse(p.x, p.y, 14 + k * 12, 7 + k * 6);
      }
      // Vapour round the fat beads on a warm floor.
      if (warm) {
        for (const b of beads) {
          if (b.size < 4) continue;
          for (let w = 0; w < 6; w++) {
            const a = (w / 6) * Math.PI * 2 + time / 1400;
            const r = FUME_R * (0.55 + 0.35 * Math.sin(time / 500 + w * 1.7));
            g.fillStyle(0xb8c8b0, 0.07); g.fillCircle(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r * 0.7, 22);
          }
          g.lineStyle(1, 0xc8d8c0, 0.35); g.strokeEllipse(b.x, b.y, FUME_R * 2, FUME_R * 1.5);
        }
      }
      // Beads: a fat liquid-metal drop, darker at the rim, the room reflected small on its skin.
      for (const b of beads) drawBead(g, b, time);
      for (const s of splashes) {
        const k = (time - s.at) / 600;
        for (let i = -2; i <= 2; i++) {
          const a = s.a + i * 0.28;
          g.fillStyle(MIRROR_LIT, 0.8 * (1 - k));
          g.fillCircle(s.x + Math.cos(a) * (12 + k * 40), s.y + Math.sin(a) * (12 + k * 40), 3 * (1 - k) + 1);
        }
      }
    },

    drawAir(g, time) {
      // The flask: a long-necked silvering flask tipping over the landing spot, pouring a thread.
      for (const p of pours) {
        const k = clamp(1 - (p.at - time) / SPILL_WARN, 0, 1);
        const fx = p.x + 18, fy = p.y - 120;
        const tilt = 0.6 + k * 0.9;
        const nx = fx - Math.cos(tilt) * 30, ny = fy + Math.sin(tilt) * 30;
        g.fillStyle(0xdde8ee, 0.35); g.fillCircle(fx, fy, 16);
        g.lineStyle(2, 0xf2f8ff, 0.7); g.strokeCircle(fx, fy, 16);
        g.fillStyle(MIRROR, 0.9); g.fillCircle(fx, fy + 5, 10);
        g.lineStyle(6, 0xdde8ee, 0.45); g.lineBetween(fx, fy, nx, ny);
        g.lineStyle(2, 0xf2f8ff, 0.8); g.lineBetween(fx, fy, nx, ny);
        g.fillStyle(GILT_DARK, 1); g.fillCircle(nx, ny, 3);
        if (k > 0.3) { g.lineStyle(2, MIRROR_LIT, 0.9); g.lineBetween(nx, ny, p.x, p.y - 4); }
      }
    },

    drawHud(g, time) {
      // The flask on her bench: one pip per bead on the floor; the fill is the next pour.
      const x = W - 84, y = top + 14;
      g.fillStyle(0x101418, 0.7); g.fillRoundedRect(x - 10, y - 8, 84, 44, 6);
      g.fillStyle(0xdde8ee, 0.25); g.fillCircle(x + 14, y + 16, 13);
      g.lineStyle(2, 0xf2f8ff, 0.8); g.strokeCircle(x + 14, y + 16, 13);
      g.fillRect(x + 11, y - 4, 6, 8);
      const span = warm ? SPILL_HALF_MS : SPILL_MS;
      const k = clamp(1 - (nextSpill - time) / span, 0, 1);
      g.fillStyle(MIRROR_LIT, 0.9); g.fillCircle(x + 14, y + 16 + (1 - k) * 6, 4 + k * 7);
      for (let i = 0; i < MAX_BEADS; i++) {
        const px = x + 36 + (i % 3) * 11, py = y + 4 + Math.floor(i / 3) * 11;
        g.fillStyle(i < beads.length ? MIRROR_LIT : 0x3a4048, 1); g.fillCircle(px, py, 4);
      }
      if (warm) { g.fillStyle(0xc8d8c0, 0.5 + 0.3 * Math.sin(time / 200)); g.fillCircle(x + 70, y + 30, 3); }
    },

    destroy() {
      for (const b of [...beads]) removeBead(b);
    },
  };

  function drawBead(g: G, b: Bead, time: number): void {
    const r = radius(b.size);
    const sq = 1 + 0.06 * Math.sin(b.wob);
    shadow(g, b.x, b.y + r * 0.5, r * 2.1, r * 0.6, 0.35);
    g.fillStyle(MIRROR_DARK, 1); g.fillEllipse(b.x, b.y, r * 2 * sq, r * 1.6 / sq);
    g.fillStyle(MIRROR, 1); g.fillEllipse(b.x - r * 0.08, b.y - r * 0.1, r * 1.7 * sq, r * 1.3 / sq);
    // The room in the skin: a gilt window frame and the floor line, bent round the drop.
    g.fillStyle(dim(MIRROR, 0.25), 1); g.fillEllipse(b.x, b.y + r * 0.3, r * 1.5, r * 0.5);
    g.lineStyle(1, GILT, 0.7); g.strokeRect(b.x - r * 0.45, b.y - r * 0.55, r * 0.5, r * 0.45);
    g.fillStyle(lit(MIRROR, 0.6), 0.8); g.fillEllipse(b.x - r * 0.35, b.y - r * 0.4, r * 0.7, r * 0.32);
    g.fillStyle(0xffffff, 0.95); g.fillCircle(b.x - r * 0.42, b.y - r * 0.45, Math.max(1.5, r * 0.12));
    if (b.size >= 2) {
      // A size stamp: one tiny glint per measure of quicksilver gathered.
      for (let i = 0; i < Math.min(b.size, 9); i++) {
        const a = (i / Math.min(b.size, 9)) * Math.PI * 2 + time / 1100;
        g.fillStyle(MIRROR_LIT, 0.6); g.fillCircle(b.x + Math.cos(a) * r * 0.8, b.y + Math.sin(a) * r * 0.62, 1.4);
      }
    }
    if (time - b.born < 300) glow(g, b.x, b.y, r + 10, MIRROR_LIT, 0.08, 3);
    g.lineStyle(1, OAK, 0.25); g.strokeEllipse(b.x, b.y, r * 2 * sq, r * 1.6 / sq);
  }
}

export const FALLEN_QUICKSILVER: GimmickDef = {
  id: ID,
  rules: 'Quicksilver beads run at the nearest fighter and merge, biting harder the fatter. Strike one to burst it away from you. At half, fat ones fume.',
  make,
};
