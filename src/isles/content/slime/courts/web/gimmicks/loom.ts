import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { BARK, BARK_DARK, BRUISE, BRUISE_LIT, PLANK_DARK, PLANK_LIT, SILK, SILK_LIT, SILK_SHADE } from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * Loom — Weaver Shuttle.
 *
 * The whole yard is the loom. The warp runs from wall to wall in a thousand pale threads, and the
 * great shuttle flies across it, row by row: first along the bottom, then a row higher, then
 * higher. Where it has passed it leaves a band of woven cloth standing behind it — a screen that
 * catches every shot thrown into it, from either side. Only the newest three rows stand; older
 * cloth is wound away on the beam. The rows climb to the top, the cloth is cut, and the weaving
 * starts again from the bottom.
 *
 * The shuttle itself is a hard thing flying fast: in its row, it hits whoever it meets. Strike it
 * as it comes and you bat it back the way it came, faster. Weaver hides behind her newest cloth
 * and steps out to cast — use it the same way, or bat the shuttle into her.
 */

const ROW_H = 46;
const BAND_HALF = 18;
const STANDING = 3;
const SHUTTLE_DMG = 11;

interface Band { y: number; wovenAt: number; dropAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const bands: Band[] = [];
  const passMs = ctx.hard ? 1050 : 1300;
  const WARN = 750;
  const GAP_MS = ctx.hard ? 650 : 900;
  const yBottom = H - 50;
  const yTop = top + 60;
  let rowY = yBottom;
  /** Pass state: warn → fly → gap → next row. */
  let phase: 'warn' | 'fly' | 'gap' = 'gap';
  let phaseAt = 0;
  let dir = 1;
  let sx = 0;
  let speed = 0;
  let hitThisPass = new Set<Fighter>();
  let batted = 0;
  let shuttle: StrikeTarget | null = null;
  let cutAt = -9999;
  let started = false;
  /** Weaver's habit: 2.6s hidden behind the cloth, 1.9s out casting, round and round. */
  const hiding = (time: number) => time % 4500 < 2600;

  const inBand = (y: number) => bands.some((b) => b.dropAt === 0 && Math.abs(y - b.y) < BAND_HALF);

  function startRow(time: number): void {
    phase = 'warn';
    phaseAt = time;
    dir = -dir;
    sx = dir > 0 ? 20 : W - 20;
    speed = (W - 40) / (passMs / 1000);
    hitThisPass = new Set();
    batted = 0;
  }

  function weave(time: number): void {
    bands.push({ y: rowY, wovenAt: time, dropAt: 0 });
    const standing = bands.filter((b) => b.dropAt === 0);
    if (standing.length > STANDING) standing[0].dropAt = time;
    rowY -= ROW_H;
    if (rowY < yTop) {
      // The cloth is finished: cut it off and start a fresh piece from the bottom.
      for (const b of bands) if (b.dropAt === 0) b.dropAt = time;
      rowY = yBottom;
      cutAt = time;
      ctx.banner('THE CLOTH IS CUT', '#ddd4f0');
      ctx.sfx('slash');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        phaseAt = time;
        shuttle = ctx.target({ x: -100, y: -100, r: 18, onStruck: () => {
          if (phase !== 'fly' || batted > 1) return;
          batted++;
          dir = -dir;
          speed *= 1.4;
          hitThisPass = new Set();
          ctx.sfx('boing');
          ctx.float(sx, rowY - 30, 'BATTED BACK', '#f3f4ec');
        } });
      }
      if (phase === 'gap' && time - phaseAt >= GAP_MS) startRow(time);
      else if (phase === 'warn' && time - phaseAt >= WARN) { phase = 'fly'; phaseAt = time; ctx.sfx('whoosh'); }
      else if (phase === 'fly') {
        sx += dir * speed * dt;
        shuttle?.moveTo(sx, rowY);
        for (const f of [player, npc]) {
          if (!alive(f) || hitThisPass.has(f)) continue;
          if (Math.abs(f.y - rowY) < 26 && Math.abs(f.x - sx) < 30) {
            hitThisPass.add(f);
            ctx.hit(f, ctx.hard && f === player ? SHUTTLE_DMG + 3 : SHUTTLE_DMG, f.x, f.y);
            ctx.nudge(f, dir * 60, f.y < rowY ? -30 : 30);
            ctx.sfx('hit-heavy');
          }
        }
        if (sx < -10 || sx > W + 10) {
          phase = 'gap'; phaseAt = time;
          shuttle?.moveTo(-100, -100);
          weave(time);
        }
      }
      for (let i = bands.length - 1; i >= 0; i--) if (bands[i].dropAt > 0 && time - bands[i].dropAt > 700) bands.splice(i, 1);
      // The cloth catches shots — anybody's.
      if (bands.some((b) => b.dropAt === 0)) {
        for (const s of ctx.shotsNear(W / 2, (top + H) / 2, 1200)) {
          if (inBand(s.y)) { s.block(); ctx.flash(s.x, s.y, SILK_LIT); }
        }
      }
    },

    playerSpeedMult() { return alive(player) && inBand(player.y) ? 0.72 : 1; },
    npcSpeedMult() { return alive(npc) && inBand(npc.y) ? 0.72 : 1; },

