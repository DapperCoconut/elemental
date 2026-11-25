import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  GILT, GILT_DARK, GILT_LIT, INK, PAPER, PAPER_DARK, PAVE_RED, RECALL, RECALL_LIT, SEPIA_DARK, SEPIA_DEEP, TIMBER,
  TIMBER_DARK, TIMBER_LIT,
} from '../palette';
import { alive, clamp, dist, fighterColor } from '../util';

/**
 * Word Perfect — Catechist Philomena Dunnock, in the King's telling the schoolmistress who taught
 * the court's children to recite the Prince's catechism and their own Lot numbers by heart, and
 * rapped the knuckles of any child who stumbled.
 *
 * The yard is a catalogue floor: fifteen index cards set in oak trays. Dunnock READS a verse —
 * four cards light one after another, a path from card to neighbouring card — then shuts the
 * book. A held breath later she RECITES it from memory: each card of the verse, in order, gives
 * a faint flicker and then its drawer-front slams down on whoever is standing on it. Nothing is
 * marked any more: you have to remember.
 *
 * The exploit is the recitation itself. Tread the verse yourself, card by card in its order (a
 * pin goes into each card you get right; a verse card out of turn pulls your pins), and the
 * recital is YOURS: the rest of it stops slamming cards and her ferule comes down instead on
 * wherever your foe is standing, line by line. She is reciting too. Past half she reads five
 * cards and recites them BACKWARDS — hindsight — and the verse must be trodden backwards.
 */

const ID = fallenId('remembrance', 'word-perfect');
const COLS = 5;
const ROWS = 3;
const TW = 104;
const TH = 88;
const SX = 132;
const SY = 118;
const READ_MS = 640;
const HOLD_MS = 2700;
const BEAT_MS = 700;
const FLICK_MS = 430;
const RAP_MS = 580;
const REST_MS = 2600;
const RAP_R = 44;

