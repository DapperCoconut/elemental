import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { boardLetters, planchette, spiritBoard, strokeText } from '../art';
import { GILT_LIT, MIND, MIND_LIT } from '../palette';
import { alive, clamp, dist, ease, stepDt } from '../util';

/**
 * Mind Reader — Medium Ouija.
 *
 * A spirit board fills the parlour floor, its alphabet in two arcs. A planchette glides over it
 * on its own, spelling a word letter by letter (the word builds on the HUD). Each letter it stops
 * on lights up, smoulders for a moment, and then fires a bolt at *whoever stands nearest it*.
 *
 * Ouija reads where the planchette will stop, and steps away from the letter before it gets
 * there — but the planchette's tip points the way it is heading, so you can read it too: keep
 * her between you and the letter. And it can be struck: knock the planchette and it skips on to
 * the letter nearest the striker's foe.
 */

const BOARD = { x: 480, y: 384, w: 840, h: 460 };
const WORDS = ['HOUSE', 'BLUFF', 'DRAW', 'GAMBIT', 'RIGGED', 'TELL', 'SEEN', 'LOTS', 'WHEEL'];
const REST_MS = 520;
const NUDGE_CD = 2600;

interface Lit { idx: number; at: number; fireAt: number; fired: boolean; hitX: number; hitY: number; firedAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const letters = boardLetters(BOARD.x, BOARD.y, BOARD.w, BOARD.h);
  const glideMs = ctx.hard ? 1250 : 1600;
  const fuseMs = ctx.hard ? 950 : 1150;
  const dmg = ctx.hard ? 14 : 12;
  let word = WORDS[Math.floor(rng() * WORDS.length)];
  let charIdx = 0;
  let spelled = '';
  /** Planchette: gliding from `from` to letter `to`, or resting on it. */
  const pl = { x: BOARD.x, y: BOARD.y, fromX: BOARD.x, fromY: BOARD.y, to: -1, startAt: 0, restUntil: 0, angle: 0, nudgedAt: -9999 };
  const lits: Lit[] = [];
  let target: StrikeTarget | null = null;
  let started = false;

  const letterOf = (ch: string) => clamp(ch.charCodeAt(0) - 65, 0, 25);
  const nearestLetter = (x: number, y: number) => {
    let best = 0, bd = Infinity;
    letters.forEach((p, i) => { const d = dist(p.x, p.y, x, y); if (d < bd) { bd = d; best = i; } });
    return best;
  };

  function glideTo(idx: number, time: number): void {
    pl.fromX = pl.x; pl.fromY = pl.y;
    pl.to = idx;
    pl.startAt = time;
    pl.restUntil = 0;
  }

  function nextLetter(time: number): void {
    if (charIdx >= word.length) {
      ctx.float(BOARD.x, top + 40, word, '#e2ccff');
      ctx.sfx('hush');
      let w = word;
      while (w === word) w = WORDS[Math.floor(rng() * WORDS.length)];
      word = w; charIdx = 0; spelled = '';
    }
    glideTo(letterOf(word[charIdx]), time);
  }

  function arrive(time: number): void {
    const idx = pl.to;
    lits.push({ idx, at: time, fireAt: time + fuseMs, fired: false, hitX: 0, hitY: 0, firedAt: 0 });
    spelled += String.fromCharCode(65 + idx);
    charIdx++;
    pl.restUntil = time + REST_MS;
    ctx.sfx('crystal-chime');
  }

