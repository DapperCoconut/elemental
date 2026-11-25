import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { SAND, SAND_DARK, SAND_DEEP, SAND_LIT, SAND_PALE, STRIPE_INDIGO, STRIPE_RED, STRIPE_SAFFRON, TILE, TIMBER, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, dist } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Sixteen Figures — Leyla, Sand-Reader: in the star's telling the woman who read *raml*, the
 * science of the sand, for Prince Sirocco, and told him whose tent the dune should take next.
 *
 * Raml is read in dots: a figure is four rows, each pressed into smoothed sand as one dot or two.
 * Leyla's tray lies in the middle of the yard, and its four rows are the yard's four bands, north
 * to south — each band staked out at the walls in its row's dyed pennant. She draws a figure row
 * by row; then, when the figure is read, every band whose row holds an odd count (one dot) is
 * struck — the sand of the whole band spears up — and every even band (two dots, or none) is
 * spared. The bands that will be struck are shaded while the figure is being drawn.
 *
 * Two things to do. Walk to an even band, as anyone would. Or tread on a dot: a scuffed dot is
 * gone, which flips its row — scuff a one-dot row and your band is spared; scuff one of a pair and
 * hers is struck. In the last moment before a reading the sand sets and nothing scuffs. At half
 * she reads the Mother and the Daughter together: two trays, and a band is struck if the two rows
 * together are odd. The bot walks out of a struck band, and otherwise goes to the tray to scuff a
 * dot of your row.
 */

const ID = fallenId('dunesea', 'raml');
const ROW_MS = 520;
const HOLD_MS = 2300;
const SET_MS = 700;
const REST_MS = 1500;
const STRIKE_MS = 650;
const ROW_GAP = 48;
const PAIR = 30;
const SCUFF_R = 14;
const BAND_COLORS = [STRIPE_RED, STRIPE_SAFFRON, TILE, STRIPE_INDIGO];