interface Tile { x: number; y: number; i: number; seed: number }
interface Rap { x: number; y: number; at: number; victim: Fighter; done: boolean }
type Phase = 'rest' | 'read' | 'hold' | 'recite';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const cx = W / 2;
  const cy = (top + H) / 2 + 20;
  const tiles: Tile[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) tiles.push({ x: cx + (c - 2) * SX, y: cy + (r - 1) * SY, i: r * COLS + c, seed: rng() * 1000 });
  }
  const lectern = { x: cx, y: top + 58 };

  let phase: Phase = 'rest';
  let phaseAt = 0;
  let started = false;
  let verse: number[] = [];
  let order: number[] = [];
  let flicked = 0;
  let slammed = 0;
  let redirected: boolean[] = [];
  let owner: Fighter | null = null;
  let backwards = false;
  let lastChime = -1;
  let thinkUntil = 0;
  let now = 0;
  const progress = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const lastTile = new Map<Fighter, number>([[player, -1], [npc, -1]]);
  const raps: Rap[] = [];
  const dust: { x: number; y: number; at: number }[] = [];

  const neighbours = (i: number): number[] => {
    const r = Math.floor(i / COLS), c = i % COLS;
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if ((dr || dc) && r + dr >= 0 && r + dr < ROWS && c + dc >= 0 && c + dc < COLS) out.push((r + dr) * COLS + c + dc);
    }
    return out;
  };
  /** A verse: a walk from card to neighbouring card, no card twice. */
  const makeVerse = (n: number): number[] => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const v = [Math.floor(rng() * tiles.length)];
      while (v.length < n) {
        const opts = neighbours(v[v.length - 1]).filter((j) => !v.includes(j));
        if (!opts.length) break;
        v.push(opts[Math.floor(rng() * opts.length)]);
      }
      if (v.length === n) return v;
    }
    return [5, 6, 7, 8, 9].slice(0, n);
  };
  const tileUnder = (f: Fighter): number => {
    for (const t of tiles) if (Math.abs(f.x - t.x) < TW / 2 && Math.abs(f.y - t.y) < TH / 2) return t.i;
    return -1;
  };
  /** A fighter stepping onto a card while the verse is unclaimed: right card, a pin; wrong verse card, pins out. */
  const tread = (f: Fighter): void => {
    if (!alive(f)) return;
    const t = tileUnder(f);
    if (t === lastTile.get(f)) return;
    lastTile.set(f, t);
    if (t < 0) return;
    const p = progress.get(f) ?? 0;
    if (t === order[p]) {
      progress.set(f, p + 1);
      ctx.sfx('clock-tick');
      if (p + 1 >= order.length) {
        owner = f;
        ctx.sfx('holy-chord');
        ctx.flash(f.x, f.y, GILT_LIT);
      }
    } else if (order.includes(t) && p > 0) {
      progress.set(f, t === order[0] ? 1 : 0);
      ctx.sfx('snap-back');
    }
  };
  const slam = (k: number): void => {
    const t = tiles[order[k]];
    dust.push({ x: t.x, y: t.y, at: now });
    ctx.sfx('stone-slam');
    for (const f of [player, npc]) {
      if (!alive(f) || tileUnder(f) !== t.i) continue;
      if (f === player) tk.hitPlayer(17, f.x, f.y);
      else ctx.hit(npc, 30, f.x, f.y);
    }
  };

  return {
    update(time) {
      now = time;
      if (!started) { started = true; phaseAt = time; }
      if (!backwards && npc.hp < npc.maxHp * 0.5) {
        backwards = true;
        ctx.banner('NOW SAY IT BACKWARDS', '#f2d68a');
        ctx.sfx('time-warp');
      }
      const el = time - phaseAt;
      if (phase === 'rest' && el >= REST_MS) {
        verse = makeVerse(backwards ? 5 : 4);
        order = backwards ? [...verse].reverse() : verse;
        owner = null;
        progress.set(player, 0); progress.set(npc, 0);
        phase = 'read'; phaseAt = time; lastChime = -1;
      } else if (phase === 'read') {
        const k = Math.floor(el / READ_MS);
        if (k !== lastChime && k < verse.length) { lastChime = k; ctx.sfx('crystal-chime'); }
        if (el >= verse.length * READ_MS + 200) {
          phase = 'hold'; phaseAt = time;
          lastTile.set(player, -1); lastTile.set(npc, -1);
          thinkUntil = time + 900;
          ctx.sfx('hush');
        }
      } else if (phase === 'hold' && el >= HOLD_MS) {
        phase = 'recite'; phaseAt = time; flicked = 0; slammed = 0; redirected = [];
      } else if (phase === 'recite') {
        while (flicked < order.length && el >= flicked * BEAT_MS) {
          redirected[flicked] = !!owner;
          if (owner) {
            const victim = owner === player ? npc : player;
            if (alive(victim)) raps.push({ x: victim.x, y: victim.y, at: time + RAP_MS, victim, done: false });
          }
          flicked++;
        }
        while (slammed < flicked && el >= slammed * BEAT_MS + FLICK_MS) {
          if (!redirected[slammed]) slam(slammed);
          slammed++;
        }
        if (slammed >= order.length && el >= order.length * BEAT_MS + 900) { phase = 'rest'; phaseAt = time; }
      }
      if ((phase === 'hold' || phase === 'recite') && !owner) { tread(player); tread(npc); }
      for (let i = raps.length - 1; i >= 0; i--) {
        const r = raps[i];
        if (!r.done && time >= r.at) {
          r.done = true;
          ctx.sfx('whip');
          const f = r.victim;
          if (alive(f) && dist(f.x, f.y, r.x, r.y) < RAP_R + 4) {
            if (f === player) tk.hitPlayer(15, f.x, f.y);
            else { ctx.hit(npc, 26, f.x, f.y); ctx.stun(npc, 260); }
          }
        }
        if (time > r.at + 380) raps.splice(i, 1);
      }
      while (dust.length && time - dust[0].at > 420) dust.shift();
    },

    npcSeek() {
      if (!alive(npc)) return null;
      const mine = raps.find((r) => !r.done && r.victim === npc);
      if (mine) {
        const d = dist(npc.x, npc.y, mine.x, mine.y) || 1;
        const ax = d < 2 ? 1 : (npc.x - mine.x) / d, ay = d < 2 ? 0 : (npc.y - mine.y) / d;
        return { x: tk.clampX(npc.x + ax * 120), y: tk.clampY(npc.y + ay * 120) };
      }
      if ((phase === 'hold' || phase === 'recite') && !owner && now >= thinkUntil) {
        const t = tiles[order[progress.get(npc) ?? 0]];
        if (t) return { x: t.x, y: t.y };
      }
      if (phase === 'recite' && !owner && slammed < order.length) {
        // Unclaimed: off the card that slams next.
        const t = tiles[order[slammed]];
        if (tileUnder(npc) === t.i) return { x: t.x, y: tk.clampY(t.y + (npc.y < t.y ? -110 : 110)) };
      }
      return null;
    },

    drawGround(g, time) {
      const el = time - phaseAt;
      const lit = phase === 'read' ? Math.floor(el / READ_MS) : -1;
      for (const t of tiles) {
        let gold = 0, ghost = 0, num = 0;
        const vi = verse.indexOf(t.i);
        if (phase === 'read' && vi >= 0 && vi <= lit) {
          gold = vi === lit ? 1 : 0.25;
          num = vi + 1;
        }
        if (phase === 'recite') {
          const k = order.indexOf(t.i);
          if (k >= 0 && !redirected[k]) {
            const fl = el - k * BEAT_MS;
            if (fl >= 0 && fl < FLICK_MS) { ghost = 0.35 + 0.35 * Math.sin(time / 40); num = backwards ? verse.length - k : k + 1; }
          }
        }
        drawCard(g, t, gold, ghost, num, time);
      }
      // Pins: each fighter's correct treads so far, in their own colour.
      if (phase === 'hold' || phase === 'recite') {
        for (const [f, side] of [[player, -1], [npc, 1]] as [Fighter, number][]) {
          const p = progress.get(f) ?? 0;
          const col = fighterColor(f, f === player ? 0x8ac8f6 : 0xf08aa8);
          for (let k = 0; k < p && k < order.length; k++) {
            const t = tiles[order[k]];
            const px = t.x + side * (TW / 2 - 12), py = t.y - TH / 2 + 12;
            g.fillStyle(0x000000, 0.3); g.fillCircle(px + 1.5, py + 2, 5);
            g.fillStyle(col, 1); g.fillCircle(px, py, 5);
            g.fillStyle(0xffffff, 0.6); g.fillCircle(px - 1.5, py - 1.5, 1.6);
          }
        }
      }
      for (const r of raps) {
        const k = clamp(1 - (r.at - time) / RAP_MS, 0, 1);
        g.lineStyle(2, PAVE_RED, 0.5 + k * 0.4); g.strokeCircle(r.x, r.y, RAP_R);
        g.fillStyle(PAVE_RED, 0.08 + k * 0.18); g.fillCircle(r.x, r.y, RAP_R * k);
        // The ruler's shadow lengthening across the ring.
        g.fillStyle(0x000000, 0.18 * k); g.fillEllipse(r.x + 10, r.y, 96 * k, 14 * k);
      }
    },

    drawAir(g, time) {
      drawLectern(g, lectern.x, lectern.y, phase, verse.length, phase === 'read' ? Math.floor((time - phaseAt) / READ_MS) : -1, backwards, time);
      if (phase === 'recite') {
        const el = time - phaseAt;
        for (let k = 0; k < order.length; k++) {
          if (redirected[k]) continue;
          const d = el - k * BEAT_MS;
          if (d > FLICK_MS - 200 && d < FLICK_MS) {
            const t = tiles[order[k]];
            drawDrawerFront(g, t.x, t.y, clamp((d - (FLICK_MS - 200)) / 200, 0, 1));
          }
        }
      }
      for (const d of dust) {
        const k = clamp((time - d.at) / 420, 0, 1);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.fillStyle(PAPER_DARK, 0.5 * (1 - k)); g.fillCircle(d.x + Math.cos(a) * (40 + k * 30), d.y + Math.sin(a) * (30 + k * 22), 6 - k * 4);
        }
      }
      for (const r of raps) drawFerule(g, r.x, r.y, clamp(1 - (r.at - time) / RAP_MS, 0, 1), r.done);
    },

    drawHud(g, time) {
      const n = order.length || (backwards ? 5 : 4);
      const x0 = W / 2 - n * 11, y = top + 16;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 16, y - 13, n * 22 + 32, 40, 6);
      const el = time - phaseAt;
      const read = phase === 'read' ? Math.floor(el / READ_MS) + 1 : phase === 'rest' ? 0 : n;
      for (let k = 0; k < n; k++) {
        const x = x0 + k * 22 + 11;
        const done = phase === 'recite' && k < slammed;
        g.fillStyle(k < read ? (phase === 'read' ? GILT_LIT : SEPIA_DARK) : 0x2a241e, 1); g.fillRect(x - 7, y - 8, 14, 16);
        g.lineStyle(1, GILT_DARK, 1); g.strokeRect(x - 7, y - 8, 14, 16);
        if (done) { g.lineStyle(2, PAVE_RED, 1); g.lineBetween(x - 6, y, x + 6, y); }
        if (backwards) { g.fillStyle(RECALL, 0.8); g.fillTriangle(x0 - 10, y, x0 - 4, y - 4, x0 - 4, y + 4); }
      }
      // Each fighter's treads under the verse; a gilt bar under whoever owns the recital.
      for (const [f, row] of [[player, 0], [npc, 1]] as [Fighter, number][]) {
        const p = progress.get(f) ?? 0;
        const col = fighterColor(f, f === player ? 0x8ac8f6 : 0xf08aa8);
        for (let k = 0; k < n; k++) {
          g.fillStyle(k < p ? col : 0x3a322a, 1); g.fillCircle(x0 + k * 22 + 11, y + 14 + row * 7, 2.6);
        }
        if (owner === f) { g.fillStyle(GILT_LIT, 0.9); g.fillRect(x0 + 2, y + 12 + row * 7, n * 22 - 4, 1.5); }
      }
    },
  };
}

