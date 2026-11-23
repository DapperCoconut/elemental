import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry, type G } from '../../../../art/IsleArt';
import { crane, fleuron, inkBlot, nib, quill, sheet, strikeLine, textLines } from './art';
import {
  FOLIO, FOLIO_DARK, FOLIO_LIT, GILT, GILT_DARK, GILT_LIT, INK, INK_BLUE, INK_SHEEN, INK_SOFT, LEATHER, LEATHER_DARK,
  OAK_DARK, PAPER, PAPER_DARK, PAPER_FOX, PAPER_LIT, PAPER_OLD, RED, RED_DARK, RED_LIT,
} from './palette';
import { chord, clamp, dist, segDist } from './util';

/**
 * Prince Folio, the Librettist — first chair of the Libretto Court, who writes the words of the
 * Maestro's Score.
 *
 * Folio was the paper mill's rag-boy, and one winter he wrote a song on a scrap from the vat and
 * sang it at the Vesper bell. The Maestro heard it, and made him first chair on the one condition
 * that he never write a word of his own again. He has written every word the isle has sung since
 * — and struck out every word anybody else wrote. He fights like a manuscript coming together:
 *
 * • **Quill** (hovering): he writes lines of verse across the floor, letter by letter, and when
 *   the full stop lands every letter rises as a paper blade; he flicks his quill and great drops
 *   of ink splash into spreading blots; he folds and throws a flight of paper darts that crease
 *   in the air and turn on you.
 * • **Pop-Up Book** (anchored at the spine, the ink-blue tint): the arena is his open book. He
 *   turns the page — it lifts off one half and slaps down on the other, but for a die-cut
 *   window — and pop-up scenery springs from the new page as flats that stop shots, his and
 *   yours; his red silk bookmark lashes out from the spine in a long arc.
 * • **Final Draft** (hard, blinking, pale): the red pen. He strikes out whole stripes of the page
 *   and a beat later they are erased; he stamps proofreader's marks round you, each with its
 *   own correction.
 */

const TOP = 96;

/** Phase index, shared by the moves that change in the Pop-Up Book (set by drawDecor). */
let folioPhase = 0;

/** Pop-up flats standing on the page: cover from shots both ways (darts stop on them too). */
interface Flat { x: number; y: number; w: number; kind: number; riseAt: number; downAt: number; hit: boolean }
let flats: Flat[] = [];

const pAlive = (tk: BossToolkit) => tk.player.active && tk.player.hp > 0;
const flatBlocks = (x: number, y: number, time: number) =>
  flats.some((f) => time >= f.riseAt && time < f.downAt && Math.abs(x - f.x) < f.w / 2 && y > f.y - 26 && y < f.y + 8);

/** A hand-written letter: a few strokes of a seeded shape, the way a fast copy-hand writes. */
function glyph(g: G, x: number, y: number, s: number, seed: number, color: number, a = 1): void {
  const k = Math.floor(seed * 7) % 6;
  g.lineStyle(2 * s, color, a);
  switch (k) {
    case 0: g.lineBetween(x - 3 * s, y + 5 * s, x - 3 * s, y - 6 * s); g.beginPath(); g.arc(x, y + 1 * s, 3.5 * s, Math.PI, Math.PI * 2.8, false); g.strokePath(); break;
    case 1: g.lineBetween(x - 4 * s, y + 5 * s, x, y - 5 * s); g.lineBetween(x, y - 5 * s, x + 4 * s, y + 5 * s); g.lineBetween(x - 2 * s, y + 1 * s, x + 2 * s, y + 1 * s); break;
    case 2: g.beginPath(); g.arc(x, y + 1 * s, 4 * s, 0.4, Math.PI * 1.9, false); g.strokePath(); break;
    case 3: g.lineBetween(x - 4 * s, y - 4 * s, x + 4 * s, y + 5 * s); g.lineBetween(x + 4 * s, y - 4 * s, x - 4 * s, y + 5 * s); break;
    case 4: g.beginPath(); g.arc(x - 2 * s, y - 2 * s, 3 * s, Math.PI * 0.5, Math.PI * 2, false); g.strokePath(); g.lineBetween(x + 1 * s, y - 2 * s, x + 1 * s, y + 6 * s); break;
    default: g.lineBetween(x - 4 * s, y + 4 * s, x - 2 * s, y - 4 * s); g.lineBetween(x - 2 * s, y - 4 * s, x + 1 * s, y + 3 * s); g.lineBetween(x + 1 * s, y + 3 * s, x + 4 * s, y - 4 * s); break;
  }
}

// ── Signature: A Line of Verse ───────────────────────────────────────
// Two (three on hard) ruled lines cross the floor, one through you. Letters are written along
// them one by one; when the full stop lands at the end of a line, every letter on it rises as
// a paper blade for a moment. The ruled guide shows where every line will be from the start.

interface Verse { x0: number; y0: number; x1: number; y1: number; a: number; px: number; py: number; startAt: number; writeMs: number; riseAt: number; dealt: boolean; seed: number }

const verse = (tk: BossToolkit): SignatureMove => {
  let lines: Verse[] = [];
  const STEP = 26;
  return {
    durationMs: 2500,
    windupMs: 600,
    gesture: 'point',
    tell: 'A LINE OF VERSE',
    cast(time) {
      const p = tk.player;
      const a = [0, 0.35, -0.35, Math.PI / 2][Math.floor(Math.random() * 4)];
      const n = tk.hard ? 3 : 2;
      const nx = -Math.sin(a), ny = Math.cos(a);
      const offs = n === 3 ? [-150, 0, 150] : Math.random() < 0.5 ? [0, 150] : [-150, 0];
      lines = offs.map((o, i) => {
        const px = p.x + nx * o, py = p.y + ny * o;
        const c = chord(px, py, a, 40, TOP + 30, tk.W - 40, tk.H - 30);
        const writeMs = tk.warn(1250) + i * 220;
        return { x0: c[0], y0: c[1], x1: c[2], y1: c[3], a, px, py, startAt: time, writeMs, riseAt: time + writeMs + 120, dealt: false, seed: Math.random() * 10 };
      }).filter((l) => dist(l.x0, l.y0, l.x1, l.y1) > 120);
      tk.sfx('beam-charge');
    },
    update(time) {
      const p = tk.player;
      for (const l of lines) {
        if (l.dealt || time < l.riseAt) continue;
        l.dealt = true;
        tk.sfx('slash');
        if (pAlive(tk) && segDist(p.x, p.y, l.x0, l.y0, l.x1, l.y1) < 30) tk.hitPlayer(12, p.x, p.y);
      }
      lines = lines.filter((l) => !l.dealt || time < l.riseAt + 500);
    },
    drawGround(g, time) {
      for (const l of lines) {
        const len = dist(l.x0, l.y0, l.x1, l.y1);
        const ux = (l.x1 - l.x0) / len, uy = (l.y1 - l.y0) / len;
        const nx = -uy, ny = ux;
        // The ruled guide (a copy-book feint) and its margin ticks.
        g.lineStyle(1.5, 0x7a9ad0, 0.5); g.lineBetween(l.x0 + nx * 10, l.y0 + ny * 10, l.x1 + nx * 10, l.y1 + ny * 10);
        g.lineStyle(1, 0x7a9ad0, 0.25); g.lineBetween(l.x0 - nx * 12, l.y0 - ny * 12, l.x1 - nx * 12, l.y1 - ny * 12);
        g.lineStyle(2, RED, 0.5); g.lineBetween(l.x0 + nx * 18, l.y0 + ny * 18, l.x0 - nx * 18, l.y0 - ny * 18);
        const k = clamp((time - l.startAt) / l.writeMs, 0, 1);
        const shown = Math.floor((len / STEP) * k);
        if (time < l.riseAt) {
          for (let i = 0; i < shown; i++) glyph(g, l.x0 + ux * (i + 0.5) * STEP, l.y0 + uy * (i + 0.5) * STEP, 1.3, (l.seed + i * 0.37) % 1, INK, 0.9);
          // The writing nib.
          const nx0 = l.x0 + ux * shown * STEP, ny0 = l.y0 + uy * shown * STEP;
          if (k < 1) quill(g, nx0, ny0, 34, l.a - 2.2);
          else { g.fillStyle(INK, 1); g.fillCircle(l.x1 - ux * 8, l.y1 - uy * 8, 5); }
        } else {
          // Blades sinking back into the page.
          const r = clamp((time - l.riseAt) / 500, 0, 1);
          g.lineStyle(26, INK, 0.25 * (1 - r)); g.lineBetween(l.x0, l.y0, l.x1, l.y1);
        }
      }
    },
    drawAir(g, time) {
      for (const l of lines) {
        if (time < l.riseAt) continue;
        const r = clamp((time - l.riseAt) / 500, 0, 1);
        const h = Math.sin(Math.min(1, r * 2.2) * Math.PI * 0.5) * 34 * (1 - r * 0.6);
        const len = dist(l.x0, l.y0, l.x1, l.y1);
        const ux = (l.x1 - l.x0) / len, uy = (l.y1 - l.y0) / len;
        for (let d = STEP * 0.5; d < len; d += STEP) {
          const x = l.x0 + ux * d, y = l.y0 + uy * d;
          g.fillStyle(PAPER_LIT, 1 - r * 0.7); g.fillTriangle(x - 7, y, x + 7, y, x + 1, y - h);
          g.lineStyle(1.5, INK, 1 - r * 0.7); g.lineBetween(x - 7, y, x + 1, y - h);
        }
      }
    },
    onPhaseEnd() { lines = []; },
  };
};

