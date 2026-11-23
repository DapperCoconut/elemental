import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { bandsman, drum, type BandPart } from '../art';
import { BRAID, BRASS, BRASS_LIT, CREAM, SCARLET, SCARLET_LIT } from '../palette';
import { alive, alongLoop, clamp, dist, loopLength, stepDt } from '../util';

/**
 * Marching Band — Drum-Major Strut.
 *
 * Seven bandsmen march a loop round the drill square in step, the bass drummer at their head.
 * Walk into the column and you are swept along with it, trodden on every beat. Every fourth
 * beat the bass drum booms: a shockwave round the head of the column that throws everyone near
 * it aside — and anyone the column is carrying is carried straight into it.
 *
 * The rule is the parade ground's: a blow landed on a fighter standing close beside the column
 * shoves them into the ranks. Strut stands so you are between him and the band. Do the same to
 * him, and let the drum do the rest.
 */

const BEAT_MS = 520;
const FILE = 7;
const SPACING = 36;
const IN_COLUMN = 30;
const SHOVE_REACH = 120;
const TRAMPLE = 2;
const BOOM_DMG = 11;

const PARTS: BandPart[] = ['bass', 'drum', 'drum', 'cornet', 'cornet', 'trombone', 'tuba'];

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const speed = ctx.hard ? 118 : 96;
  const boomR = ctx.hard ? 150 : 132;
  const route: Pt[] = [
    { x: 150, y: top + 90 }, { x: W - 150, y: top + 90 }, { x: W - 150, y: H - 86 }, { x: 150, y: H - 86 },
  ];
  const len = loopLength(route);
  let u = 0.02;
  let beat = 0;
  let nextBeat = 0;
  let lastBoomAt = -9999;
  let lastBoomAt2: Pt = { x: 0, y: 0 };
  let started = false;
  const lastShove = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  const swept = new Map<Fighter, boolean>([[player, false], [npc, false]]);

  /** Where each bandsman is now: 0 is the bass drum at the head. */
  const ranks = () => {
    const out: { x: number; y: number; a: number }[] = [];
    for (let i = 0; i < FILE; i++) out.push(alongLoop(route, u - (i * SPACING) / len));
    return out;
  };

  const nearestRank = (f: Fighter, rs: { x: number; y: number; a: number }[]) => {
    let best = rs[0], bd = Infinity;
    for (const r of rs) { const d = dist(r.x, r.y, f.x, f.y); if (d < bd) { bd = d; best = r; } }
    return { r: best, d: bd };
  };

  function shoveIn(f: Fighter): void {
    const now = ctx.scene.time.now;
    if (!alive(f) || now - (lastShove.get(f) ?? 0) < 900) return;
    const { r, d } = nearestRank(f, ranks());
    if (d < IN_COLUMN || d > SHOVE_REACH) return;
    lastShove.set(f, now);
    const k = Math.min(90, d - 10) / d;
    ctx.nudge(f, (r.x - f.x) * k, (r.y - f.y) * k);
    ctx.float(f.x, f.y - 44, 'INTO THE RANKS', '#ffd8a0');
    ctx.sfx('drum-hit');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextBeat = time + BEAT_MS;
        ctx.banner('BY THE LEFT — QUICK MARCH', '#ffd8a0');
      }
      u = (u + (speed * dt) / len) % 1;
      const rs = ranks();
      const head = rs[0];

      // Swept along: anyone in the file is carried with it and trodden on each beat.
      for (const f of [player, npc]) {
        if (!alive(f)) { swept.set(f, false); continue; }
        const { r, d } = nearestRank(f, rs);
        const inIt = d < IN_COLUMN;
        swept.set(f, inIt);
        if (inIt) {
          const cx = r.x - f.x, cy = r.y - f.y;
          ctx.nudge(f, Math.cos(r.a) * speed * 1.15 * dt + cx * 2 * dt, Math.sin(r.a) * speed * 1.15 * dt + cy * 2 * dt);
        }
      }

      if (time >= nextBeat) {
        nextBeat += BEAT_MS;
        if (nextBeat < time) nextBeat = time + BEAT_MS;
        beat = (beat + 1) % 4;
        for (const f of [player, npc]) {
          if (swept.get(f) && alive(f)) { ctx.hit(f, TRAMPLE, f.x, f.y); }
        }
        if (beat === 0) {
          // BOOM.
          lastBoomAt = time;
          lastBoomAt2 = { x: head.x, y: head.y };
          ctx.sfx('drum-hit');
          ctx.sfx('quake');
          for (const f of [player, npc]) {
            if (!alive(f)) continue;
            const d = dist(head.x, head.y, f.x, f.y);
            if (d > boomR) continue;
            ctx.hit(f, BOOM_DMG + (swept.get(f) ? 5 : 0), f.x, f.y);
            const a = Math.atan2(f.y - head.y, f.x - head.x);
            ctx.nudge(f, Math.cos(a) * 100, Math.sin(a) * 100);
            ctx.float(f.x, f.y - 46, 'BOOM', '#ff9a8a');
          }
        } else {
          ctx.sfx('drum-hit');
        }
      }
    },

    onPlayerHurt() { shoveIn(player); },
    onNpcHurt() { shoveIn(npc); },

    npcSeek() {
      if (!alive(player) || !alive(npc)) return null;
      const rs = ranks();
      const head = rs[0];
      // About to boom and too close: out of the drum's reach first.
      const toBoom = beat === 3 || (beat === 2 && nextBeat - ctx.scene.time.now < 200);
      if (toBoom && dist(head.x, head.y, npc.x, npc.y) < boomR + 40) {
        const a = Math.atan2(npc.y - head.y, npc.x - head.x);
        return { x: clamp(head.x + Math.cos(a) * (boomR + 90), 60, W - 60), y: clamp(head.y + Math.sin(a) * (boomR + 90), top + 50, H - 40) };
      }
      // Otherwise stand so you are between him and the column, so his blows put you in it.
      const { r } = nearestRank(player, rs);
      const dx = player.x - r.x, dy = player.y - r.y;
      const d = Math.hypot(dx, dy) || 1;
      return { x: clamp(player.x + (dx / d) * 150, 60, W - 60), y: clamp(player.y + (dy / d) * 150, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The chalked parade line and its chevrons, pointing the way the band marches.
      g.lineStyle(3, CREAM, 0.22);
      g.beginPath();
      route.forEach((p, i) => { if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); });
      g.closePath(); g.strokePath();
      for (let k = 0; k < 28; k++) {
        const p = alongLoop(route, k / 28 + ((time / 9000) % 1) * 0);
        const ca = Math.cos(p.a), sa = Math.sin(p.a);
        g.lineStyle(2, CREAM, 0.3);
        g.lineBetween(p.x - ca * 6 - sa * 7, p.y - sa * 6 + ca * 7, p.x + ca * 4, p.y + sa * 4);
        g.lineBetween(p.x - ca * 6 + sa * 7, p.y - sa * 6 - ca * 7, p.x + ca * 4, p.y + sa * 4);
      }
      const rs = ranks();
      const head = rs[0];
      // Footprints left behind the file.
      for (let i = 0; i < 14; i++) {
        const p = alongLoop(route, u - (FILE * SPACING + i * 22) / len);
        const side = i % 2 ? 1 : -1;
        g.fillStyle(dim(CREAM, 0.5), 0.25 * (1 - i / 14));
        g.fillEllipse(p.x - Math.sin(p.a) * side * 5, p.y + Math.cos(p.a) * side * 5, 7, 4);
      }
      // The drum's reach, filling in quarter by quarter as the bar counts up to the boom.
      const filled = beat;
      g.lineStyle(2, SCARLET_LIT, 0.25 + filled * 0.12); g.strokeCircle(head.x, head.y, boomR);
      for (let q = 0; q < filled; q++) {
        g.fillStyle(SCARLET, 0.06 + q * 0.03);
        g.slice(head.x, head.y, boomR, -Math.PI / 2 + (q * Math.PI) / 2, -Math.PI / 2 + ((q + 1) * Math.PI) / 2, false);
        g.fillPath();
      }
      // The boom itself: a shockwave and the dust it lifts.
      const k = (time - lastBoomAt) / 520;
      if (k >= 0 && k < 1) {
        g.lineStyle(10 * (1 - k), lit(SCARLET_LIT, 0.3), 0.8 * (1 - k)); g.strokeCircle(lastBoomAt2.x, lastBoomAt2.y, boomR * (0.3 + k * 0.8));
        g.lineStyle(3, BRAID, 0.6 * (1 - k)); g.strokeCircle(lastBoomAt2.x, lastBoomAt2.y, boomR * (0.2 + k * 0.55));
      }
      // Anyone being carried gets a shuffle-ring of feet.
      for (const f of [player, npc]) {
        if (!swept.get(f) || !alive(f)) continue;
        g.lineStyle(2, BRASS_LIT, 0.5 + Math.sin(time / 80) * 0.2); g.strokeEllipse(f.x, f.y + 14, 46, 14);
      }
    },

    drawAir(g, time) {
      const rs = ranks();
      const stepPh = (time / BEAT_MS) % 2;
      for (let i = FILE - 1; i >= 0; i--) {
        const r = rs[i];
        const dir = Math.cos(r.a) >= 0 ? 1 : -1;
        bandsman(g, r.x, r.y + 12, 0.95, PARTS[i], stepPh, dir, SCARLET, time);
      }
      // The bass drum swells on the counted beats.
      const head = rs[0];
      const beatK = clamp(1 - (time - (nextBeat - BEAT_MS)) / 180, 0, 1);
      if (beatK > 0) drum(g, head.x, head.y + 12, 13 * 0.95, SCARLET, true, beatK * (beat === 0 ? 1.6 : 0.6));
    },

    drawHud(g, time) {
      // The bar: four drum-beats, the fourth a big one.
      const cx = W / 2, y = top + 14;
      for (let q = 0; q < 4; q++) {
        const x = cx - 54 + q * 36;
        const on = q < beat || (q === 0 && time - lastBoomAt < 300);
        const big = q === 3;
        g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, big ? 11 : 8);
        g.fillStyle(on ? (big ? SCARLET_LIT : BRASS_LIT) : dim(BRASS, 0.5), 1); g.fillCircle(x, y, big ? 9 : 6);
        if (big) { g.lineStyle(1.5, CREAM, 0.9); g.strokeCircle(x, y, 9); }
      }
    },
  };
}

export const MARCHING_BAND: GimmickDef = {
  id: 'brass-marching-band',
  rules: 'A marching column sweeps along whoever walks into it. Every 4th beat its bass drum booms round the head. A blow beside the column shoves you into the ranks.',
  make,
};