    npcSeek() {
      if (!alive(player)) return null;
      const now = ctx.scene.time.now;
      // Out of the shuttle's row first.
      if ((phase === 'warn' || phase === 'fly') && Math.abs(npc.y - rowY) < 60) {
        return { x: npc.x, y: clamp(npc.y + (npc.y < rowY ? -110 : 110), top + 50, H - 40) };
      }
      const standing = bands.filter((b) => b.dropAt === 0);
      if (hiding(now) && standing.length) {
        // Hide: the far side of the band nearest you.
        const b = standing.reduce((m, x) => (Math.abs(x.y - player.y) < Math.abs(m.y - player.y) ? x : m));
        const side = player.y < b.y ? 1 : -1;
        return { x: clamp(player.x + (npc.x > player.x ? 120 : -120), 60, W - 60), y: clamp(b.y + side * 70, top + 50, H - 40) };
      }
      // Out: come round to your side to cast.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 200, 60, W - 60), y: clamp(player.y + Math.sin(a) * 140, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The warp: wall to wall, faint, a thread every few pixels.
      for (let x = 12; x < W; x += 16) { g.lineStyle(1, SILK_LIT, 0.07); g.lineBetween(x, top + 4, x, H - 6); }
      // The beams down both sides.
      for (const x0 of [0, W - 16]) {
        g.fillStyle(BARK_DARK, 1); g.fillRect(x0, top, 16, H - top);
        g.fillStyle(BARK, 1); g.fillRect(x0 + 3, top, 10, H - top);
      }
      // The row being woven: the shed opens (two lines spread) during the warning.
      if (phase === 'warn' || phase === 'fly') {
        const k = phase === 'warn' ? clamp((time - phaseAt) / WARN, 0, 1) : 1;
        g.fillStyle(BRUISE_LIT, 0.08 + k * 0.1); g.fillRect(0, rowY - 26, W, 52);
        g.lineStyle(1.5, BRUISE_LIT, 0.3 + k * 0.5); g.lineBetween(0, rowY - 8 - k * 14, W, rowY - 8 - k * 14); g.lineBetween(0, rowY + 8 + k * 14, W, rowY + 8 + k * 14);
        if (phase === 'warn') {
          const ex = dir > 0 ? 20 : W - 20;
          for (let i = 0; i < 4; i++) { g.fillStyle(PLANK_LIT, 0.3 + k * 0.5); g.fillTriangle(ex + dir * (40 + i * 30), rowY, ex + dir * (28 + i * 30), rowY - 6, ex + dir * (28 + i * 30), rowY + 6); }
        }
      }
      // The woven cloth: bands of bruise and silver weave lying across the floor.
      for (const b of bands) {
        const grow = b.dropAt ? 1 - clamp((time - b.dropAt) / 700, 0, 1) : clamp((time - b.wovenAt) / 250, 0, 1);
        const stripe = Math.round((b.y - top) / ROW_H) % 3;
        const c = stripe === 0 ? BRUISE : stripe === 1 ? SILK_SHADE : SILK;
        g.fillStyle(dim(c, 0.35), 0.8 * grow); g.fillRect(0, b.y - BAND_HALF + 4, W, BAND_HALF * 2);
        g.fillStyle(c, 0.85 * grow); g.fillRect(0, b.y - BAND_HALF, W, BAND_HALF * 2 - 4);
        g.lineStyle(1, lit(c, 0.3), 0.45 * grow);
        for (let x = 6; x < W; x += 10) g.lineBetween(x, b.y - BAND_HALF, x + 5, b.y + BAND_HALF - 4);
        g.lineStyle(1, dim(c, 0.3), 0.5 * grow);
        for (let y = b.y - BAND_HALF + 4; y < b.y + BAND_HALF - 4; y += 6) g.lineBetween(0, y, W, y);
        g.lineStyle(2, SILK_LIT, 0.7 * grow); g.lineBetween(0, b.y - BAND_HALF, W, b.y - BAND_HALF);
      }
      if (time - cutAt < 700) {
        const k = (time - cutAt) / 700;
        g.lineStyle(3, SILK_LIT, 1 - k); g.lineBetween(0, yTop - 10, W, yTop - 10);
      }
    },

    drawAir(g, time) {
      if (phase !== 'fly' && phase !== 'warn') return;
      const x = phase === 'warn' ? (dir > 0 ? 20 : W - 20) + Math.sin(time / 30) * 2 : sx;
      // The shuttle: a boat of polished wood with a bobbin of silk, the weft paying out behind it.
      const from = dir > 0 ? 0 : W;
      g.lineStyle(1.5, SILK_LIT, 0.8); g.lineBetween(from, rowY, x - dir * 20, rowY);
      g.fillStyle(0x000000, 0.25); g.fillEllipse(x, rowY + 14, 60, 10);
      g.fillStyle(PLANK_DARK, 1); g.fillEllipse(x, rowY + 1, 62, 16);
      g.fillStyle(PLANK_LIT, 1); g.fillEllipse(x, rowY - 1, 56, 11);
      g.fillStyle(lit(PLANK_LIT, 0.3), 1); g.fillEllipse(x - 6, rowY - 3, 30, 3);
      g.fillStyle(PLANK_DARK, 1); g.fillTriangle(x + dir * 31, rowY, x + dir * 22, rowY - 5, x + dir * 22, rowY + 5);
      g.fillStyle(SILK_LIT, 1); g.fillRect(x - 9, rowY - 4, 18, 7);
      g.lineStyle(1, SILK_SHADE, 1); for (let k = -7; k <= 7; k += 3) g.lineBetween(x + k, rowY - 4, x + k, rowY + 3);
      if (phase === 'fly') {
        for (let i = 1; i < 5; i++) { g.fillStyle(SILK_LIT, 0.25 - i * 0.05); g.fillEllipse(x - dir * i * 18, rowY, 30, 6); }
        if (batted > 0) { g.lineStyle(2, 0xffffff, 0.5); g.strokeCircle(x, rowY, 26); }
      }
    },
  };
}

export const LOOM: GimmickDef = {
  id: 'web-loom',
  rules: 'The shuttle flies across row by row, striking whoever it meets and leaving a band of cloth that catches every shot. Strike the shuttle to bat it back.',
  make,
};