// ── Signature: Blotting ──────────────────────────────────────────────
// He flicks the quill: three (four) great drops of ink arc up, their shadows swelling where
// they will fall. Each splats into a blot that seeps wider for a few seconds — standing in one
// stings and drags — and then a sheet of blotting paper comes down and drinks them all.

interface Drop { x: number; y: number; fromX: number; fromY: number; at: number; landAt: number; landed: boolean; seed: number }

const blot = (tk: BossToolkit): SignatureMove => {
  let drops: Drop[] = [];
  let blotterAt = 0;
  let lastTick = 0;
  const SEEP_MS = 3600;
  const blotR = (d: Drop, time: number) => 40 + clamp((time - d.landAt) / SEEP_MS, 0, 1) * 34;
  return {
    durationMs: 2200,
    windupMs: 550,
    gesture: 'sweep',
    tell: 'BLOT',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 4 : 3;
      drops = [];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const off = i === 0 ? 0 : 100 + Math.random() * 60;
        drops.push({
          x: tk.clampX(p.x + Math.cos(a) * off), y: tk.clampY(p.y + Math.sin(a) * off),
          fromX: tk.bossX, fromY: tk.bossY - 30, at: time, landAt: time + tk.warn(950) + i * 180, landed: false, seed: Math.random() * 10,
        });
      }
      blotterAt = time + tk.warn(950) + n * 180 + SEEP_MS;
      tk.sfx('slime-splat');
    },
    update(time) {
      const p = tk.player;
      for (const d of drops) {
        if (d.landed || time < d.landAt) continue;
        d.landed = true;
        tk.sfx('splash');
        if (pAlive(tk) && dist(p.x, p.y, d.x, d.y) < 44) tk.hitPlayer(12, p.x, p.y);
      }
      if (time < blotterAt && time - lastTick > 500 && pAlive(tk)) {
        if (drops.some((d) => d.landed && dist(p.x, p.y, d.x, d.y) < blotR(d, time))) {
          lastTick = time;
          tk.hitPlayer(3, p.x, p.y);
          tk.slowPlayer(0.65, 450);
        }
      }
      if (drops.length && time > blotterAt + 600) drops = [];
    },
    drawGround(g, time) {
      for (const d of drops) {
        if (!d.landed) {
          // The shadow of the falling drop.
          const k = clamp((time - d.at) / (d.landAt - d.at), 0, 1);
          g.fillStyle(INK, 0.12 + k * 0.25); g.fillEllipse(d.x, d.y, 30 + k * 58, 16 + k * 30);
          g.lineStyle(1.5, INK_SHEEN, 0.4 + k * 0.4); g.strokeEllipse(d.x, d.y, 88, 50);
          continue;
        }
        const fade = time > blotterAt ? clamp(1 - (time - blotterAt) / 300, 0, 1) : 1;
        if (fade <= 0) continue;
        inkBlot(g, d.x, d.y, blotR(d, time) * 0.62, mulberry(Math.floor(d.seed * 1000)), INK_BLUE, 0.9 * fade);
        g.fillStyle(INK_SHEEN, 0.2 * fade); g.fillEllipse(d.x - 10, d.y - 8, 26, 8);
      }
    },
    drawAir(g, time) {
      for (const d of drops) {
        if (d.landed) continue;
        const k = clamp((time - d.at) / (d.landAt - d.at), 0, 1);
        const x = d.fromX + (d.x - d.fromX) * k, y = d.fromY + (d.y - d.fromY) * k - Math.sin(k * Math.PI) * 200;
        g.fillStyle(INK, 1); g.fillCircle(x, y, 9); g.fillTriangle(x - 7, y - 4, x + 7, y - 4, x, y - 18);
        g.fillStyle(INK_SHEEN, 0.7); g.fillCircle(x - 3, y - 3, 3);
      }
      // The blotter: a sheet of pink blotting paper pressing down over the floor.
      if (drops.length && time > blotterAt - 300 && time < blotterAt + 600) {
        const k = clamp((time - blotterAt + 300) / 300, 0, 1);
        const out = clamp((time - blotterAt) / 600, 0, 1);
        const xs = drops.map((d) => d.x), ys = drops.map((d) => d.y);
        const x0 = Math.min(...xs) - 90, x1 = Math.max(...xs) + 90, y0 = Math.min(...ys) - 80, y1 = Math.max(...ys) + 80;
        g.fillStyle(0xf0c8c8, (0.25 + k * 0.5) * (1 - out)); g.fillRect(x0, y0 - (1 - k) * 60, x1 - x0, y1 - y0);
        g.lineStyle(2, 0xc89898, (1 - out)); g.strokeRect(x0, y0 - (1 - k) * 60, x1 - x0, y1 - y0);
      }
    },
    onPhaseEnd() { drops = []; },
  };
};

// ── Signature: Paper Darts ───────────────────────────────────────────
// He snaps a sheet off his book and a flight of paper darts leaves his hand in a fan. They fly
// straight, then each creases in the air — a white flash on the fold — and turns once, hard, at
// where you are standing then. Pop-up flats stop them.

interface Dart { x: number; y: number; a: number; speed: number; born: number; turnAt: number; turned: boolean; dead: boolean }

