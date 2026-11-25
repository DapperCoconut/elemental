import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, type G } from '../../../../../art/IsleArt';
import { ELEMENT_DATA_MAP } from '../../../../../../data/ElementRoster';
import { fallenId } from '../../../../meteor/spec';
import {
  CLOTH_BLUE, CLOTH_RED, FOE_C, GILT, INK, INK_SOFT, MINE_C, PAGE, PARCH, SEAL, clamp, censorSeal, frameClock,
  inkRect, inked,
} from '../util';
import { alive, pagePlate } from './common';

/**
 * Struck Through — Primula Vellum, senior clerk of the Office of Licensed Tales, who in the King's
 * telling read every tale submitted for licence and struck out whatever was said too often.
 *
 * The yard is one of her licence forms, ruled in blue. She keeps a tally of every word each of you
 * says — every E, R, F and Q you cast. When the Office bell rings she rules on the chapter: the word
 * each of you said most is struck from your licence until the next bell (her red seal lands over
 * that key on the HUD). Say a struck word anyway and her seal comes down on you — hurt and rooted.
 * Keep to your licence through a whole chapter and it is *approved*: your cooldowns run fast for a
 * few seconds.
 *
 * Meanwhile her blue pencil strikes lines through the page: a ruled line is drawn through where you
 * stand, then the pencil runs it. It strikes out anything in its way — her too, which is the
 * exploit, along with the bot's habit of saying its favourite word whatever the licence says. At
 * half health she strikes in crosses.
 */

const ID = fallenId('fable', 'struck-through');
const CHAPTER_MS = 8000;
const APPROVED_MS = 3500;
const PENCIL_EVERY = 3300;
const PENCIL_WARN = 950;
const PENCIL_RUN = 260;
const PENCIL_HW = 22;
const WORDS = ['e', 'r', 'f', 'q'] as const;
type Word = typeof WORDS[number];

interface Strike { x: number; y: number; ang: number; at: number; fireAt: number; fired: boolean }
interface Ledger { tally: Record<Word, number>; banned: Word | null; broke: boolean; approvedUntil: number; lastStamp: number }

const isWord = (s: string | null | undefined): s is Word => !!s && (WORDS as readonly string[]).includes(s);