interface Dot { x: number; y: number; row: number; tray: number; gone: number }
interface Tray { x: number; y: number }
type Phase = 'rest' | 'draw' | 'hold' | 'strike';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const bandH = (H - top) / 4;
  const bandOf = (y: number) => clamp(Math.floor((y - top) / bandH), 0, 3);
  const midY = (top + H) / 2;
  let trays: Tray[] = [{ x: W / 2, y: midY }];
  let dots: Dot[] = [];
  let phase: Phase = 'rest';
  let phaseAt = 0;
  let struck: boolean[] = [false, false, false, false];
  let daughters = false;
  let started = false;

  const drawn = (d: Dot, time: number) => phase !== 'draw' || time - phaseAt >= (d.row + 1) * ROW_MS;
  /** A row's verdict so far: only the dots already pressed count. */
  const odd = (row: number, time = tk.now) => dots.filter((d) => d.row === row && !d.gone && drawn(d, time)).length % 2 === 1;
  const holdEnd = () => phaseAt + 4 * ROW_MS + HOLD_MS;
  const set = (time: number) => phase === 'hold' && time > holdEnd() - SET_MS;
  const rowY = (t: Tray, row: number) => t.y - ROW_GAP * 1.5 + row * ROW_GAP;

  function throwFigure(time: number): void {
    dots = [];
    let counts: number[][] = [];
    for (let tries = 0; tries < 20; tries++) {
      counts = trays.map(() => [0, 1, 2, 3].map(() => (rng() < 0.5 ? 1 : 2)));
      const par = [0, 1, 2, 3].map((r) => counts.reduce((s, c) => s + c[r], 0) % 2);
      if (par.includes(0) && par.includes(1)) break;
    }
    trays.forEach((t, ti) => {
      for (let r = 0; r < 4; r++) {
        const y = rowY(t, r);
        if (counts[ti][r] === 1) dots.push({ x: t.x, y, row: r, tray: ti, gone: 0 });
        else { dots.push({ x: t.x - PAIR, y, row: r, tray: ti, gone: 0 }, { x: t.x + PAIR, y, row: r, tray: ti, gone: 0 }); }
      }
    });
    phase = 'draw'; phaseAt = time;
    ctx.sfx('dice');
  }

  function read(time: number): void {
    phase = 'strike'; phaseAt = time;
    struck = [0, 1, 2, 3].map((r) => odd(r, time));
    ctx.sfx('quake');
    for (const f of [player, npc]) {
      if (!alive(f) || !struck[bandOf(f.y)]) continue;
      if (f === player) tk.hitPlayer(22, f.x, f.y);
      else { ctx.hit(npc, 34, f.x, f.y); ctx.float(f.x, f.y - 52, 'READ', '#f2d496'); }
    }
  }

  function scuff(f: Fighter, time: number): void {
    if (phase !== 'draw' && phase !== 'hold') return;
    if (set(time)) return;
    for (const d of dots) {
      if (d.gone || !drawn(d, time) || dist(f.x, f.y, d.x, d.y) > SCUFF_R) continue;
      d.gone = time;
      ctx.sfx('snap-back');
      ctx.float(d.x, d.y - 24, f === player ? 'SCUFFED' : 'SHE SCUFFS', '#f2d496');
    }
  }

  return {
    update(time) {
      if (!started) { started = true; phase = 'rest'; phaseAt = time - REST_MS + 1800; }
      if (!daughters && npc.hp < npc.maxHp * 0.5 && phase !== 'strike') {
        daughters = true;
        trays = [{ x: W * 0.31, y: midY }, { x: W * 0.69, y: midY }];
        dots = []; phase = 'rest'; phaseAt = time;
        ctx.banner('THE MOTHER AND THE DAUGHTER', '#f2d496'); ctx.sfx('curse-cast');
      }
      if (phase === 'rest' && time - phaseAt > REST_MS) throwFigure(time);
      else if (phase === 'draw' && time - phaseAt >= 4 * ROW_MS) { phase = 'hold'; }
      else if (phase === 'hold' && time >= holdEnd()) read(time);
      else if (phase === 'strike' && time - phaseAt > STRIKE_MS) { phase = 'rest'; phaseAt = time; dots = []; }
      for (const f of [player, npc]) if (alive(f)) scuff(f, time);
    },

    npcSeek() {
      if (!alive(npc) || (phase !== 'draw' && phase !== 'hold')) return null;
      const t = tk.now;
      const mine = bandOf(npc.y), yours = bandOf(player.y);
      // In a band that will be struck: walk to the nearest safe one.
      if (odd(mine, t)) {
        let best = -1;
        for (let b = 0; b < 4; b++) if (!odd(b, t) && (best < 0 || Math.abs(b - mine) < Math.abs(best - mine))) best = b;
        if (best >= 0) return { x: npc.x, y: top + bandH * (best + 0.5) };
      }
      // Safe: go and scuff a dot of your row, if there is time to reach it before the sand sets.
      if (!odd(yours, t) && yours !== mine) {
        const left = holdEnd() - SET_MS - t;
        const ds = dots.filter((d) => !d.gone && d.row === yours && drawn(d, t));
        ds.sort((a, b) => dist(npc.x, npc.y, a.x, a.y) - dist(npc.x, npc.y, b.x, b.y));
        if (ds[0] && dist(npc.x, npc.y, ds[0].x, ds[0].y) / 190 * 1000 < left) return { x: ds[0].x, y: ds[0].y };
      }
      return null;
    },

    drawGround(g, time) {
      const holding = phase === 'draw' || phase === 'hold';
      const warmth = phase === 'hold' ? clamp((time - (phaseAt + 4 * ROW_MS)) / HOLD_MS, 0, 1) : 0.3;
      for (let b = 0; b < 4; b++) {
        const y0 = top + b * bandH;
        if (holding && odd(b, time)) drawDoomed(g, W, y0, bandH, warmth, time, b);
        drawStakes(g, W, y0, bandH, b, holding ? odd(b, time) : null);
      }
      for (const t of trays) drawTray(g, t.x, t.y);
      for (const d of dots) {
        if (!drawn(d, time)) continue;
        drawDot(g, d, time, set(time));
      }
      if (phase === 'draw') {
        const row = Math.min(3, Math.floor((time - phaseAt) / ROW_MS));
        const k = ((time - phaseAt) % ROW_MS) / ROW_MS;
        for (const t of trays) drawStylus(g, t.x - 40 + k * 80, rowY(t, row));
      }
    },

    drawAir(g, time) {
      if (phase !== 'strike') return;
      const k = (time - phaseAt) / STRIKE_MS;
      for (let b = 0; b < 4; b++) if (struck[b]) drawSpears(g, W, top + b * bandH, bandH, k, b);
    },

    drawHud(g, time) {
      const n = trays.length;
      const x0 = W / 2 - (n * 46) / 2 - 20, y = top + 8;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 8, y - 6, n * 46 + 54, 44, 6);
      for (let ti = 0; ti < n; ti++) {
        for (let r = 0; r < 4; r++) {
          const cy = y + r * 9, cx = x0 + ti * 46 + 18;
          const ds = dots.filter((d) => d.tray === ti && d.row === r && !d.gone && drawn(d, time));
          if (ds.length === 1) { g.fillStyle(SAND_PALE, 1); g.fillCircle(cx, cy, 2.6); }
          else if (ds.length === 2) { g.fillStyle(SAND_PALE, 1); g.fillCircle(cx - 7, cy, 2.6); g.fillCircle(cx + 7, cy, 2.6); }
        }
      }
      // The verdict per band, in its pennant colour.
      for (let r = 0; r < 4; r++) {
        const cx = x0 + n * 46 + 26, cy = y + r * 9;
        g.fillStyle(BAND_COLORS[r], 1); g.fillRect(cx - 12, cy - 3, 6, 6);
        if (phase === 'draw' || phase === 'hold') { g.fillStyle(odd(r, time) ? 0xff7050 : 0x9ae8a0, 1); g.fillCircle(cx + 4, cy, 3); }
      }
    },
  };
}