const darts = (tk: BossToolkit): SignatureMove => {
  let flight: Dart[] = [];
  return {
    durationMs: 1700,
    windupMs: 500,
    gesture: 'raise',
    tell: 'PAPER DARTS',
    cast(time) {
      const base = tk.angleToPlayer();
      const n = tk.hard ? 9 : 7;
      flight = [];
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.22;
        flight.push({ x: tk.bossX, y: tk.bossY - 10, a, speed: 250, born: time, turnAt: time + 560 + Math.abs(i - (n - 1) / 2) * 90, turned: false, dead: false });
      }
      tk.sfx('whoosh');
    },
    update(time, dt) {
      const p = tk.player;
      for (const d of flight) {
        if (d.dead) continue;
        if (!d.turned && time >= d.turnAt) {
          d.turned = true;
          d.a = Math.atan2(p.y - d.y, p.x - d.x);
          d.speed = 380;
          tk.sfx('snap-back');
        }
        d.x += Math.cos(d.a) * d.speed * dt;
        d.y += Math.sin(d.a) * d.speed * dt;
        if (flatBlocks(d.x, d.y, time) || d.x < -20 || d.x > tk.W + 20 || d.y < TOP - 20 || d.y > tk.H + 20 || time - d.born > 3200) { d.dead = true; continue; }
        if (pAlive(tk) && dist(p.x, p.y, d.x, d.y) < 25) { d.dead = true; tk.hitPlayer(7, d.x, d.y); }
      }
      flight = flight.filter((d) => !d.dead);
    },
    drawAir(g, time) {
      for (const d of flight) {
        const c = Math.cos(d.a), s = Math.sin(d.a), nx = -s, ny = c;
        const L = 18, Wd = 8;
        g.fillStyle(0x000000, 0.15); g.fillTriangle(d.x + c * L + 2, d.y + s * L + 12, d.x + nx * Wd + 2, d.y + ny * Wd + 12, d.x - nx * Wd + 2, d.y - ny * Wd + 12);
        g.fillStyle(PAPER_DARK, 1); g.fillTriangle(d.x + c * L, d.y + s * L, d.x - nx * Wd, d.y - ny * Wd, d.x - c * 3, d.y - s * 3);
        g.fillStyle(PAPER_LIT, 1); g.fillTriangle(d.x + c * L, d.y + s * L, d.x + nx * Wd, d.y + ny * Wd, d.x - c * 3, d.y - s * 3);
        g.lineStyle(1, INK_SOFT, 0.6); g.lineBetween(d.x + c * L, d.y + s * L, d.x - c * 3, d.y - s * 3);
        if (d.turned && time - d.turnAt < 160) { g.fillStyle(0xffffff, 0.8); g.fillCircle(d.x, d.y, 12); }
        if (!d.turned && d.turnAt - time < 220) { g.lineStyle(1.5, RED_LIT, 0.8); g.strokeCircle(d.x, d.y, 12); }
      }
    },
    onPhaseEnd() { flight = []; },
  };
};

// ── Signature: Turn the Page ─────────────────────────────────────────
// The arena is his open book, the spine down the middle. A page lifts off the half you are not
// on, stands up at the spine and slaps down on yours — all but a die-cut window, a lit band
// across the half where the page has a hole in it. Then pop-up scenery springs out of the new
// page where its fold-tabs show: flats that hit as they spring and then stand as cover.

const pageTurn = (tk: BossToolkit): SignatureMove => {
  let liftAt = 0, standAt = 0, landAt = 0;
  let toLeft = true;
  let winY = 0;
  let dealt = true;
  const WIN = 70;
  return {
    durationMs: 2900,
    windupMs: 650,
    gesture: 'sweep',
    locksBody: true,
    tell: 'TURN THE PAGE',
    cast(time) {
      const p = tk.player;
      toLeft = p.x < tk.W / 2;
      winY = clamp(TOP + 90 + Math.random() * (tk.H - TOP - 180), TOP + 90, tk.H - 90);
      if (Math.abs(winY - p.y) < 90) winY = clamp(p.y + (p.y < (tk.H + TOP) / 2 ? 160 : -160), TOP + 90, tk.H - 90);
      liftAt = time;
      standAt = time + tk.warn(700);
      landAt = standAt + tk.warn(700);
      dealt = false;
      tk.sfx('wings');
    },
    update(time) {
      if (dealt || time < landAt) return;
      dealt = true;
      tk.sfx('stone-slam');
      const p = tk.player;
      const onHalf = toLeft ? p.x < tk.W / 2 + 10 : p.x > tk.W / 2 - 10;
      if (pAlive(tk) && onHalf && Math.abs(p.y - winY) > WIN - 14) tk.hitPlayer(16, p.x, p.y);
      // Pop-ups spring from the new page.
      const n = tk.hard ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const x0 = toLeft ? 70 : tk.W / 2 + 70, x1 = toLeft ? tk.W / 2 - 70 : tk.W - 70;
        let x = x0 + Math.random() * (x1 - x0), y = TOP + 80 + Math.random() * (tk.H - TOP - 140);
        if (dist(x, y, p.x, p.y) < 60) { x = clamp(x + 120, x0, x1); y = clamp(y + 80, TOP + 80, tk.H - 60); }
        flats.push({ x, y, w: 70 + Math.random() * 30, kind: Math.floor(Math.random() * 4), riseAt: time + tk.warn(650), downAt: time + tk.warn(650) + 5200, hit: false });
      }
    },
    drawGround(g, time) {
      if (dealt && time > landAt + 400) return;
      const half = tk.W / 2;
      const hx0 = toLeft ? 0 : half, hx1 = toLeft ? half : tk.W;
      const k = clamp((time - liftAt) / Math.max(1, landAt - liftAt), 0, 1);
      // The landing half darkens under the coming page; the window stays lit.
      g.fillStyle(INK, 0.08 + k * 0.22); g.fillRect(hx0, TOP, hx1 - hx0, winY - WIN - TOP);
      g.fillRect(hx0, winY + WIN, hx1 - hx0, tk.H - winY - WIN);
      g.lineStyle(2.5, GILT_LIT, 0.4 + k * 0.5); g.strokeRect(hx0 + 6, winY - WIN, hx1 - hx0 - 12, WIN * 2);
      if (dealt) {
        const r = clamp((time - landAt) / 400, 0, 1);
        g.fillStyle(PAPER_LIT, 0.5 * (1 - r)); g.fillRect(hx0, TOP, hx1 - hx0, winY - WIN - TOP); g.fillRect(hx0, winY + WIN, hx1 - hx0, tk.H - winY - WIN);
      }
    },
    drawAir(g, time) {
      if (dealt) return;
      // The turning page: its free edge swings from the far side, over the spine, onto yours.
      const half = tk.W / 2;
      const k = clamp((time - liftAt) / Math.max(1, landAt - liftAt), 0, 1);
      const ang = k * Math.PI;
      const span = half - 20;
      const dir = toLeft ? -1 : 1;
      const edgeX = half - dir * Math.cos(ang) * span;
      const lift = Math.sin(ang) * 150;
      const top = TOP + 10, bot = tk.H - 10;
      g.fillStyle(0x000000, 0.18 * Math.sin(ang)); g.fillRect(Math.min(half, edgeX), top, Math.abs(edgeX - half), bot - top);
      const pts = [{ x: half, y: top }, { x: edgeX, y: top - lift * 0.35 }, { x: edgeX, y: bot - lift * 0.35 }, { x: half, y: bot }];
      g.fillStyle(ang < Math.PI / 2 ? PAPER : PAPER_DARK, 0.92); g.fillPoints(pts, true);
      g.lineStyle(2, PAPER_FOX, 0.9); g.strokePoints(pts, true);
      // The die-cut window in it.
      const wy0 = winY - WIN - lift * 0.35, wy1 = winY + WIN - lift * 0.35;
      const wx0 = half + (edgeX - half) * 0.08, wx1 = half + (edgeX - half) * 0.92;
      g.fillStyle(GILT_LIT, 0.25); g.fillPoints([{ x: wx0, y: wy0 }, { x: wx1, y: wy0 }, { x: wx1, y: wy1 }, { x: wx0, y: wy1 }], true);
      g.lineStyle(1.5, GILT, 0.8); g.strokePoints([{ x: wx0, y: wy0 }, { x: wx1, y: wy0 }, { x: wx1, y: wy1 }, { x: wx0, y: wy1 }], true);
      for (let i = 0; i < 6; i++) {
        const yy = top + 30 + i * 70 - lift * 0.35;
        if (Math.abs(yy - winY + lift * 0.35) < WIN + 6) continue;
        g.lineStyle(2, INK_SOFT, 0.25); g.lineBetween(half + (edgeX - half) * 0.12, yy, half + (edgeX - half) * 0.85, yy);
      }
    },
    onPhaseEnd() { dealt = true; },
  };
};

