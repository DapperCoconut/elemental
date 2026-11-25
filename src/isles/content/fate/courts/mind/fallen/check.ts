import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { chessPiece, strokeText, type PieceKind } from '../art';
import { CARD_BLACK, CARD_RED, EBONY, GILT, GILT_DARK, GILT_LIT, IVORY, IVORY_DARK, MIND_LIT } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Discovered Check — Arbiter Septimus Thorley, who sits in the tall chair at the corner of the
 * Plaza Board and calls "taken" when a busted piece is captured. In the King's telling he is the
 * one who chose which squares the busted stood on, and who had the taken carried off the board.
 *
 * The fight is played on his board: ten files by five ranks laid over the yard, and on it living
 * pieces — a rook, a bishop and a knight, each a busted townsman in a carved headdress. Black
 * pieces hunt the white king (you); white pieces hunt the black king (him). Every couple of
 * seconds one piece makes a real chess move toward its king's square, and if it lands giving
 * CHECK its lines light across the board and strike a beat later. Rays stop at other pieces, so a
 * piece between you and the checker is cover — and a knight jumps every cover there is.
 *
 * The exploit is the coat. Strike a black piece and it turns its coat white: now it hunts him,
 * and its next check falls on Thorley (a piece struck mid-check drops the check, too). He walks
 * up to his turned pieces to strike them back. Halfway down, the black queen is played.
 */

const ID = fallenId('mind', 'check');
const SQ = 96;
const COLS = 10;
const ROWS = 5;
const MOVE_MS = 2150;
const GLIDE_MS = 420;
const CHECK_MS = 1150;
const BURN_MS = 380;

interface Piece {
  kind: PieceKind;
  white: boolean;
  c: number; r: number;
  /** Where it glides from, and when the glide started. */
  fc: number; fr: number; movedAt: number;
  target: StrikeTarget | null;
  turnedAt: number;
  seed: number;
}
interface Check { piece: Piece; squares: Set<number>; at: number; fireAt: number; fired: boolean; victim: 'player' | 'npc' }