/** A band about to be read: the sand trembles in drifting grains, its edges pricked out in ochre. */
function drawDoomed(g: G, W: number, y0: number, h: number, k: number, time: number, b: number): void {
  g.fillStyle(SAND_DEEP, 0.06 + k * 0.12); g.fillRect(0, y0, W, h);
  g.lineStyle(2, BAND_COLORS[b], 0.3 + k * 0.5);
  g.lineBetween(0, y0 + 2, W, y0 + 2); g.lineBetween(0, y0 + h - 2, W, y0 + h - 2);
  for (let i = 0; i < 26; i++) {
    const x = ((i * 97 + time / (9 - k * 5)) % W);
    const y = y0 + 10 + ((i * 53) % (h - 20));
    g.fillStyle(SAND_LIT, 0.4 + k * 0.4); g.fillCircle(x, y + Math.sin(time / 60 + i) * 2 * k, 1.8);
  }
}

/** The stakes at each wall: a palm-rib stake per band, its row's pennant, a pebble cairn of one or two. */
function drawStakes(g: G, W: number, y0: number, h: number, b: number, odd: boolean | null): void {
  for (const x of [22, W - 22]) {
    const y = y0 + h / 2 + 10;
    shadow(g, x, y + 2, 20, 6, 0.3);
    g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x, y, x, y - 38);
    const dx = x < W / 2 ? 1 : -1;
    g.fillStyle(BAND_COLORS[b], 1); g.fillTriangle(x, y - 38, x, y - 26, x + dx * 18, y - 33);
    if (odd !== null) {
      const n = odd ? 1 : 2;
      for (let i = 0; i < n; i++) { g.fillStyle(SAND_DARK, 1); g.fillCircle(x + dx * (10 + i * 10), y - 2, 5); g.fillStyle(SAND_PALE, 1); g.fillCircle(x + dx * (10 + i * 10) - 1, y - 3, 2.5); }
    }
  }
}