// ── Signature: Pop-Up ────────────────────────────────────────────────
// Fold-tabs are printed on the floor round you; a beat later cardboard scenery springs up out of
// them — a castle tower, a tree, a cottage front, a tall stave — hitting whoever stands on a tab,
// and stands for a while as flats that stop shots, his darts as well as yours.

const popUp = (tk: BossToolkit): SignatureMove => ({
  durationMs: 1900,
  windupMs: 500,
  gesture: 'clap',
  tell: 'POP-UP',
  cast(time) {
    const p = tk.player;
    const n = tk.hard ? 5 : 4;
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2;
      const r = i === 0 ? 0 : 130;
      flats.push({ x: tk.clampX(p.x + Math.cos(a) * r), y: tk.clampY(p.y + Math.sin(a) * r * 0.8), w: 80, kind: (i + 1) % 4, riseAt: time + tk.warn(900), downAt: time + tk.warn(900) + 4800, hit: false });
    }
    tk.sfx('stone-rise');
  },
  update(time) {
    const p = tk.player;
    for (const f of flats) {
      if (f.hit || time < f.riseAt) continue;
      f.hit = true;
      if (pAlive(tk) && Math.abs(p.x - f.x) < f.w / 2 + 10 && Math.abs(p.y - f.y) < 26) tk.hitPlayer(9, p.x, p.y);
    }
    // Flats stop your shots too.
    for (const f of flats) {
      if (time < f.riseAt || time >= f.downAt) continue;
      for (const s of tk.shotsNear(f.x, f.y - 10, f.w / 2 + 6)) if (s.owner === 'player' && flatBlocks(s.x, s.y, time)) s.block();
    }
    flats = flats.filter((f) => time < f.downAt + 400);
  },
  drawGround(g, time) {
    for (const f of flats) {
      if (time >= f.riseAt) continue;
      // The fold-tab: a dashed cut line and two little crease marks.
      const k = clamp(1 - (f.riseAt - time) / 900, 0, 1);
      g.lineStyle(2, RED, 0.4 + k * 0.5);
      for (let x = f.x - f.w / 2; x < f.x + f.w / 2; x += 10) g.lineBetween(x, f.y, x + 5, f.y);
      g.lineStyle(1.5, RED_LIT, 0.6); g.lineBetween(f.x - f.w / 2, f.y - 6, f.x - f.w / 2, f.y + 6); g.lineBetween(f.x + f.w / 2, f.y - 6, f.x + f.w / 2, f.y + 6);
      g.fillStyle(RED, 0.08 + k * 0.12); g.fillRect(f.x - f.w / 2, f.y - 26, f.w, 34);
    }
  },
  drawAir(g, time) {
    for (const f of flats) {
      if (time < f.riseAt) continue;
      const up = time < f.downAt ? clamp((time - f.riseAt) / 180, 0, 1) : clamp(1 - (time - f.downAt) / 400, 0, 1);
      const h = (f.kind === 1 ? 70 : 56) * up;
      const x0 = f.x - f.w / 2;
      g.fillStyle(0x000000, 0.2); g.fillRect(x0 + 4, f.y - 2, f.w, 8);
      // A cardboard flat with a printed scene, its tab folded at the foot.
      g.fillStyle(PAPER_OLD, 1);
      switch (f.kind) {
        case 0: // a castle tower with crenels
          g.fillRect(x0 + f.w * 0.25, f.y - h, f.w * 0.5, h);
          for (let i = 0; i < 3; i++) g.fillRect(x0 + f.w * (0.25 + i * 0.19), f.y - h - 8 * up, f.w * 0.12, 8 * up);
          g.fillRect(x0, f.y - h * 0.5, f.w, h * 0.5);
          g.fillStyle(INK, 0.8); g.fillRect(f.x - 5, f.y - h * 0.7, 10, 12 * up);
          break;
        case 1: // a tree
          g.fillRect(f.x - 5, f.y - h * 0.5, 10, h * 0.5);
          g.fillCircle(f.x, f.y - h * 0.65, f.w * 0.32 * up); g.fillCircle(f.x - f.w * 0.22, f.y - h * 0.5, f.w * 0.22 * up); g.fillCircle(f.x + f.w * 0.22, f.y - h * 0.5, f.w * 0.22 * up);
          g.lineStyle(1.5, INK, 0.6); g.strokeCircle(f.x, f.y - h * 0.65, f.w * 0.32 * up);
          break;
        case 2: // a cottage front
          g.fillRect(x0 + 4, f.y - h * 0.7, f.w - 8, h * 0.7);
          g.fillTriangle(x0, f.y - h * 0.7, x0 + f.w, f.y - h * 0.7, f.x, f.y - h);
          g.fillStyle(INK, 0.75); g.fillRect(f.x - 6, f.y - h * 0.4, 12, h * 0.4); g.fillRect(x0 + 12, f.y - h * 0.6, 10, 9 * up); g.fillRect(x0 + f.w - 22, f.y - h * 0.6, 10, 9 * up);
          break;
        default: // a tall stave of the Score
          g.fillRect(x0, f.y - h, f.w, h);
          for (let k = 0; k < 5; k++) { g.lineStyle(1.2, INK, 0.7); g.lineBetween(x0 + 4, f.y - h + 10 + k * h * 0.15, x0 + f.w - 4, f.y - h + 10 + k * h * 0.15); }
          g.fillStyle(INK, 0.9); g.fillEllipse(f.x - 10, f.y - h * 0.55, 8, 6); g.fillEllipse(f.x + 12, f.y - h * 0.4, 8, 6);
          break;
      }
      g.lineStyle(1.5, PAPER_FOX, 1); g.strokeRect(x0, f.y - h * 0.5, f.w, h * 0.5);
      g.fillStyle(PAPER_DARK, 1); g.fillRect(x0, f.y - 2, f.w, 6);
    }
  },
  onPhaseEnd() { flats = []; },
});

// ── Signature: Bookmark ──────────────────────────────────────────────
// The red silk bookmark lashes out of him in a long arc — its path is traced first in dots of
// red across the floor — and sweeps through it, swallowtail first. Step inside his reach or
// beyond the ribbon's end.