/** One index card in its oak tray: brass corners, a red head-rule, faint ruled lines, inked entries, the rod hole. */
function drawCard(g: G, t: Tile, gold: number, ghost: number, num: number, time: number): void {
  const x = t.x, y = t.y;
  shadow(g, x, y + TH / 2 + 2, TW + 10, 14, 0.25);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - TW / 2 - 5, y - TH / 2 - 5, TW + 10, TH + 10);
  g.fillStyle(TIMBER, 1); g.fillRect(x - TW / 2 - 3, y - TH / 2 - 3, TW + 6, TH + 6);
  g.fillStyle(TIMBER_LIT, 0.5); g.fillRect(x - TW / 2 - 3, y - TH / 2 - 3, TW + 6, 2);
  g.fillStyle(PAPER, 1); g.fillRect(x - TW / 2 + 2, y - TH / 2 + 2, TW - 4, TH - 4);
  g.fillStyle(PAPER_DARK, 0.35); g.fillRect(x - TW / 2 + 2, y + TH / 2 - 14, TW - 4, 12);
  g.lineStyle(1.5, PAVE_RED, 0.8); g.lineBetween(x - TW / 2 + 4, y - TH / 2 + 16, x + TW / 2 - 4, y - TH / 2 + 16);
  for (let l = 0; l < 4; l++) { g.lineStyle(1, 0x8aa0b0, 0.35); g.lineBetween(x - TW / 2 + 4, y - TH / 2 + 28 + l * 12, x + TW / 2 - 4, y - TH / 2 + 28 + l * 12); }
  // The entries: a heading and three lines in a cramped hand, different on every card.
  let s = t.seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  g.lineStyle(1.4, INK, 0.7);
  let hx = x - TW / 2 + 8;
  for (let w = 0; w < 3; w++) { const ww = 10 + rnd() * 16; g.lineBetween(hx, y - TH / 2 + 11, hx + ww, y - TH / 2 + 11); hx += ww + 5; }
  for (let l = 0; l < 3; l++) {
    let lx = x - TW / 2 + 8;
    const end = x + TW / 2 - 10 - rnd() * 30;
    while (lx < end) { const ww = 5 + rnd() * 12; g.lineStyle(1, INK, 0.45); g.lineBetween(lx, y - TH / 2 + 26 + l * 12, Math.min(end, lx + ww), y - TH / 2 + 25 + l * 12 + rnd()); lx += ww + 4; }
  }
  // The rod hole, punched at the foot.
  g.fillStyle(TIMBER_DARK, 1); g.fillCircle(x, y + TH / 2 - 8, 4);
  g.fillStyle(0x000000, 0.4); g.fillCircle(x, y + TH / 2 - 7, 2.5);
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const bx = x + sx * (TW / 2 + 1), by = y + sy * (TH / 2 + 1);
    g.fillStyle(GILT_DARK, 1); g.fillTriangle(bx, by, bx - sx * 12, by, bx, by - sy * 12);
    g.fillStyle(GILT, 1); g.fillTriangle(bx - sx * 1.5, by - sy * 1.5, bx - sx * 9, by - sy * 1.5, bx - sx * 1.5, by - sy * 9);
  }
  if (gold > 0) {
    g.fillStyle(GILT_LIT, 0.35 * gold); g.fillRect(x - TW / 2 + 2, y - TH / 2 + 2, TW - 4, TH - 4);
    glow(g, x, y, 70, GILT_LIT, 0.05 * gold, 3);
  }
  if (ghost > 0) { g.fillStyle(RECALL, ghost * 0.5); g.fillRect(x - TW / 2 + 2, y - TH / 2 + 2, TW - 4, TH - 4); }
  if (num > 0) numeral(g, x, y + 4, num, 30, gold > 0 ? SEPIA_DEEP : RECALL_LIT, gold > 0 ? Math.max(gold, 0.5) : ghost + 0.3 + Math.sin(time / 60) * 0.1);
}

