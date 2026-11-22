import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { carvedNumber } from '../art';
import { BONE, BONE_DARK, DIRT, DIRT_DARK, DIRT_LIT, LAMP, LICHEN, PEAT_DARK, SLAB, SLAB_DARK, SLAB_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Epitaphs — Stonecutter Elegy.
 *
 * Elegy cuts the Grave Court's headstones, and on Fangmire you cut them early: the date goes on
 * the day a household is passed over. Here she has cut countdowns. Each stone in the yard carries
 * a number that ticks down a second at a time, sand trickling from its shoulders into the grave in
 * front of it; when a stone reaches nought, that grave erupts — earth and old bones straight up —
 * and anyone standing on it is thrown and stunned. Then the count starts again.
 *
 * A stone is only stone. Strike one and the chips fly and its count is cut back to full — save
 * the grave you are standing on, or leave the foe's to run out. Elegy carries a chisel, and now
 * and then she takes three off the stone whose grave you are nearest.
 */

const GRAVE_W = 70;
const GRAVE_H = 50;
const FULL = 12;
const ERUPT_DMG = 16;
const ERUPT_STUN = 480;

interface Stone {
  x: number; y: number;
  /** Seconds left (fractional). */
  count: number;
  eruptAt: number;
  chippedAt: number;
  chiselAt: number;
  handle: StrikeTarget;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const spots: Pt[] = [
    { x: 190, y: top + 110 }, { x: W - 190, y: top + 110 }, { x: W / 2, y: top + 250 },
    { x: 230, y: H - 150 }, { x: W - 230, y: H - 150 },
  ];
  if (ctx.hard) spots.push({ x: W / 2, y: H - 60 - GRAVE_H });
  const chiselEvery = ctx.hard ? 5500 : 7000;
  const stones: Stone[] = [];
  let nextChisel = 0;
  let started = false;
  let chiselFx: { x: number; y: number; at: number } | null = null;

  /** The grave in front of a stone (south of it). */
  const graveOf = (s: Stone): Pt => ({ x: s.x, y: s.y + 8 + GRAVE_H / 2 });
  const onGrave = (s: Stone, f: Fighter) => {
    const gp = graveOf(s);
    return Math.abs(f.x - gp.x) < GRAVE_W / 2 + 6 && Math.abs(f.y - gp.y) < GRAVE_H / 2 + 6;
  };

  for (const [i, p] of spots.entries()) {
    const s: Stone = {
      x: p.x, y: p.y, count: 5 + i * 1.7 + rng() * 2, eruptAt: -9999, chippedAt: -9999, chiselAt: -9999,
      handle: ctx.target({
        x: p.x, y: p.y - 18, r: 20,
        onStruck: () => {
          if (s.count >= FULL - 0.3) return;
          s.count = FULL;
          s.chippedAt = ctx.scene.time.now;
          ctx.float(s.x, s.y - 54, 'RECUT', '#e6dfc8');
          ctx.sfx('crystal-chime');
        },
      }),
    };
    stones.push(s);
  }

  function erupt(s: Stone, time: number): void {
    s.eruptAt = time;
    s.count = FULL - 2 + rng() * 2;
    const gp = graveOf(s);
    ctx.sfx('quake');
    for (const f of [player, npc]) {
      if (!alive(f) || ctx.isAirborne(f) || !onGrave(s, f)) continue;
      ctx.hit(f, ERUPT_DMG + (ctx.hard ? 3 : 0), f.x, f.y);
      ctx.stun(f, ERUPT_STUN);
      const d = Math.max(1, dist(gp.x, gp.y, f.x, f.y));
      ctx.nudge(f, ((f.x - gp.x) / d) * 50, 40 + ((f.y - gp.y) / d) * 20);
      ctx.float(f.x, f.y - 48, 'HERE LIES', '#e2b462');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextChisel = time + chiselEvery; ctx.banner('EVERY STONE IS COUNTING DOWN', '#e2b462'); }
      for (const s of stones) {
        const before = Math.ceil(s.count);
        s.count -= dt;
        if (Math.ceil(s.count) !== before && s.count > 0 && s.count < 3.2) ctx.sfx('clock-tick');
        if (s.count <= 0) erupt(s, time);
      }
      // Elegy's chisel: three off the stone whose grave you are nearest.
      if (time >= nextChisel) {
        nextChisel = time + chiselEvery;
        let best: Stone | null = null, bd = 240;
        for (const s of stones) { const gp = graveOf(s); const d = dist(gp.x, gp.y, player.x, player.y); if (d < bd) { bd = d; best = s; } }
        if (best && best.count > 2) {
          best.count = Math.max(1.2, best.count - 3);
          best.chiselAt = time;
          chiselFx = { x: best.x, y: best.y - 20, at: time };
          ctx.float(best.x, best.y - 60, 'ELEGY CUTS: −3', '#e2b462');
          ctx.sfx('stab');
        }
      }
    },

    npcSeek(): Pt | null {
      // Keep off any grave that is about to go, and hover by the player when theirs is.
      const danger = (x: number, y: number) => stones.some((s) => {
        const gp = graveOf(s);
        return s.count < 3.5 && Math.abs(x - gp.x) < GRAVE_W / 2 + 30 && Math.abs(y - gp.y) < GRAVE_H / 2 + 30;
      });
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      for (const d of [130, 170, 210]) {
        for (const off of [0, 0.7, -0.7, 1.4, -1.4, Math.PI]) {
          const x = clamp(player.x + Math.cos(a + off) * d, 60, W - 60), y = clamp(player.y + Math.sin(a + off) * d, top + 50, H - 40);
          if (!danger(x, y)) return { x, y };
        }
      }
      return { x: W / 2, y: (top + H) / 2 };
    },

    drawGround(g, time) {
      for (const s of stones) {
        const gp = graveOf(s);
        const urgent = clamp(1 - s.count / 4, 0, 1);
        const x0 = gp.x - GRAVE_W / 2, y0 = gp.y - GRAVE_H / 2;
        // A kerbed grave of loose earth, cracking as its count runs out.
        g.fillStyle(SLAB_DARK, 1); g.fillRect(x0 - 4, y0 - 2, GRAVE_W + 8, GRAVE_H + 6);
        g.fillStyle(SLAB, 1); g.fillRect(x0 - 4, y0 - 4, GRAVE_W + 8, 4); g.fillRect(x0 - 4, y0 - 4, 4, GRAVE_H + 6); g.fillRect(x0 + GRAVE_W, y0 - 4, 4, GRAVE_H + 6);
        g.fillStyle(DIRT, 1); g.fillRect(x0, y0, GRAVE_W, GRAVE_H);
        g.fillStyle(DIRT_LIT, 0.5); g.fillRect(x0, y0, GRAVE_W, 6);
        if (urgent > 0) {
          g.lineStyle(1.5, PEAT_DARK, 0.5 + urgent * 0.5);
          for (let i = 0; i < 5; i++) {
            const cx = gp.x + Math.cos(i * 1.3) * 10, cy = gp.y + Math.sin(i * 1.3) * 6;
            g.lineBetween(cx, cy, cx + Math.cos(i * 1.3) * urgent * 26, cy + Math.sin(i * 1.3) * urgent * 16);
          }
          g.fillStyle(LAMP, 0.08 + urgent * 0.2 * (0.6 + Math.sin(time / 70) * 0.4)); g.fillRect(x0, y0, GRAVE_W, GRAVE_H);
        }
        // Sand from the stone pooling at its foot.
        g.fillStyle(0xd8c28a, 0.5); g.fillEllipse(s.x, s.y + 6, 30 * (1 - s.count / FULL) + 6, 6);
        // The eruption's crater, a moment after.
        const since = time - s.eruptAt;
        if (since < 1200) {
          const k = since / 1200;
          g.fillStyle(DIRT_DARK, 0.9 * (1 - k)); g.fillEllipse(gp.x, gp.y, GRAVE_W * 1.4, GRAVE_H * 1.2);
          g.lineStyle(3, LAMP, 0.6 * (1 - k)); g.strokeEllipse(gp.x, gp.y, GRAVE_W * (1 + k), GRAVE_H * (1 + k));
        }
      }
    },

    drawAir(g, time) {
      for (const s of stones) {
        // The headstone, face on, with its count cut into it.
        const x = s.x, y = s.y;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 6, y + 2, 50, 10);
        g.fillStyle(SLAB_DARK, 1); g.fillRect(x - 22, y - 40, 46, 42);
        g.fillStyle(SLAB, 1); g.fillRect(x - 22, y - 40, 44, 40);
        g.fillStyle(SLAB, 1); g.fillEllipse(x, y - 40, 44, 26);
        g.fillStyle(SLAB_LIT, 1); g.fillRect(x - 22, y - 40, 4, 40); g.fillEllipse(x - 6, y - 46, 24, 10);
        g.fillStyle(LICHEN, 0.4); g.fillCircle(x + 14, y - 8, 4); g.fillCircle(x - 15, y - 44, 3);
        // An hourglass carved over the number.
        g.lineStyle(1.2, SLAB_DARK, 1);
        g.lineBetween(x - 5, y - 50, x + 5, y - 50); g.lineBetween(x - 5, y - 40, x + 5, y - 40);
        g.lineBetween(x - 5, y - 50, x + 5, y - 40); g.lineBetween(x + 5, y - 50, x - 5, y - 40);
        const n = Math.max(0, Math.ceil(s.count));
        const hot = s.count < 3.5;
        const cut = hot ? (Math.floor(time / 160) % 2 ? 0xc04020 : 0x7a2a14) : dim(SLAB_DARK, 0.3);
        carvedNumber(g, x, y - 20, n, 18, cut, SLAB_LIT, 1);
        // Sand trickling from the shoulders.
        for (const k of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            const ph = ((time / 500) + i / 3 + (k > 0 ? 0.2 : 0)) % 1;
            g.fillStyle(0xd8c28a, 0.8 * (1 - ph)); g.fillCircle(x + k * 18, y - 30 + ph * 32, 1.2);
          }
        }
        // Chips flying when it is recut.
        const since = time - s.chippedAt;
        if (since < 500) {
          const k = since / 500;
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            g.fillStyle(lit(SLAB, 0.4), 1 - k); g.fillRect(x + Math.cos(a) * k * 40, y - 22 + Math.sin(a) * k * 30 + k * k * 20, 3, 2);
          }
        }
        // The eruption: earth and old bones thrown up.
        const ek = (time - s.eruptAt) / 900;
        if (ek >= 0 && ek < 1) {
          const gp = graveOf(s);
          for (let i = 0; i < 14; i++) {
            const a = -Math.PI / 2 + ((i / 13) - 0.5) * 2.2;
            const v = 90 + (i % 4) * 30;
            const px = gp.x + Math.cos(a) * v * ek, py = gp.y + Math.sin(a) * v * ek + 160 * ek * ek;
            if (i % 4 === 0) { g.fillStyle(BONE, 1 - ek); g.fillRect(px - 5, py - 1.5, 10, 3); g.fillCircle(px - 5, py, 2); g.fillCircle(px + 5, py, 2); }
            else { g.fillStyle(i % 2 ? DIRT : DIRT_DARK, 1 - ek); g.fillCircle(px, py, 4 + (i % 3)); }
          }
        }
      }
      if (chiselFx) {
        const k = (time - chiselFx.at) / 600;
        if (k > 1) chiselFx = null;
        else {
          // A chisel and a mallet striking, sparks.
          const { x, y } = chiselFx;
          g.lineStyle(3, BONE_DARK, 1 - k); g.lineBetween(x + 18, y - 18, x + 6, y - 4);
          g.fillStyle(0x6e5a44, 1 - k); g.fillRect(x + 16 + (1 - k) * 8, y - 28 - (1 - k) * 6, 12, 8);
          for (let i = 0; i < 6; i++) { g.fillStyle(LAMP, 1 - k); g.fillCircle(x + 4 + Math.cos(i) * k * 26, y - 2 + Math.sin(i) * k * 18, 1.6); }
        }
      }
    },

    destroy() { for (const s of stones) s.handle.remove(); },
  };
}

export const EPITAPHS: GimmickDef = {
  id: 'grave-epitaphs',
  rules: 'Each headstone counts down; at nought the grave before it erupts, throwing and stunning whoever stands on it. Strike a stone to recut its count to full.',
  make,
};