const bookmark = (tk: BossToolkit): SignatureMove => {
  let a0 = 0, a1 = 0, warnAt = 0, swingAt = 0, endAt = 0;
  let ox = 0, oy = 0;
  let hitDone = true;
  let back = false;
  const LEN = 520;
  const INNER = 70;
  const tipAngle = (time: number) => {
    if (time < swingAt) return a0;
    const k = clamp((time - swingAt) / Math.max(1, endAt - swingAt), 0, 1);
    return back && k > 0.5 ? a1 + (a0 - a1) * ((k - 0.5) * 2) : a0 + (a1 - a0) * (back ? k * 2 : k);
  };
  return {
    durationMs: 2600,
    windupMs: 600,
    gesture: 'flex',
    tell: 'BOOKMARK',
    cast(time) {
      ox = tk.bossX; oy = tk.bossY;
      const pa = tk.angleToPlayer();
      const dir = Math.random() < 0.5 ? 1 : -1;
      a0 = pa - dir * 1.4; a1 = pa + dir * 1.4;
      back = tk.hard || folioPhase >= 2;
      warnAt = time;
      swingAt = time + tk.warn(750);
      endAt = swingAt + (back ? 1900 : 1000);
      hitDone = false;
      tk.sfx('whip');
    },
    update(time) {
      if (hitDone || time < swingAt) return;
      if (time > endAt) { hitDone = true; return; }
      const p = tk.player;
      const a = tipAngle(time);
      const x1 = ox + Math.cos(a) * LEN, y1 = oy + Math.sin(a) * LEN;
      const sx = ox + Math.cos(a) * INNER, sy = oy + Math.sin(a) * INNER;
      if (pAlive(tk) && segDist(p.x, p.y, sx, sy, x1, y1) < 24) { hitDone = true; tk.hitPlayer(13, p.x, p.y); tk.sfx('whip'); }
    },
    drawGround(g, time) {
      if (time > endAt || warnAt === 0) return;
      if (time < swingAt) {
        const k = clamp((time - warnAt) / Math.max(1, swingAt - warnAt), 0, 1);
        for (let i = 0; i <= 24; i++) {
          const a = a0 + (a1 - a0) * (i / 24);
          g.fillStyle(RED, 0.2 + k * 0.5); g.fillCircle(ox + Math.cos(a) * LEN, oy + Math.sin(a) * LEN, 3);
          g.fillStyle(RED, 0.15 + k * 0.3); g.fillCircle(ox + Math.cos(a) * INNER, oy + Math.sin(a) * INNER, 2);
        }
        g.lineStyle(1.5, RED, 0.3 + k * 0.4);
        g.lineBetween(ox + Math.cos(a0) * INNER, oy + Math.sin(a0) * INNER, ox + Math.cos(a0) * LEN, oy + Math.sin(a0) * LEN);
      }
    },
    drawAir(g, time) {
      if (time > endAt || time < swingAt) return;
      const a = tipAngle(time);
      // The ribbon: a wavy red silk band ending in a swallowtail.
      const c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= 20; i++) {
        const d = INNER * 0.4 + (LEN - INNER * 0.4) * (i / 20);
        const w = Math.sin(i * 0.9 + time / 60) * 5 * (i / 20);
        pts.push({ x: ox + c * d + nx * w, y: oy + s * d + ny * w });
      }
      g.lineStyle(16, RED_DARK, 0.9); g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
      g.lineStyle(11, RED, 1); g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
      g.lineStyle(3, RED_LIT, 0.6); g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x + nx * -3, p.y + ny * -3); g.strokePath();
      const tip = pts[pts.length - 1];
      g.fillStyle(RED, 1);
      g.fillTriangle(tip.x + nx * 8, tip.y + ny * 8, tip.x + c * 26 + nx * 9, tip.y + s * 26 + ny * 9, tip.x + c * 14, tip.y + s * 14);
      g.fillTriangle(tip.x - nx * 8, tip.y - ny * 8, tip.x + c * 26 - nx * 9, tip.y + s * 26 - ny * 9, tip.x + c * 14, tip.y + s * 14);
      // Motion: the arc it has swept, faint.
      g.lineStyle(2, RED_LIT, 0.25);
      g.beginPath(); g.arc(ox, oy, LEN, Math.min(a0, a), Math.max(a0, a), false); g.strokePath();
    },
    onPhaseEnd() { hitDone = true; endAt = 0; },
  };
};

// ── Signature: Strike It Out ─────────────────────────────────────────
// The red pen. Two (three) broad stripes of the page are ruled out — a red strike runs down the
// middle of each, its edges marked — and a beat later they are *erased*: the page goes blank and
// white there and whatever stood in it is very nearly gone. The erasure lingers a moment.

interface Stripe { horiz: boolean; c: number; half: number; drawAt: number; eraseAt: number; dealt: boolean; lastTick: number }

const strikeOut = (tk: BossToolkit): SignatureMove => {
  let stripes: Stripe[] = [];
  const HALF = 56;
  const LINGER = 1600;
  const inStripe = (s: Stripe, x: number, y: number) => Math.abs((s.horiz ? y : x) - s.c) < s.half;
  return {
    durationMs: 2800,
    windupMs: 600,
    gesture: 'slam',
    hold: 'draw',
    tell: 'STRIKE IT OUT',
    cast(time) {
      const p = tk.player;
      const horiz = Math.random() < 0.5;
      const lo = horiz ? TOP + HALF : HALF, hi = horiz ? tk.H - HALF : tk.W - HALF;
      const base = horiz ? p.y : p.x;
      const cs = [clamp(base, lo, hi)];
      const n = tk.hard ? 3 : 2;
      for (let tries = 0; cs.length < n && tries < 30; tries++) {
        const c = lo + Math.random() * (hi - lo);
        if (cs.every((o) => Math.abs(o - c) > HALF * 2 + 90)) cs.push(c);
      }
      stripes = cs.map((c, i) => ({ horiz, c, half: HALF, drawAt: time + i * 260, eraseAt: time + tk.warn(1150) + i * 260, dealt: false, lastTick: 0 }));
      tk.sfx('slash');
    },
    update(time) {
      const p = tk.player;
      for (const s of stripes) {
        if (!s.dealt && time >= s.eraseAt) {
          s.dealt = true;
          tk.sfx('crystal-shatter');
          if (pAlive(tk) && inStripe(s, p.x, p.y)) { tk.hitPlayer(26, p.x, p.y); s.lastTick = time; }
        } else if (s.dealt && time < s.eraseAt + LINGER && time - s.lastTick > 450 && pAlive(tk) && inStripe(s, p.x, p.y)) {
          s.lastTick = time;
          tk.hitPlayer(6, p.x, p.y);
        }
      }
      stripes = stripes.filter((s) => time < s.eraseAt + LINGER + 200);
    },
    drawGround(g, time) {
      for (const s of stripes) {
        const x0 = s.horiz ? 0 : s.c - s.half, y0 = s.horiz ? s.c - s.half : TOP;
        const w = s.horiz ? tk.W : s.half * 2, h = s.horiz ? s.half * 2 : tk.H - TOP;
        if (!s.dealt) {
          const k = clamp((time - s.drawAt) / Math.max(1, s.eraseAt - s.drawAt), 0, 1);
          g.fillStyle(RED, 0.06 + k * 0.14); g.fillRect(x0, y0, w, h);
          g.lineStyle(2, RED, 0.5 + k * 0.4);
          if (s.horiz) { g.lineBetween(0, y0, tk.W, y0); g.lineBetween(0, y0 + h, tk.W, y0 + h); }
          else { g.lineBetween(x0, TOP, x0, tk.H); g.lineBetween(x0 + w, TOP, x0 + w, tk.H); }
          // The strike running down the middle as the pen draws it.
          const pk = clamp((time - s.drawAt) / 500, 0, 1);
          if (s.horiz) strikeLine(g, 0, s.c + 3, tk.W * pk, s.c - 3, 7);
          else strikeLine(g, s.c - 3, TOP, s.c + 3, TOP + (tk.H - TOP) * pk, 7);
          continue;
        }
        // Erased: blank white page, the grain rubbed away, eraser crumbs at the edges.
        const fade = clamp((s.eraseAt + LINGER - time) / 300, 0, 1);
        const flash = clamp(1 - (time - s.eraseAt) / 200, 0, 1);
        g.fillStyle(0xffffff, (0.82 + flash * 0.18) * fade); g.fillRect(x0, y0, w, h);
        for (let d = 6; d < (s.horiz ? w : h); d += 17) {
          const ex = s.horiz ? x0 + d : x0 + ((d * 13) % 2 ? -3 : w + 3), ey = s.horiz ? y0 + ((d * 7) % 2 ? -3 : h + 3) : y0 + d;
          g.fillStyle(0xe8a8b8, 0.8 * fade); g.fillEllipse(ex, ey, 6, 3);
        }
      }
    },
    onPhaseEnd() { stripes = []; },
  };
};