/** A Roman numeral I–V, drawn in brush strokes with serifs, centred on `x,y`. */
function numeral(g: G, x: number, y: number, n: number, h: number, color: number, a: number): void {
  const glyphs = n === 4 ? ['I', 'V'] : n === 5 ? ['V'] : Array.from({ length: n }, () => 'I');
  const gw = h * 0.42;
  let gx = x - ((glyphs.length - 1) * gw) / 2;
  g.lineStyle(4, color, a);
  for (const c of glyphs) {
    if (c === 'I') {
      g.lineBetween(gx, y - h / 2, gx, y + h / 2);
      g.lineBetween(gx - 5, y - h / 2, gx + 5, y - h / 2); g.lineBetween(gx - 5, y + h / 2, gx + 5, y + h / 2);
    } else {
      g.lineBetween(gx - h * 0.28, y - h / 2, gx, y + h / 2); g.lineBetween(gx, y + h / 2, gx + h * 0.28, y - h / 2);
      g.lineBetween(gx - h * 0.28 - 5, y - h / 2, gx - h * 0.28 + 4, y - h / 2); g.lineBetween(gx + h * 0.28 - 4, y - h / 2, gx + h * 0.28 + 5, y - h / 2);
    }
    gx += gw;
  }
}

/** A catalogue drawer-front coming down on its card: oak, a brass pull and label-holder. */
function drawDrawerFront(g: G, x: number, y: number, k: number): void {
  const drop = (1 - k) * 90;
  const w = TW + 4, h = TH * 0.62;
  g.fillStyle(0x000000, 0.12 + k * 0.25); g.fillEllipse(x, y + 6, w * (0.6 + k * 0.4), h * (0.6 + k * 0.4));
  const by = y - drop - h / 2;
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x - w / 2, by - h / 2, w, h, 4);
  g.fillStyle(TIMBER, 1); g.fillRoundedRect(x - w / 2 + 3, by - h / 2 + 3, w - 6, h - 6, 3);
  g.lineStyle(1, TIMBER_LIT, 0.6); for (let i = 0; i < 4; i++) g.lineBetween(x - w / 2 + 6, by - h / 2 + 8 + i * 8, x + w / 2 - 6, by - h / 2 + 10 + i * 8);
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 18, by - 12, 36, 12);
  g.fillStyle(PAPER, 1); g.fillRect(x - 15, by - 10, 30, 8);
  g.lineStyle(3, GILT, 1); g.beginPath(); g.arc(x, by + 6, 10, 0, Math.PI, false); g.strokePath();
  g.fillStyle(GILT_LIT, 1); g.fillCircle(x - 10, by + 6, 2.5); g.fillCircle(x + 10, by + 6, 2.5);
}