/** Ability id → its key, across every element (for reading the bot's casts). */
const KEY_OF = (() => {
  const m = new Map<string, string>();
  for (const el of Object.values(ELEMENT_DATA_MAP)) for (const a of el?.abilities ?? []) if (!m.has(a.id)) m.set(a.id, a.displayKey.toLowerCase());
  return m;
})();

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk, player, npc } = ctx;
  const step = frameClock();
  const fresh = (): Ledger => ({ tally: { e: 0, r: 0, f: 0, q: 0 }, banned: null, broke: false, approvedUntil: 0, lastStamp: -9999 });
  const books = new Map<Fighter, Ledger>([[player, fresh()], [npc, fresh()]]);

  let started = false;
  let nextBell = 0;
  let nextPencil = 0;
  let crosses = false;
  let strikes: Strike[] = [];
  let stampFx: { x: number; y: number; at: number }[] = [];

  function said(f: Fighter, word: string | null | undefined): void {
    if (!isWord(word) || !alive(f)) return;
    const b = books.get(f);
    if (!b) return;
    b.tally[word]++;
    if (b.banned !== word) return;
    b.broke = true;
    const now = tk.now;
    if (now - b.lastStamp < 1200) return;
    b.lastStamp = now;
    const me = f === player;
    ctx.hit(f, me ? 14 : 22, f.x, f.y);
    ctx.root(f, 900);
    stampFx.push({ x: f.x, y: f.y, at: now });
    ctx.sfx('judgement');
  }

  function bell(time: number): void {
    nextBell = time + CHAPTER_MS;
    ctx.sfx('holy-chord');
    for (const [f, b] of books) {
      if (b.banned && !b.broke && alive(f)) { b.approvedUntil = time + APPROVED_MS; ctx.flash(f.x, f.y, GILT); }
      let best: Word | null = null, n = 0;
      for (const w of WORDS) if (b.tally[w] > n) { n = b.tally[w]; best = w; }
      b.banned = best; b.broke = false;
      for (const w of WORDS) b.tally[w] = 0;
    }
    const p = books.get(player);
    if (p?.banned) ctx.banner(`STRUCK FROM YOUR LICENCE: ${p.banned.toUpperCase()}`, '#ff9a9a');
  }

  function pencil(time: number): void {
    const a = ctx.rng() * Math.PI;
    const x = player.x, y = player.y;
    strikes.push({ x, y, ang: a, at: time, fireAt: time + tk.warn(PENCIL_WARN), fired: false });
    if (crosses) strikes.push({ x, y, ang: a + Math.PI / 2, at: time, fireAt: time + tk.warn(PENCIL_WARN) + 120, fired: false });
    ctx.sfx('stab');
  }

  const lineDist = (s: Strike, x: number, y: number): number => Math.abs(-(x - s.x) * Math.sin(s.ang) + (y - s.y) * Math.cos(s.ang));

  return {
    update(time) {
      step(time);
      if (!started) { started = true; nextBell = time + CHAPTER_MS; nextPencil = time + 2400; }
      if (!crosses && npc.hp < npc.maxHp * 0.5) { crosses = true; ctx.banner('SHE STRIKES IN CROSSES', '#a8c8ff'); }
      if (time >= nextBell) bell(time);
      if (time >= nextPencil && alive(player)) { nextPencil = time + PENCIL_EVERY; pencil(time); }
      for (const s of strikes) {
        if (s.fired || time < s.fireAt) continue;
        s.fired = true;
        ctx.sfx('slash');
        for (const f of [player, npc]) {
          if (!alive(f) || ctx.isAirborne(f) || lineDist(s, f.x, f.y) > PENCIL_HW + 20) continue;
          ctx.hit(f, f === player ? 14 : 20, f.x, f.y);
          ctx.flash(f.x, f.y, CLOTH_BLUE);
        }
      }
      strikes = strikes.filter((s) => !s.fired || time - s.fireAt < 1400);
      stampFx = stampFx.filter((s) => time - s.at < 700);
    },

    onPlayerCast(_id, slot) { said(player, slot); },
    onNpcCast(id) { said(npc, KEY_OF.get(id)); },

    playerCooldownRate: () => (tk.now < (books.get(player)?.approvedUntil ?? 0) ? 1.6 : 1),
    npcCooldownRate: () => (tk.now < (books.get(npc)?.approvedUntil ?? 0) ? 1.6 : 1),

    npcSeek(): Pt | null {
      for (const s of strikes) {
        if (s.fired || lineDist(s, npc.x, npc.y) > PENCIL_HW + 50) continue;
        const nx = -Math.sin(s.ang), ny = Math.cos(s.ang);
        const side = (npc.x - s.x) * nx + (npc.y - s.y) * ny >= 0 ? 1 : -1;
        return { x: clamp(npc.x + nx * side * 110, 60, W - 60), y: clamp(npc.y + ny * side * 110, top + 50, H - 50) };
      }
      // A stamped stranger is a rooted one: close in.
      const p = books.get(player);
      if (p && tk.now - p.lastStamp < 900 && alive(player)) return { x: player.x, y: player.y };
      return null;
    },

    drawGround(g, time) {
      // The licence form: blue rules, a red margin, a header box.
      g.fillStyle(PAGE, 0.55); g.fillRect(24, top + 8, W - 48, H - top - 24);
      g.lineStyle(1.2, 0x8ab0e0, 0.55);
      for (let y = top + 40; y < H - 20; y += 30) g.lineBetween(24, y, W - 24, y);
      g.lineStyle(2, CLOTH_RED, 0.5); g.lineBetween(92, top + 8, 92, H - 16);
      g.lineStyle(1.6, INK, 0.6); g.strokeRect(24, top + 8, W - 48, H - top - 24);
      for (let i = 0; i < 6; i++) { g.fillStyle(INK, 0.6); g.fillCircle(56, top + 60 + i * 84, 5); g.fillStyle(PARCH, 1); g.fillCircle(56, top + 60 + i * 84, 3); }
      // Ruled telegraphs, then the graphite strike left behind.
      for (const s of strikes) {
        const ux = Math.cos(s.ang), uy = Math.sin(s.ang);
        const x0 = s.x - ux * 1200, y0 = s.y - uy * 1200, x1 = s.x + ux * 1200, y1 = s.y + uy * 1200;
        if (!s.fired) {
          const k = clamp((time - s.at) / Math.max(1, s.fireAt - s.at), 0, 1);
          g.lineStyle(PENCIL_HW * 2, CLOTH_BLUE, 0.06 + 0.14 * k); g.lineBetween(x0, y0, x1, y1);
          g.lineStyle(1.4, CLOTH_BLUE, 0.4 + 0.5 * k);
          const nx = -uy * PENCIL_HW, ny = ux * PENCIL_HW;
          g.lineBetween(x0 + nx, y0 + ny, x1 + nx, y1 + ny); g.lineBetween(x0 - nx, y0 - ny, x1 - nx, y1 - ny);
        } else {
          const a = clamp(1 - (time - s.fireAt) / 1400, 0, 1);
          g.lineStyle(9, 0x3a4a7a, 0.7 * a); g.lineBetween(x0, y0, x1, y1);
          g.lineStyle(3, 0x6a8ad0, 0.6 * a); g.lineBetween(x0, y0 - 2, x1, y1 - 2);
        }
      }
    },

    drawAir(g, time) {
      // The pencil running its line, then lifting away.
      for (const s of strikes) {
        const ux = Math.cos(s.ang), uy = Math.sin(s.ang);
        if (!s.fired) {
          const k = clamp((time - s.at) / Math.max(1, s.fireAt - s.at), 0, 1);
          const px = s.x - ux * 520, py = s.y - uy * 520;
          if (k > 0.5) drawPencil(g, clamp(px, 30, W - 30), clamp(py, top + 20, H - 20), s.ang, (k - 0.5) * 2);
        } else if (time - s.fireAt < PENCIL_RUN) {
          const k = (time - s.fireAt) / PENCIL_RUN;
          drawPencil(g, s.x - ux * 520 + ux * 1040 * k, s.y - uy * 520 + uy * 1040 * k, s.ang, 1);
        }
      }
      for (const st of stampFx) {
        const k = (time - st.at) / 700;
        const drop = k < 0.25 ? (1 - k / 0.25) * 40 : 0;
        censorSeal(g, st.x, st.y - 30 - drop, 16, 1 - Math.max(0, k - 0.6) / 0.4);
      }
      // A seal hovering over whoever has a word struck, and a gilt tick over the approved.
      for (const [f, b] of books) {
        if (!alive(f)) continue;
        if (b.banned) censorSeal(g, f.x + 20, f.y - 58, 5, 0.9);
        if (tk.now < b.approvedUntil) { g.lineStyle(3, GILT, 1); g.lineBetween(f.x - 8, f.y - 62, f.x - 2, f.y - 56); g.lineBetween(f.x - 2, f.y - 56, f.x + 10, f.y - 70); }
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 4;
      pagePlate(g, x, y, 236, 30);
      // The stranger's four keys, tallies under them; the struck one under a seal.
      const pb = books.get(player);
      const nb = books.get(npc);
      for (const [b, ox, col] of [[pb, -104, MINE_C], [nb, 14, FOE_C]] as const) {
        if (!b) continue;
        g.fillStyle(col, 1); g.fillCircle(x + ox, y + 15, 4);
        WORDS.forEach((w, i) => {
          const kx = x + ox + 10 + i * 22, ky = y + 5;
          inkRect(g, kx, ky, 18, 16, b.banned === w ? dim(PARCH, 0.2) : PAGE, 1, 1);
          glyph(g, w, kx + 9, ky + 8, 5);
          const n = Math.min(6, b.tally[w]);
          for (let t = 0; t < n; t++) { g.fillStyle(INK_SOFT, 0.9); g.fillRect(kx + 1 + t * 3, ky + 19, 2, 4); }
          if (b.banned === w) {
            censorSeal(g, kx + 9, ky + 8, 6, 1);
            g.lineStyle(2, SEAL, 1); g.lineBetween(kx - 1, ky + 15, kx + 19, ky + 1);
          }
        });
      }
      const k = clamp(1 - (nextBell - time) / CHAPTER_MS, 0, 1);
      g.fillStyle(GILT, 0.95); g.fillRect(x - 112, y + 29, 224 * k, 2);
    },
  };
}