// ── Signature: Proof Marks ───────────────────────────────────────────
// He stamps proofreader's marks on the page round you, in red, and each makes its correction in
// turn: a caret (∧, insert) shoots three darts at you; a delete loop throws a ring; a pilcrow (¶,
// new paragraph) rules a cross through itself; a full stop bursts where it stands.

interface Mark { x: number; y: number; kind: number; fireAt: number; fired: boolean; ringAt: number }

const proofs = (tk: BossToolkit): SignatureMove => {
  let marks: Mark[] = [];
  return {
    durationMs: 2600,
    windupMs: 550,
    gesture: 'point',
    tell: 'PROOF MARKS',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 5 : 4;
      const base = Math.random() * Math.PI * 2;
      marks = [];
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * Math.PI * 2;
        const r = 120 + Math.random() * 50;
        marks.push({ x: tk.clampX(p.x + Math.cos(a) * r), y: tk.clampY(p.y + Math.sin(a) * r), kind: i % 4, fireAt: time + tk.warn(900) + i * 280, fired: false, ringAt: 0 });
      }
      tk.sfx('curse-cast');
    },
    update(time) {
      const p = tk.player;
      for (const m of marks) {
        if (m.fired || time < m.fireAt) continue;
        m.fired = true;
        switch (m.kind) {
          case 0: {
            const a = Math.atan2(p.y - m.y, p.x - m.x);
            for (const k of [-1, 0, 1]) tk.spawnBullet({ x: m.x, y: m.y, angle: a + k * 0.2, speed: 240, damage: 7, r: 6, lifeMs: 3500, color: RED });
            tk.sfx('stab');
            break;
          }
          case 1:
            m.ringAt = time;
            tk.spawnRing({ cx: m.x, cy: m.y, delayMs: 0, speed: 230, gapCentre: Math.atan2(p.y - m.y, p.x - m.x) + Math.PI, gapHalf: 0.6, band: 14, damage: 9, startRadius: 20 });
            tk.sfx('sonic-pulse');
            break;
          case 2:
            tk.spawnLane({ x: m.x, y: m.y, angle: 0, halfW: 16, warnMs: tk.warn(380), damage: 9 });
            tk.spawnLane({ x: m.x, y: m.y, angle: Math.PI / 2, halfW: 16, warnMs: tk.warn(380), damage: 9 });
            tk.sfx('beam-fire');
            break;
          default:
            tk.explode(m.x, m.y, 62, 11, RED);
            tk.sfx('explosion-small');
            break;
        }
      }
      marks = marks.filter((m) => !m.fired || time < m.fireAt + 500);
    },
    drawGround(g, time) {
      for (const m of marks) {
        const k = m.fired ? 1 : clamp(1 - (m.fireAt - time) / 900, 0, 1);
        const a = m.fired ? clamp(1 - (time - m.fireAt) / 500, 0, 1) : 1;
        const pulse = 1 + Math.sin(time / 70) * 0.06 * k;
        const s = 1.4 * pulse;
        g.lineStyle(4 * s, RED, (0.4 + k * 0.6) * a);
        switch (m.kind) {
          case 0: g.lineBetween(m.x - 14 * s, m.y + 10 * s, m.x, m.y - 12 * s); g.lineBetween(m.x, m.y - 12 * s, m.x + 14 * s, m.y + 10 * s); break;
          case 1:
            g.beginPath(); g.arc(m.x, m.y, 10 * s, 0.3, Math.PI * 1.7, false); g.strokePath();
            g.lineBetween(m.x + 9 * s, m.y + 4 * s, m.x + 20 * s, m.y + 14 * s);
            break;
          case 2:
            g.beginPath(); g.arc(m.x - 4 * s, m.y - 6 * s, 7 * s, Math.PI * 0.5, Math.PI * 1.5, false); g.strokePath();
            g.lineBetween(m.x - 4 * s, m.y - 13 * s, m.x + 8 * s, m.y - 13 * s);
            g.lineBetween(m.x + 1 * s, m.y - 13 * s, m.x + 1 * s, m.y + 14 * s); g.lineBetween(m.x + 7 * s, m.y - 13 * s, m.x + 7 * s, m.y + 14 * s);
            if (!m.fired) { g.lineStyle(1, RED, 0.25 * k); g.lineBetween(0, m.y, tk.W, m.y); g.lineBetween(m.x, TOP, m.x, tk.H); }
            break;
          default:
            g.fillStyle(RED, (0.4 + k * 0.6) * a); g.fillCircle(m.x, m.y, 7 * s);
            g.lineStyle(2, RED, 0.5 * k * a); g.strokeCircle(m.x, m.y, 62);
            break;
        }
        g.lineStyle(1.5, RED_LIT, 0.4 * a); g.strokeCircle(m.x, m.y, 24 * s);
      }
    },
    onPhaseEnd() { marks = []; },
  };
};

// ── The Prince ───────────────────────────────────────────────────────