/** The reading tray: a frame of palm-ribs round raked fine sand, its four rows notched in their colours. */
function drawTray(g: G, x: number, y: number): void {
  const w = 120, h = ROW_GAP * 4 + 14;
  shadow(g, x, y + h / 2 + 4, w + 20, 16, 0.3);
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12, 6);
  g.fillStyle(SAND_PALE, 1); g.fillRect(x - w / 2, y - h / 2, w, h);
  for (let i = 0; i < 18; i++) { g.lineStyle(1, SAND, 0.6); g.lineBetween(x - w / 2 + 3, y - h / 2 + 5 + i * 12, x + w / 2 - 3, y - h / 2 + 5 + i * 12); }
  for (let i = -3; i <= 3; i++) { g.lineStyle(1.5, TIMBER, 1); g.lineBetween(x + i * 18, y - h / 2 - 6, x + i * 18 + 4, y - h / 2); g.lineBetween(x + i * 18, y + h / 2 + 6, x + i * 18 + 4, y + h / 2); }
  for (let r = 0; r < 4; r++) {
    const ry = y - ROW_GAP * 1.5 + r * ROW_GAP;
    g.fillStyle(BAND_COLORS[r], 1); g.fillRect(x - w / 2 - 6, ry - 5, 6, 10); g.fillRect(x + w / 2, ry - 5, 6, 10);
  }
}

/** A dot pressed with a fingertip: a pit with a lit lower rim — or a scuff, a smear dragged out of it. */
function drawDot(g: G, d: Dot, time: number, setting: boolean): void {
  if (d.gone) {
    const k = clamp((time - d.gone) / 300, 0, 1);
    g.fillStyle(SAND_DARK, 0.45); g.fillEllipse(d.x + 4 * k, d.y, 14 + 16 * k, 7);
    g.lineStyle(1, SAND_DEEP, 0.5); g.lineBetween(d.x - 8, d.y - 2, d.x + 12 * k + 6, d.y + 1);
    return;
  }
  g.fillStyle(SAND_LIT, 1); g.fillCircle(d.x, d.y + 1.5, 8);
  g.fillStyle(SAND_DEEP, 1); g.fillCircle(d.x, d.y, 7);
  g.fillStyle(0x3a2412, 1); g.fillCircle(d.x - 1, d.y - 1, 4.5);
  if (setting) { g.lineStyle(1.5, STRIPE_SAFFRON, 0.9); g.strokeCircle(d.x, d.y, 10); glow(g, d.x, d.y, 14, STRIPE_SAFFRON, 0.05, 2); }
}

/** Leyla's reed stylus, drawn across the row it is pressing. */
function drawStylus(g: G, x: number, y: number): void {
  g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(x, y, x + 18, y - 34);
  g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(x + 6, y - 11, x + 9, y - 16); g.lineBetween(x + 12, y - 22, x + 15, y - 27);
  g.fillStyle(SAND_DEEP, 0.6); g.fillCircle(x, y, 3);
}

/** A band read and struck: spears of sand burst up the whole length of it, then sift down. */
function drawSpears(g: G, W: number, y0: number, h: number, k: number, b: number): void {
  const up = Math.sin(Math.min(1, k * 2) * Math.PI * 0.5) * (1 - Math.max(0, k - 0.5) * 2);
  g.fillStyle(BAND_COLORS[b], 0.12 * (1 - k)); g.fillRect(0, y0, W, h);
  for (let i = 0; i < 22; i++) {
    const x = 20 + i * ((W - 40) / 21);
    for (let row = 0; row < 3; row++) {
      const y = y0 + h * (0.25 + row * 0.27) + ((i % 2) * 8);
      const s = (26 + ((i * 7 + row * 5) % 16)) * up;
      g.fillStyle(SAND_DARK, 0.95); g.fillTriangle(x - 7, y, x + 7, y, x + 1, y - s);
      g.fillStyle(SAND_LIT, 0.95); g.fillTriangle(x - 3, y, x + 4, y, x + 1, y - s * 0.9);
    }
  }
}

export const FALLEN_RAML: GimmickDef = {
  id: ID,
  rules: 'Leyla draws a figure: each row of one dot strikes its band, two spare it. Tread on a dot to scuff it and flip its row. At half, two figures add.',
  make,
};
