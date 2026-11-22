import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { basaltColumn, dustPuff } from '../art';
import { MAGMA, MAGMA_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Causeway — Columnar Fingal.
 *
 * The yard is paved with the tops of basalt columns, the giant's causeway, and under it the magma
 * that made it is still moving. Waves roll across the floor from one side to the other: as the
 * wave front passes, a ridge of columns thrusts up (their joints glow first), stands for a few
 * seconds, and sinks back.
 *
 * A risen column is high ground. Shots from below pass under whoever stands on one — they take
 * far less from a fighter on the floor — and blows struck down from the top land harder. But a
 * column rising *under* you throws you: hurt, flung along the wave, and knocked off your feet.
 * Step onto a column once it has risen, never onto one that is glowing. Fingal reads the waves
 * like a ferryman and goes looking for the ridge.
 */

const HR = 46;
const SQ = 0.62;
const DX = Math.sqrt(3) * HR;
const DY = 1.5 * HR * SQ;
const RISE_H = 24;
const WARN = 950;
const STAND = 4600;
const FRONT_V = 125;
const THROW_DMG = 10;

interface Cell { x: number; y: number; pick: number; warnAt: number; riseAt: number; sinkAt: number; thrown: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const cells: Cell[] = [];
  for (let r = 0; top + 30 + r * DY < H + 10; r++) {
    for (let c = -1; c * DX < W + DX; c++) {
      cells.push({ x: c * DX + (r % 2 ? DX / 2 : 0), y: top + 30 + r * DY, pick: rng(), warnAt: Infinity, riseAt: Infinity, sinkAt: -1, thrown: false });
    }
  }
  const every = ctx.hard ? 5200 : 6600;
  let nextWave = 0;
  let waveA = 0;
  let started = false;
  let waveCount = 0;
  const puffs: { x: number; y: number; at: number }[] = [];

  /** The cell a point stands on (nearest centre in the squashed metric). */
  function cellAt(x: number, y: number): Cell | null {
    let best: Cell | null = null, bd = Infinity;
    for (const c of cells) {
      const d = Math.hypot(c.x - x, (c.y - y) / SQ);
      if (d < bd) { bd = d; best = c; }
    }
    return bd < HR ? best : null;
  }

  /** 0 floor … 1 fully risen, at `time`. */
  function height(c: Cell, time: number): number {
    if (time < c.riseAt) return 0;
    if (time < c.riseAt + 250) return (time - c.riseAt) / 250;
    if (time < c.sinkAt) return 1;
    if (time < c.sinkAt + 400) return 1 - (time - c.sinkAt) / 400;
    return 0;
  }

  const high = (f: Fighter, time: number) => {
    const c = alive(f) ? cellAt(f.x, f.y) : null;
    return !!c && height(c, time) > 0.8;
  };

  function launchWave(time: number): void {
    waveCount++;
    // Across the yard from one side, alternating so no side is always safe.
    const base = [0, Math.PI, Math.PI / 2, -Math.PI / 2][waveCount % 4];
    waveA = base + (rng() - 0.5) * 0.6;
    const nx = Math.cos(waveA), ny = Math.sin(waveA);
    let pmin = Infinity;
    for (const c of cells) pmin = Math.min(pmin, c.x * nx + c.y * ny);
    // A broken ridge: every other band of cells along the front, and a scatter of others.
    const band = DX * 1.05;
    for (const c of cells) {
      const p = c.x * nx + c.y * ny - pmin;
      const inRidge = Math.floor(p / band) % 2 === 0 ? c.pick < 0.62 : c.pick < 0.14;
      if (!inRidge || height(c, time) > 0) continue;
      const at = time + WARN + (p / FRONT_V) * 1000;
      c.warnAt = at - WARN; c.riseAt = at; c.sinkAt = at + STAND; c.thrown = false;
      c.pick = rng();
    }
    ctx.banner('THE CAUSEWAY HEAVES', '#ffc890');
    ctx.sfx('quake');
  }

  function thrown(f: Fighter, c: Cell, time: number): void {
    if (f === player) tk.hitPlayer(THROW_DMG, f.x, f.y); else ctx.hit(f, THROW_DMG, f.x, f.y);
    ctx.nudge(f, Math.cos(waveA) * 90, Math.sin(waveA) * 90);
    ctx.stun(f, 380);
    ctx.float(f.x, f.y - 44, 'THROWN', '#ffc890');
    puffs.push({ x: c.x, y: c.y, at: time });
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextWave = time + 1500; }
      if (time >= nextWave) { nextWave = time + every; launchWave(time); }
      for (const c of cells) {
        if (c.thrown || time < c.riseAt || time > c.riseAt + 250) continue;
        c.thrown = true;
        ctx.sfx('stone-rise');
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          if (Math.hypot(c.x - f.x, (c.y - f.y) / SQ) < HR * 0.9) thrown(f, c, time);
        }
      }
      while (puffs.length && time - puffs[0].at > 700) puffs.shift();
    },

    playerTakenMult() {
      const t = ctx.scene.time.now;
      const ph = high(player, t), nh = high(npc, t);
      return ph && !nh ? 0.55 : nh && !ph ? 1.3 : 1;
    },
    npcTakenMult() {
      const t = ctx.scene.time.now;
      const ph = high(player, t), nh = high(npc, t);
      return nh && !ph ? 0.55 : ph && !nh ? 1.3 : 1;
    },

    npcSeek() {
      const t = ctx.scene.time.now;
      // A risen column with time left on it, near him and not too near you.
      let best: Cell | null = null, bs = Infinity;
      for (const c of cells) {
        if (height(c, t) < 0.95 || c.sinkAt - t < 1400) continue;
        const s = dist(c.x, c.y, npc.x, npc.y) - Math.min(220, dist(c.x, c.y, player.x, player.y)) * 0.5;
        if (s < bs) { bs = s; best = c; }
      }
      if (best) return { x: clamp(best.x, 60, W - 60), y: clamp(best.y, top + 50, H - 40) };
      // Standing on a glowing column: get off it, back against the wave.
      const here = cellAt(npc.x, npc.y);
      if (here && t >= here.warnAt && t < here.riseAt) {
        return { x: clamp(npc.x - Math.cos(waveA) * 120, 60, W - 60), y: clamp(npc.y - Math.sin(waveA) * 120, top + 50, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      // The floor first (every column), then the risen ones in row order so their faces overlap.
      for (const c of cells) {
        const h = height(c, time);
        const hot = time >= c.warnAt && time < c.riseAt ? clamp((time - c.warnAt) / WARN, 0, 1) : 0;
        if (h > 0) continue;
        basaltColumn(g, c.x, c.y, HR - 2, 3, hot * (0.6 + Math.sin(time / 60) * 0.4), SQ);
      }
      for (const c of cells) {
        const h = height(c, time);
        if (h <= 0) continue;
        const sinking = time > c.sinkAt - 700 && time < c.sinkAt;
        basaltColumn(g, c.x, c.y, HR - 2, 3 + h * RISE_H, sinking ? 0.25 : 0, SQ);
        if (sinking) { g.lineStyle(1.5, MAGMA_LIT, 0.4 + Math.sin(time / 80) * 0.3); g.strokeEllipse(c.x, c.y - 3 - h * RISE_H, HR * 1.4, HR * 0.8); }
      }
      // The wave's heat-haze along its front direction, faint.
      if (time < nextWave - every + 4000) {
        g.lineStyle(3, MAGMA, 0.12);
        const nx = Math.cos(waveA), ny = Math.sin(waveA);
        for (let i = -4; i <= 4; i++) g.lineBetween(W / 2 + ny * i * 80 - nx * 300, (top + H) / 2 - nx * i * 80 - ny * 300, W / 2 + ny * i * 80 - nx * 250, (top + H) / 2 - nx * i * 80 - ny * 250);
      }
    },

    drawAir(g, time) {
      for (const p of puffs) dustPuff(g, p.x, p.y - 20, (time - p.at) / 700, 34);
      // High-ground marker: a little cairn of light over whoever holds a column.
      for (const f of [player, npc]) {
        if (!high(f, time)) continue;
        g.lineStyle(2, f === player ? 0xa8e0ff : 0xffb8a0, 0.8);
        g.lineBetween(f.x - 8, f.y - 52, f.x, f.y - 60); g.lineBetween(f.x, f.y - 60, f.x + 8, f.y - 52);
      }
    },

    drawHud(g, time) {
      // A wave clock: a basalt hex filling with magma toward the next heave.
      const k = clamp(1 - (nextWave - time) / every, 0, 1);
      const x = W / 2, y = top + 18;
      g.fillStyle(0x24262c, 0.9); g.fillCircle(x, y, 12);
      g.fillStyle(MAGMA, 0.85); g.slice(x, y, 11, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.fillPath();
      g.lineStyle(2, 0x5c616c, 1); g.strokeCircle(x, y, 12);
    },
  };
}

export const CAUSEWAY: GimmickDef = {
  id: 'stonehold-causeway',
  rules: 'Waves of basalt columns rise and sink across the floor. A risen column is high ground — shots from below pass under you — but one rising under you throws you.',
  make,
};