  function fire(l: Lit, time: number): void {
    l.fired = true;
    l.firedAt = time;
    const p = letters[l.idx];
    const cands: Fighter[] = [player, npc].filter(alive);
    if (!cands.length) return;
    cands.sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y));
    const f = cands[0];
    l.hitX = f.x; l.hitY = f.y;
    ctx.hit(f, dmg, f.x, f.y);
    ctx.flash(f.x, f.y, MIND);
    ctx.sfx('zap');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        target = ctx.target({
          x: pl.x, y: pl.y, r: 30, passThrough: true,
          onStruck: (by) => {
            const now = ctx.scene.time.now;
            if (now - pl.nudgedAt < NUDGE_CD || pl.to < 0) return;
            pl.nudgedAt = now;
            // Skip on to the letter nearest the striker's foe.
            const foe = by === 'player' ? npc : player;
            const idx = nearestLetter(foe.x, foe.y);
            glideTo(idx, now);
            ctx.float(pl.x, pl.y - 30, 'NUDGED', '#e2ccff');
            ctx.sfx('whoosh');
          },
        });
        nextLetter(time + 600);
        pl.startAt = time + 600;
      }
      // Glide, or rest.
      if (pl.restUntil > 0) {
        if (time >= pl.restUntil) nextLetter(time);
      } else if (pl.to >= 0 && time >= pl.startAt) {
        const k = clamp((time - pl.startAt) / glideMs, 0, 1);
        const e = ease(k);
        const L = letters[pl.to];
        // Doubled letters: a little loop round and back.
        const loop = dist(pl.fromX, pl.fromY, L.x, L.y) < 4 ? Math.sin(k * Math.PI) * 60 : 0;
        pl.x = pl.fromX + (L.x - pl.fromX) * e + loop;
        pl.y = pl.fromY + (L.y + 34 - pl.fromY) * e - loop * 0.5;
        const want = loop ? k * Math.PI * 2 : Math.atan2(L.y - pl.y, L.x - pl.x);
        if (dist(pl.x, pl.y, L.x, L.y + 34) > 6 || loop) pl.angle = want;
        if (k >= 1) arrive(time);
      }
      target?.moveTo(pl.x, pl.y);
      for (const l of lits) if (!l.fired && time >= l.fireAt) fire(l, time);
      for (let i = lits.length - 1; i >= 0; i--) if (lits[i].fired && time - lits[i].firedAt > 900) lits.splice(i, 1);
    },

    npcSeek() {
      // She reads where it will stop: be farther from that letter than you are.
      const pending = lits.find((l) => !l.fired);
      const idx = pending ? pending.idx : pl.to;
      if (idx < 0 || !alive(player)) return null;
      const L = letters[idx];
      const dx = player.x - L.x, dy = player.y - L.y;
      const d = Math.hypot(dx, dy) || 1;
      const x = player.x + (dx / d) * 200, y = player.y + (dy / d) * 200;
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      spiritBoard(g, BOARD.x, BOARD.y, BOARD.w, BOARD.h, 1, 26);
      // Smouldering letters: a ring closing on each as its fuse burns.
      for (const l of lits) {
        const p = letters[l.idx];
        if (!l.fired) {
          const k = clamp((time - l.at) / Math.max(1, l.fireAt - l.at), 0, 1);
          glow(g, p.x, p.y, 34, MIND, 0.06 + k * 0.08, 3);
          g.lineStyle(3, MIND_LIT, 0.4 + k * 0.5); g.strokeCircle(p.x, p.y, 54 - k * 34);
          strokeText(g, String.fromCharCode(65 + l.idx), p.x, p.y, 26, lit(MIND, 0.4), 1, 3);
        } else {
          const k = clamp((time - l.firedAt) / 900, 0, 1);
          strokeText(g, String.fromCharCode(65 + l.idx), p.x, p.y, 26, MIND, 1 - k, 3);
        }
      }
      // The reading: in the first part of a glide, a faint thread from the window to the letter.
      if (!ctx.hard && pl.to >= 0 && pl.restUntil === 0 && time >= pl.startAt) {
        const k = (time - pl.startAt) / glideMs;
        if (k < 0.45) {
          const L = letters[pl.to];
          const n = 10;
          for (let i = 1; i < n; i++) {
            const t = i / n;
            g.fillStyle(MIND_LIT, 0.35 * (1 - k / 0.45)); g.fillCircle(pl.x + (L.x - pl.x) * t, pl.y + (L.y - pl.y) * t, 2);
          }
        }
      }
    },

    drawAir(g, time) {
      const resting = pl.restUntil > 0;
      planchette(g, pl.x, pl.y, 22, pl.angle, resting ? 1 : 0.4 + Math.sin(time / 120) * 0.2);
      // Bolts from fired letters.
      for (const l of lits) {
        if (!l.fired) continue;
        const k = (time - l.firedAt) / 260;
        if (k > 1) continue;
        const p = letters[l.idx];
        const pts: Pt[] = [];
        for (let i = 0; i <= 6; i++) {
          const t = i / 6;
          const j = i === 0 || i === 6 ? 0 : (Math.sin(i * 7.3 + l.firedAt) * 14);
          pts.push({ x: p.x + (l.hitX - p.x) * t + j, y: p.y + (l.hitY - p.y) * t - j * 0.5 });
        }
        g.lineStyle(4, MIND, 0.6 * (1 - k));
        for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
        g.lineStyle(1.5, 0xffffff, 1 - k);
        for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      }
    },

    drawHud(g) {
      // The word so far, and blanks for what is to come.
      const n = word.length;
      const cw = 22;
      const x0 = W / 2 - ((n - 1) * cw) / 2;
      const y = top + 16;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 20, y - 13, (n - 1) * cw + 40, 26, 8);
      for (let i = 0; i < n; i++) {
        const x = x0 + i * cw;
        if (i < spelled.length) strokeText(g, spelled[i], x, y, 14, GILT_LIT, 1, 2);
        else { g.lineStyle(2, MIND_LIT, 0.5); g.lineBetween(x - 6, y + 7, x + 6, y + 7); }
      }
    },

    destroy() { target?.remove(); target = null; },
  };
}

export const MIND_READER: GimmickDef = {
  id: 'mind-mind-reader',
  rules: 'The planchette spells a word. Each letter it stops on fires at whoever stands nearest it. Strike the planchette to send it toward your foe.',
  make,
};