/** A key's letter, drawn in strokes (E, R, F, Q) centred on (x, y), half-height `s`. */
function glyph(g: G, w: Word, x: number, y: number, s: number): void {
  g.lineStyle(1.6, INK, 1);
  const L = x - s * 0.6, R = x + s * 0.6, T = y - s, B = y + s, M = y;
  if (w === 'e' || w === 'f') {
    g.lineBetween(L, T, L, B); g.lineBetween(L, T, R, T); g.lineBetween(L, M, R - s * 0.3, M);
    if (w === 'e') g.lineBetween(L, B, R, B);
  } else if (w === 'r') {
    g.lineBetween(L, T, L, B); g.lineBetween(L, T, R - s * 0.2, T); g.lineBetween(R - s * 0.2, T, R, T + s * 0.4);
    g.lineBetween(R, T + s * 0.4, R - s * 0.2, M); g.lineBetween(R - s * 0.2, M, L, M); g.lineBetween(L + s * 0.3, M, R, B);
  } else {
    g.strokeEllipse(x, y, s * 1.3, s * 1.9); g.lineBetween(x + s * 0.1, y + s * 0.4, R + s * 0.2, B + s * 0.2);
  }
}

/** The clerk's blue pencil: a long hexagonal shaft, a sharpened cone, the blue lead. */
function drawPencil(g: G, x: number, y: number, a: number, alpha: number): void {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const P = (f: number, s: number): Pt => ({ x: x + ux * f + nx * s, y: y + uy * f + ny * s });
  g.fillStyle(0x000000, 0.2 * alpha); g.fillEllipse(x - ux * 40 + 8, y - uy * 40 + 10, 110, 16);
  inked(g, [P(-110, -9), P(-20, -9), P(-20, 9), P(-110, 9)], CLOTH_BLUE, alpha, 1.6);
  g.lineStyle(1, 0x8ab0e0, 0.8 * alpha); const a0 = P(-108, -3), a1 = P(-22, -3); g.lineBetween(a0.x, a0.y, a1.x, a1.y);
  inked(g, [P(-20, -9), P(4, -2), P(4, 2), P(-20, 9)], 0xe8c890, alpha, 1.4);
  inked(g, [P(-2, -3), P(6, 0), P(-2, 3)], 0x3a4a7a, alpha, 1);
  inked(g, [P(-124, -9), P(-110, -9), P(-110, 9), P(-124, 9)], GILT, alpha, 1.2);
  inked(g, [P(-136, -8), P(-124, -8), P(-124, 8), P(-136, 8)], 0xe8a0a8, alpha, 1.2);
}

export const FALLEN_STRUCK_THROUGH: GimmickDef = {
  id: ID,
  rules: 'At each bell your most-cast key is struck from your licence: cast it and the seal roots you. Keep the licence clean for faster cooldowns.',
  make,
};