const key = (c: number, r: number): number => r * COLS + c;
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, top, player, npc, tk, rng } = ctx;
  const X0 = (W - COLS * SQ) / 2;
  const Y0 = top + 32;
  const cx = (c: number) => X0 + c * SQ + SQ / 2;
  const cy = (r: number) => Y0 + r * SQ + SQ / 2;
  const colOf = (x: number) => clamp(Math.floor((x - X0) / SQ), 0, COLS - 1);
  const rowOf = (y: number) => clamp(Math.floor((y - Y0) / SQ), 0, ROWS - 1);
  const onBoard = (c: number, r: number) => c >= 0 && c < COLS && r >= 0 && r < ROWS;

  const pieces: Piece[] = [];
  const checks: Check[] = [];
  let nextMove = 0;
  let turn = 0;
  let started = false;
  let queenPlayed = false;

  const pieceAt = (c: number, r: number) => pieces.find((p) => p.c === c && p.r === r);
  const fighterOn = (c: number, r: number) =>
    [player, npc].some((f) => alive(f) && colOf(f.x) === c && rowOf(f.y) === r);
  const pos = (p: Piece, time: number) => {
    const k = clamp((time - p.movedAt) / GLIDE_MS, 0, 1);
    const e = k * k * (3 - 2 * k);
    return { x: cx(p.fc) + (cx(p.c) - cx(p.fc)) * e, y: cy(p.fr) + (cy(p.r) - cy(p.fr)) * e, k };
  };

  /** Every square a piece standing on (c, r) attacks; rays stop at the first other piece. */
  function attacks(kind: PieceKind, c: number, r: number, self: Piece): Set<number> {
    const out = new Set<number>();
    if (kind === 'knight') {
      for (const [dc, dr] of KNIGHT) if (onBoard(c + dc, r + dr)) out.add(key(c + dc, r + dr));
      return out;
    }
    const dirs = kind === 'rook' ? ROOK_DIRS : kind === 'bishop' ? BISHOP_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
    for (const [dc, dr] of dirs) {
      let x = c + dc, y = r + dr;
      while (onBoard(x, y)) {
        out.add(key(x, y));
        const blocker = pieceAt(x, y);
        if (blocker && blocker !== self) break;
        x += dc; y += dr;
      }
    }
    return out;
  }

  /** Legal destinations: slides up to a blocker, or the knight's jumps; never onto a fighter. */
  function moves(p: Piece): { c: number; r: number }[] {
    const out: { c: number; r: number }[] = [];
    const ok = (c: number, r: number) => onBoard(c, r) && !pieceAt(c, r) && !fighterOn(c, r);
    if (p.kind === 'knight') {
      for (const [dc, dr] of KNIGHT) if (ok(p.c + dc, p.r + dr)) out.push({ c: p.c + dc, r: p.r + dr });
      return out;
    }
    const dirs = p.kind === 'rook' ? ROOK_DIRS : p.kind === 'bishop' ? BISHOP_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
    for (const [dc, dr] of dirs) {
      let x = p.c + dc, y = p.r + dr;
      while (onBoard(x, y) && !pieceAt(x, y)) {
        if (!fighterOn(x, y)) out.push({ c: x, r: y });
        x += dc; y += dr;
      }
    }
    return out;
  }

  function addPiece(kind: PieceKind, c: number, r: number): void {
    const p: Piece = { kind, white: false, c, r, fc: c, fr: r, movedAt: -1e9, target: null, turnedAt: -1e9, seed: pieces.length * 1.7 };
    p.target = ctx.target({
      x: cx(c), y: cy(r) - 22, r: 28,
      onStruck: (by) => {
        // A blow turns the coat toward the striker's side only.
        const want = by === 'player';
        if (p.white === want) return;
        p.white = want;
        p.turnedAt = ctx.scene.time.now;
        for (const ch of checks) if (ch.piece === p) ch.fired = true;
        ctx.flash(p.target ? p.target.x : cx(p.c), cy(p.r) - 24, want ? IVORY : EBONY);
        ctx.sfx('clang');
      },
    });
    pieces.push(p);
  }

  function play(time: number): void {
    if (!pieces.length) return;
    const p = pieces[turn % pieces.length];
    turn++;
    const king = p.white ? npc : player;
    if (!alive(king)) return;
    const kc = colOf(king.x), kr = rowOf(king.y);
    const options = moves(p);
    if (!options.length) return;
    let best = options[0], bs = -1e9;
    for (const m of options) {
      const gives = attacks(p.kind, m.c, m.r, p).has(key(kc, kr));
      const s = gives ? 100 - Math.hypot(m.c - p.c, m.r - p.r) * 2 : -Math.max(Math.abs(m.c - kc), Math.abs(m.r - kr)) * 3;
      const v = s + rng() * 2;
      if (v > bs) { bs = v; best = m; }
    }
    p.fc = p.c; p.fr = p.r; p.c = best.c; p.r = best.r; p.movedAt = time;
    ctx.sfx('stone-slam');
    const squares = attacks(p.kind, p.c, p.r, p);
    if (squares.has(key(kc, kr))) {
      checks.push({ piece: p, squares, at: time + GLIDE_MS, fireAt: time + GLIDE_MS + tk.warn(CHECK_MS), fired: false, victim: p.white ? 'npc' : 'player' });
      tk.schedule(GLIDE_MS, () => ctx.sfx('countdown-tick'));
    }
  }

  function fire(ch: Check): void {
    ch.fired = true;
    const f: Fighter = ch.victim === 'player' ? player : npc;
    if (!alive(f) || !ch.squares.has(key(colOf(f.x), rowOf(f.y)))) { ctx.sfx('whoosh'); return; }
    const knight = ch.piece.kind === 'knight';
    if (f === player) {
      tk.hitPlayer(knight ? 22 : 20, f.x, f.y);
      if (knight) tk.stun(550);
    } else {
      ctx.hit(npc, knight ? 34 : 30, f.x, f.y);
      if (knight) ctx.stun(npc, 550);
    }
    ctx.sfx(knight ? 'hammer-forge' : 'judgement');
    ctx.flash(f.x, f.y, f === player ? CARD_RED : GILT_LIT);
  }

  return {
    update(time) {
      if (!started) {
        started = true;
        nextMove = time + 2600;
        addPiece('rook', 1, 0);
        addPiece('bishop', 8, 4);
        addPiece('knight', 5, 2);
      }
      if (!queenPlayed && npc.hp < npc.maxHp * 0.5) {
        queenPlayed = true;
        let c = 4, r = 0;
        for (let i = 0; i < COLS * ROWS; i++) {
          const tc = (4 + i) % COLS, tr = Math.floor(i / COLS) % ROWS;
          if (!pieceAt(tc, tr) && !fighterOn(tc, tr)) { c = tc; r = tr; break; }
        }
        addPiece('queen', c, r);
        ctx.banner('THE QUEEN IS PLAYED', '#f4dc8a');
        ctx.sfx('boss-phase');
      }
      for (const p of pieces) {
        const at = pos(p, time);
        p.target?.moveTo(at.x, at.y - 22);
      }
      if (time >= nextMove) { play(time); nextMove = time + MOVE_MS; }
      for (const ch of checks) if (!ch.fired && time >= ch.fireAt) fire(ch);
      for (let i = checks.length - 1; i >= 0; i--) if (checks[i].fired && time > checks[i].fireAt + BURN_MS) checks.splice(i, 1);
    },

    npcSeek() {
      if (!alive(npc)) return null;
      const time = ctx.scene.time.now;
      const danger = new Set<number>();
      for (const ch of checks) if (!ch.fired && ch.victim === 'npc' && time >= ch.at - 100) for (const s of ch.squares) danger.add(s);
      if (danger.has(key(colOf(npc.x), rowOf(npc.y)))) {
        let best: { x: number; y: number } | null = null, bd = 1e9;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (danger.has(key(c, r)) || pieceAt(c, r)) continue;
          const d = dist(npc.x, npc.y, cx(c), cy(r));
          if (d < bd) { bd = d; best = { x: cx(c), y: cy(r) }; }
        }
        return best;
      }
      // Go and turn a turned piece back.
      const turned = pieces.filter((p) => p.white);
      if (!turned.length) return null;
      turned.sort((a, b) => dist(npc.x, npc.y, cx(a.c), cy(a.r)) - dist(npc.x, npc.y, cx(b.c), cy(b.r)));
      const p = turned[0];
      const a = Math.atan2(npc.y - cy(p.r), npc.x - cx(p.c));
      return { x: cx(p.c) + Math.cos(a) * 64, y: cy(p.r) + Math.sin(a) * 64 };
    },

    drawGround(g, time) {
      // The board: inlaid squares, a gilt border, file letters and rank numbers in brass.
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const light = (r + c) % 2 === 0;
        const x = X0 + c * SQ, y = Y0 + r * SQ;
        g.fillStyle(light ? IVORY : EBONY, light ? 0.13 : 0.22); g.fillRect(x, y, SQ, SQ);
        g.lineStyle(1, light ? IVORY_DARK : CARD_BLACK, 0.18); g.strokeRect(x + 3, y + 3, SQ - 6, SQ - 6);
      }
      g.lineStyle(3, GILT_DARK, 0.7); g.strokeRect(X0, Y0, COLS * SQ, ROWS * SQ);
      g.lineStyle(1, GILT, 0.5); g.strokeRect(X0 + 4, Y0 + 4, COLS * SQ - 8, ROWS * SQ - 8);
      for (let c = 0; c < COLS; c++) strokeText(g, 'ABCDEFGHIJ'[c], cx(c), Y0 - 12, 9, GILT_LIT, 0.55, 1.4);
      for (let r = 0; r < ROWS; r++) strokeText(g, String(ROWS - r), X0 + 10, cy(r), 9, GILT_LIT, 0.45, 1.4);

      // Each piece's reach, faint: small pips on every square it attacks.
      for (const p of pieces) {
        if (pos(p, time).k < 1) continue;
        for (const s of attacks(p.kind, p.c, p.r, p)) {
          const c = s % COLS, r = Math.floor(s / COLS);
          g.fillStyle(p.white ? GILT_LIT : CARD_RED, 0.16); g.fillCircle(cx(c), cy(r), 4);
        }
      }

      // Checks: the attacked squares fill, the rays draw out from the piece, then burn.
      for (const ch of checks) {
        const col = ch.victim === 'player' ? CARD_RED : GILT_LIT;
        const k = clamp((time - ch.at) / Math.max(1, ch.fireAt - ch.at), 0, 1);
        const burning = time >= ch.fireAt;
        const bk = burning ? 1 - clamp((time - ch.fireAt) / BURN_MS, 0, 1) : 0;
        if (time < ch.at) continue;
        for (const s of ch.squares) {
          const c = s % COLS, r = Math.floor(s / COLS);
          const x = X0 + c * SQ, y = Y0 + r * SQ;
          g.fillStyle(col, burning ? 0.5 * bk : 0.08 + 0.22 * k); g.fillRect(x + 2, y + 2, SQ - 4, SQ - 4);
          // Hatching closes in toward the square's centre as the check ripens.
          const inset = 6 + (1 - k) * 30;
          g.lineStyle(2, col, burning ? bk : 0.35 + 0.5 * k);
          g.strokeRect(x + inset, y + inset, SQ - inset * 2, SQ - inset * 2);
        }
        const px = cx(ch.piece.c), py = cy(ch.piece.r);
        g.lineStyle(burning ? 6 : 2, col, burning ? bk : 0.5 * k);
        for (const s of ch.squares) {
          const c = s % COLS, r = Math.floor(s / COLS);
          if (ch.piece.kind === 'knight') {
            // The L, drawn as the jump goes: two legs.
            const mx = Math.abs(c - ch.piece.c) === 2 ? cx(c) : px;
            const my = Math.abs(c - ch.piece.c) === 2 ? py : cy(r);
            g.lineBetween(px, py, mx, my); g.lineBetween(mx, my, cx(c), cy(r));
          } else {
            g.lineBetween(px, py, px + (cx(c) - px) * k, py + (cy(r) - py) * k);
          }
        }
        if (burning) glow(g, px, py, 60, col, 0.1 * bk, 3);
      }
    },

    drawAir(g, time) {
      for (const p of pieces) {
        const at = pos(p, time);
        const hop = p.kind === 'knight' ? Math.sin(at.k * Math.PI) * 46 : Math.sin(at.k * Math.PI) * 6;
        const x = at.x, y = at.y + 26 - hop;
        if (hop > 4) shadow(g, at.x, at.y + 27, 34, 10, 0.25);
        // Plinth disc, then the carved piece, a black chip on its chain at the collar.
        g.fillStyle(GILT_DARK, 1); g.fillEllipse(x, y, 46, 14);
        g.fillStyle(p.white ? IVORY_DARK : EBONY, 1); g.fillEllipse(x, y - 2, 42, 12);
        chessPiece(g, x, y - 3, p.kind, p.white, 1.25);
        g.lineStyle(1, GILT, 0.9);
        g.beginPath(); g.arc(x, y - 34, 9, 0.2, Math.PI - 0.2, false); g.strokePath();
        g.fillStyle(CARD_BLACK, 1); g.fillCircle(x, y - 25, 3.4);
        g.lineStyle(1, GILT_LIT, 1); g.strokeCircle(x, y - 25, 3.4);
        // The coat turning: a ring of the new colour rolls up the piece.
        const tk2 = (time - p.turnedAt) / 500;
        if (tk2 >= 0 && tk2 < 1) {
          g.lineStyle(3, p.white ? IVORY : EBONY, 1 - tk2);
          g.strokeEllipse(x, y - 8 - tk2 * 48, 44 - tk2 * 16, 12);
          glow(g, x, y - 30, 40, p.white ? GILT_LIT : CARD_RED, 0.08 * (1 - tk2), 3);
        }
      }
    },

    drawHud(g, time) {
      // The Arbiter's score-sheet: one carved icon per piece in its coat, and the move clock.
      const n = pieces.length;
      const x0 = W / 2 - (n - 1) * 17;
      const y = top + 26;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 26, y - 26, (n - 1) * 34 + 52, 46, 8);
      pieces.forEach((p, i) => {
        const x = x0 + i * 34;
        const checking = checks.some((ch) => ch.piece === p && !ch.fired);
        if (checking) { g.lineStyle(2, p.white ? GILT_LIT : CARD_RED, 0.6 + 0.4 * Math.sin(time / 70)); g.strokeCircle(x, y - 6, 15); }
        chessPiece(g, x, y + 8, p.kind, p.white, 0.55);
      });
      const left = clamp((nextMove - time) / MOVE_MS, 0, 1);
      g.fillStyle(GILT_DARK, 0.8); g.fillRect(x0 - 18, y + 14, (n - 1) * 34 + 36, 3);
      g.fillStyle(MIND_LIT, 0.9); g.fillRect(x0 - 18, y + 14, ((n - 1) * 34 + 36) * (1 - left), 3);
    },

    destroy() { for (const p of pieces) p.target?.remove(); },
  };
}

export const FALLEN_CHECK: GimmickDef = {
  id: ID,
  rules: 'Living pieces give check: their lines strike the enemy king. Black hunts you, white him. Strike a piece to turn its coat. At half, a queen.',
  make,
};