/** Dunnock's ferule: a long boxwood ruler with inch ticks, swinging down onto the ring. */
function drawFerule(g: G, x: number, y: number, k: number, done: boolean): void {
  const ang = done ? 0.05 : -1.2 + k * 1.25;
  const len = 110, wd = 10;
  const px = x - 50, py = y - 14;
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  const pts = [
    { x: px, y: py }, { x: px + ux * len, y: py + uy * len },
    { x: px + ux * len + nx * wd, y: py + uy * len + ny * wd }, { x: px + nx * wd, y: py + ny * wd },
  ];
  g.fillStyle(0x000000, 0.25); g.fillPoints(pts.map((p) => ({ x: p.x + 3, y: p.y + 4 })), true);
  g.fillStyle(0xd8b87a, 1); g.fillPoints(pts, true);
  g.lineStyle(1, TIMBER_DARK, 1); g.strokePoints(pts, true);
  for (let i = 1; i < 11; i++) {
    const tx = px + ux * i * 10, ty = py + uy * i * 10;
    g.lineStyle(1, INK, 0.8); g.lineBetween(tx, ty, tx + nx * (i % 2 ? 3 : 5), ty + ny * (i % 2 ? 3 : 5));
  }
  g.fillStyle(GILT, 1); g.fillCircle(px + ux * 4 + nx * 5, py + uy * 4 + ny * 5, 2);
}