export const FOLIO_BOSS: WorldBossDef = {
  worldId: 'isle:folio',
  name: 'Prince Folio',
  title: 'the Librettist',
  color: FOLIO,
  colorLit: FOLIO_LIT,
  colorDark: FOLIO_DARK,
  accent: RED,
  // Tier 2 of the ninth isle.
  damageMult: 1.35,

  intro: [
    'You are not in the Score. I would know. I wrote every word of it.',
    'Sit still and be read. Then I shall decide which of you to keep.',
  ],
  banter: [
    'A word out of place is a weed. I am a very good gardener of words.',
    'Every line on this isle is mine. Every song in every mouth. You are welcome.',
    'Struck. Struck. Struck. Keep. Struck.',
    'The Maestro does not want new words. He wants the right ones. I have them all.',
    'I was a rag-boy once. I don\'t remember what I wrote. I struck it out myself.',
  ],
  defeatLine: 'THE LAST PAGE TURNS',
  resumeLine: 'You again. A second draft. They are usually worse.',

  phases: [
    {
      name: 'Quill',
      line: 'Let us begin with a line. Then another. Then you.',
      hp: 550,
      cycle: [
        'sig:verse', 'volley', 'sig:blot', 'sig:darts', 'radial',
        'sig:verse', 'homing', 'sig:blot', 'sig:darts',
      ],
      harass: ['h-snipe', 'h-flak'],
      restMs: 1200,
      harassMs: 3400,
    },
    {
      name: 'Pop-Up Book',
      line: 'Very well. Chapter two. Mind the scenery — it was very expensive to fold.',
      hp: 630,
      cycle: [
        'sig:pageturn', 'sig:bookmark', 'lanes', 'sig:popup', 'sig:darts',
        'sig:pageturn', 'barrage', 'sig:bookmark', 'sig:popup', 'sig:verse',
      ],
      harass: ['h-flak', 'h-lane', 'h-rune'],
      restMs: 1100,
      harassMs: 3000,
    },
  ],

  hard: {
    introLine: 'EVERYTHING IS A DRAFT',
    extraPhase: {
      name: 'Final Draft',
      line: 'Enough. I am taking out the red pen. Nobody survives the red pen. I made sure.',
      hp: 470,
      cycle: [
        'sig:strike', 'sig:proofs', 'sig:verse', 'spiral', 'sig:strike',
        'sig:bookmark', 'sig:proofs', 'sweep', 'sig:darts',
      ],
      harass: ['h-orbs', 'h-mines'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 220, spreadRad: 0.5 },
    radial: { count: 14, speed: 180 },
    lanes: { count: 3, warnMs: 900 },
    spiral: { arms: 3, speed: 170 },
  },

  signatures: {
    verse,
    blot,
    darts,
    pageturn: pageTurn,
    popup: popUp,
    bookmark,
    strike: strikeOut,
    proofs,
  },

  look: {
    crest: 'plume', pattern: 'grid', aura: 'none', hands: 'ball',
    torsoR: 33, mouth: 'line', eyes: 2, eyeColor: INK_BLUE,
  },
  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'cold', look: { pattern: 'weave', mouth: 'grin' } },
    { movement: 'blink', gimmick: 'none', tint: 'pale', look: { aura: 'dust', pattern: 'cracks', mouth: 'stitch', hands: 'blade' } },
  ],

  /**
   * The Librettist's tells. He is a man made of manuscript: a ruff of accordion-folded paper at
   * his throat, a folded paper bicorne with a tall white quill stuck through it, an open book in
   * his first hand (its pages riffling as he casts) and a quill dripping ink in his second. In
   * the Pop-Up Book his hat is a cardboard castle that rises and falls on its tabs and the book
   * in his hand is open wide with a tiny scene sprung out of it; in the Final Draft his edges are
   * torn, red strike-lines are struck right through him, and the quill is the Censor's red pen.
   */
  drawDecor(g, s) {
    folioPhase = s.phaseIdx;
    const R = s.radius;
    const popup = s.phaseIdx === 1;
    const final = s.hard && s.phaseIdx >= 2;
    // The accordion ruff.
    for (let i = 0; i < 14; i++) {
      const a = Math.PI * 0.15 + (i / 13) * Math.PI * 0.7;
      const r0 = R * 0.78, r1 = R * 1.18;
      const c = i % 2 ? PAPER_LIT : PAPER_DARK;
      g.fillStyle(final ? (i % 2 ? PAPER_OLD : PAPER_FOX) : c, 1);
      g.fillTriangle(s.x + Math.cos(a - 0.11) * r0, s.y + Math.sin(a - 0.11) * r0 * 0.6 + R * 0.35, s.x + Math.cos(a + 0.11) * r0, s.y + Math.sin(a + 0.11) * r0 * 0.6 + R * 0.35, s.x + Math.cos(a) * r1, s.y + Math.sin(a) * r1 * 0.55 + R * 0.4);
    }
    // Text written across his body, a line at a time.
    const rng = mulberry(0xf011 + s.phaseIdx);
    textLines(g, s.x - R * 0.55, s.y - R * 0.3, R * 1.1, R * 0.6, INK_SOFT, 0.35, rng, 6, final ? 0.6 : 0);
    if (final) {
      strikeLine(g, s.x - R * 0.9, s.y - R * 0.2, s.x + R * 0.9, s.y + R * 0.35, 4);
      strikeLine(g, s.x - R * 0.8, s.y + R * 0.45, s.x + R * 0.7, s.y - R * 0.5, 3);
      // Torn edges.
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        g.fillStyle(PAPER_FOX, 1);
        g.fillTriangle(s.x + Math.cos(a) * R * 0.95, s.y + Math.sin(a) * R * 0.95, s.x + Math.cos(a + 0.2) * R * 0.95, s.y + Math.sin(a + 0.2) * R * 0.95, s.x + Math.cos(a + 0.1) * R * 1.15, s.y + Math.sin(a + 0.1) * R * 1.15);
      }
    }
    // The hat.
    const hy = s.y - R * 0.95;
    if (popup) {
      // A cardboard castle on its tab, bobbing up and flat again.
      const up = 0.6 + Math.abs(Math.sin(s.t / 500)) * 0.4;
      g.fillStyle(PAPER_OLD, 1); g.fillRect(s.x - R * 0.6, hy - R * 0.5 * up, R * 1.2, R * 0.5 * up);
      for (let i = 0; i < 4; i++) g.fillRect(s.x - R * 0.6 + i * R * 0.34, hy - R * 0.5 * up - 6 * up, R * 0.18, 6 * up);
      g.fillRect(s.x - R * 0.18, hy - R * 0.95 * up, R * 0.36, R * 0.5 * up);
      g.fillStyle(INK, 0.8); g.fillRect(s.x - 3, hy - R * 0.8 * up, 6, 8 * up);
      g.fillStyle(RED, 1); g.fillTriangle(s.x, hy - R * 0.95 * up, s.x, hy - R * 1.25 * up, s.x + 12, hy - R * 1.12 * up);
      g.lineStyle(1.5, PAPER_FOX, 1); g.strokeRect(s.x - R * 0.6, hy - R * 0.5 * up, R * 1.2, R * 0.5 * up);
    } else {
      // A folded paper bicorne and a tall quill through it.
      g.fillStyle(final ? PAPER_OLD : PAPER_LIT, 1);
      g.fillTriangle(s.x - R * 0.95, hy + 2, s.x + R * 0.95, hy + 2, s.x, hy - R * 0.62);
      g.fillStyle(PAPER_DARK, 1); g.fillRect(s.x - R * 0.95, hy - 2, R * 1.9, 6);
      g.lineStyle(1, PAPER_FOX, 1); g.lineBetween(s.x, hy - R * 0.62, s.x, hy + 2);
      g.fillStyle(RED, 1); g.fillCircle(s.x + R * 0.3, hy - R * 0.12, 3.5);
      quill(g, s.x + R * 0.15, hy, R * 1.5, -1.25 - Math.sin(s.t / 700) * 0.06);
    }
    // The book in the first hand.
    const h0 = s.hands[0];
    if (h0) {
      const bx = h0.x, by = h0.y - 8;
      const open = popup ? 1.25 : 1;
      g.fillStyle(LEATHER_DARK, 1); g.fillRect(bx - 16 * open, by - 2, 32 * open, 18);
      g.fillStyle(PAPER_LIT, 1); g.fillTriangle(bx, by + 14, bx - 15 * open, by, bx - 15 * open, by + 14); g.fillRect(bx - 15 * open, by, 15 * open, 14);
      g.fillStyle(PAPER, 1); g.fillRect(bx, by, 15 * open, 14);
      g.lineStyle(1, INK, 0.5); for (let k = 0; k < 3; k++) { g.lineBetween(bx - 13 * open, by + 3 + k * 4, bx - 3, by + 3 + k * 4); g.lineBetween(bx + 3, by + 3 + k * 4, bx + 13 * open, by + 3 + k * 4); }
      if (s.castGlow > 0.2 && !popup) {
        // A page riffling over.
        const ph = (s.t / 120) % 1;
        g.fillStyle(PAPER_LIT, 0.9); g.fillTriangle(bx, by + 14, bx + Math.cos(ph * Math.PI) * 15, by - Math.sin(ph * Math.PI) * 8, bx + Math.cos(ph * Math.PI) * 15, by + 14 - Math.sin(ph * Math.PI) * 8);
      }
      if (popup) {
        // A tiny tower sprung out of the open book.
        g.fillStyle(PAPER_OLD, 1); g.fillRect(bx - 4, by - 14, 8, 14); g.fillTriangle(bx - 6, by - 14, bx + 6, by - 14, bx, by - 22);
        g.fillStyle(RED, 1); g.fillRect(bx - 1, by - 28, 2, 7);
      }
    }
    // The quill (or the red pen) in the second hand, dripping.
    const h1 = s.hands[1];
    if (h1) {
      if (final) nib(g, h1.x + 4, h1.y + 14, 24, 1.3);
      else quill(g, h1.x + 2, h1.y + 10, 40, -1.1 - s.castGlow * 0.4);
      const ph = (s.t / 700) % 1;
      g.fillStyle(final ? RED : INK, 1 - ph); g.fillCircle(h1.x + 3, h1.y + 14 + ph * 26, 2.4);
    }
    if (s.enraged) { g.lineStyle(1.5, RED_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.45); }
  },

  /**
   * The floor of the Bindery's great reading room: an open book the size of the room. Two cream
   * pages ruled in feint blue, columns of black text, an illuminated capital at the head of each
   * page, red marginal corrections, the spine's gutter shadowed down the middle, the stacked page
   * edges round the borders and his red ribbon bookmark lying across. The leather board shows
   * under the HUD at the top.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xf0110);
    // The board, under everything.
    g.fillStyle(LEATHER, 1); g.fillRect(0, 0, W, H);
    g.fillStyle(LEATHER_DARK, 1); g.fillRect(0, 0, W, 100);
    for (let i = 0; i < 12; i++) fleuron(g, 40 + i * 80, 50, 1.4, GILT, 0.6);
    // Page edges stacked round the border.
    for (let k = 0; k < 6; k++) {
      g.fillStyle(k % 2 ? PAPER_DARK : PAPER, 1);
      g.fillRect(6 + k * 2, 100 + k * 2, W - 12 - k * 4, H - 106 - k * 4);
    }
    // The two pages.
    const half = W / 2;
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? 20 : half, x1 = side < 0 ? half : W - 20;
      g.fillStyle(PAPER, 1); g.fillRect(x0, 112, x1 - x0, H - 130);
      // Foxing.
      for (let i = 0; i < 18; i++) { g.fillStyle(PAPER_FOX, 0.06 + rng() * 0.06); g.fillCircle(x0 + rng() * (x1 - x0), 120 + rng() * (H - 150), 4 + rng() * 14); }
      // Feint rules.
      for (let y = 140; y < H - 30; y += 24) { g.lineStyle(1, 0x7a9ad0, 0.22); g.lineBetween(x0 + 20, y, x1 - 20, y); }
      // A red margin rule.
      const mx = side < 0 ? x0 + 64 : x1 - 64;
      g.lineStyle(1.5, RED, 0.35); g.lineBetween(mx, 112, mx, H - 18);
      // Text in two blocks, some lines struck.
      const tx0 = side < 0 ? x0 + 78 : x0 + 40, tw = (x1 - x0) - 130;
      textLines(g, tx0 + 70, 150, tw - 70, 60, INK, 0.45, rng, 8, 0.15);
      textLines(g, tx0, 230, tw, 150, INK, 0.45, rng, 8, 0.12);
      textLines(g, tx0, 420, tw, 120, INK, 0.45, rng, 8, 0.2);
      // An illuminated capital: a gilt square, a red letter, a curl of vine.
      const cx = tx0 + 28, cy = 176;
      g.fillStyle(GILT_DARK, 1); g.fillRect(cx - 28, cy - 28, 56, 56);
      g.fillStyle(GILT, 1); g.fillRect(cx - 25, cy - 25, 50, 50);
      g.fillStyle(INK_BLUE, 1); g.fillRect(cx - 20, cy - 20, 40, 40);
      g.lineStyle(5, RED, 1); g.lineBetween(cx - 10, cy + 14, cx - 10, cy - 14); g.beginPath(); g.arc(cx - 2, cy - 6, 9, -Math.PI / 2, Math.PI / 2, false); g.strokePath();
      g.lineBetween(cx - 4, cy + 3, cx + 9, cy + 14);
      g.lineStyle(1.5, GILT_LIT, 0.9); g.beginPath(); g.arc(cx + 34, cy + 22, 10, Math.PI, Math.PI * 2.4, false); g.strokePath();
      // Marginal corrections in red.
      for (let i = 0; i < 4; i++) {
        const my = 260 + i * 80 + rng() * 20;
        const ax = side < 0 ? x0 + 30 : x1 - 30;
        g.lineStyle(1.5, RED, 0.5);
        g.lineBetween(ax - 8, my, ax, my - 10); g.lineBetween(ax, my - 10, ax + 8, my);
        g.lineBetween(ax - 10, my + 8, ax + 10, my + 8);
      }
      // A page number in the foot margin, as a tiny fleuron and a mark.
      fleuron(g, (x0 + x1) / 2, H - 30, 1, INK_SOFT, 0.5);
    }
    // The spine's gutter.
    for (let i = 0; i < 8; i++) { g.fillStyle(0x000000, 0.05); g.fillRect(half - 4 - i * 5, 112, 8 + i * 10, H - 130); }
    g.lineStyle(2, PAPER_FOX, 0.8); g.lineBetween(half, 112, half, H - 18);
    // Sewing stations peeping through at the gutter.
    for (let y = 150; y < H - 40; y += 90) { g.lineStyle(2, OAK_DARK, 0.4); g.lineBetween(half, y, half, y + 10); }
    // The ribbon bookmark lying across the right-hand page.
    g.lineStyle(12, RED_DARK, 0.8); g.lineBetween(half + 4, 112, W * 0.82, H - 20);
    g.lineStyle(8, RED, 0.9); g.lineBetween(half + 4, 112, W * 0.82, H - 20);
    g.fillStyle(RED, 0.9); g.fillTriangle(W * 0.82 - 6, H - 20, W * 0.82 + 8, H - 24, W * 0.82 + 4, H - 4);
    // Two of his folded cranes resting at the page corners.
    crane(g, 70, H - 50, 1.4, 0, 0.3, PAPER_LIT);
    crane(g, W - 70, 150, 1.4, Math.PI, 0.3, lit(RED, 0.4));
    // Lamplight from above.
    for (let i = 0; i < 5; i++) { g.lineStyle(40, 0xfff0c0, 0.03); g.strokeRect(i * 20, 100 + i * 20, W - i * 40, H - 100 - i * 40); }
    g.fillStyle(dim(GILT, 0.3), 1); g.fillRect(0, 98, W, 4);
    sheet(g, W * 0.3, H - 40, 24, 30, 0.4, PAPER_LIT, 0.8);
  },
};