/** Dunnock's lectern: a sloped oak desk, the catechism open on it, a line inked for each card read. */
function drawLectern(g: G, x: number, y: number, phase: Phase, n: number, lit: number, backwards: boolean, time: number): void {
  shadow(g, x, y + 30, 70, 14, 0.3);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 6, y - 4, 12, 34);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 24, y + 26, 48, 6);
  g.fillStyle(TIMBER, 1); g.fillPoints([{ x: x - 44, y: y - 2 }, { x: x + 44, y: y - 2 }, { x: x + 38, y: y - 22 }, { x: x - 38, y: y - 22 }], true);
  const open = phase === 'read' ? 1 : 0;
  if (open) {
    g.fillStyle(PAPER, 1); g.fillRect(x - 36, y - 30, 34, 26); g.fillRect(x + 2, y - 30, 34, 26);
    g.lineStyle(1, SEPIA_DARK, 0.6); g.lineBetween(x, y - 30, x, y - 4);
    for (let i = 0; i < n; i++) {
      const lx = i < 3 ? x - 32 : x + 6, ly = y - 24 + (i % 3) * 7;
      g.lineStyle(1.4, i <= lit ? INK : PAPER_DARK, i === lit ? 1 : 0.7); g.lineBetween(lx, ly, lx + 24, ly);
    }
    glow(g, x, y - 18, 40, GILT_LIT, 0.04 + Math.sin(time / 120) * 0.01, 2);
  } else {
    // Shut: a calf binding with a gilt clasp.
    g.fillStyle(PAVE_RED, 1); g.fillRect(x - 26, y - 28, 52, 22);
    g.fillStyle(0x5a2a22, 1); g.fillRect(x - 26, y - 10, 52, 4);
    g.fillStyle(GILT, 1); g.fillRect(x + 20, y - 21, 8, 8);
    g.lineStyle(1, GILT_LIT, 0.8); g.strokeRect(x - 22, y - 25, 44, 16);
    if (backwards) { g.lineStyle(2, RECALL_LIT, 0.9); g.lineBetween(x + 8, y - 17, x - 8, y - 17); g.lineBetween(x - 8, y - 17, x - 3, y - 21); g.lineBetween(x - 8, y - 17, x - 3, y - 13); }
  }
}

export const FALLEN_WORD_PERFECT: GimmickDef = {
  id: ID,
  rules: 'She reads a verse of cards, then recites it from memory: each card slams in turn. Tread the verse in order first and her ferule raps your foe.',
  make,
};
