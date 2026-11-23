import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { INK, OBS, PAPER, PAPER_SHADE, VOICE, letter, word } from '../art';
import { type Who, WHO, alive, clamp, css, dist, fighterOf, other } from '../util';

/**
 * DECREE OF THE FAIR COPY — Councilor Errata Quire, Seat of the Word.
 *
 * He drafted the clause that fixes the Score's words: what is written is binding, and nobody adds
 * a word. In his room the law is a word, and the word is printed across the floor a letter to a
 * paper tile — KNEEL, HUSH, FINE, SING, OBEY. Each fighter copies it out on their own: walk over
 * its letters IN ORDER (your next letter is ringed in your colour). Whoever makes the fair copy
 * first, the word is done TO THE OTHER:
 *   KNEEL stuns · HUSH mutes · FINE fines (a heavy blow) · SING wrings the voice out over three
 *   beats · OBEY holds them and drags them to the writer.
 * Then the page turns and a new word is printed.
 *
 * BLOT: strike the tile your rival needs next and it is reprinted somewhere else on the page. He is
 * Paper — he rides planes across the floor faster than you can walk it — and he will blot the
 * last letter out from under your foot. Shoot his.
 */

const WORDS = ['KNEEL', 'HUSH', 'FINE', 'SING', 'OBEY'];
const TOUCH = 32;
const TURN_MS = 2600;
const BLOT_CD = 1400;

interface Tile { ch: string; x: number; y: number; rot: number; target: StrikeTarget | null; blotReady: number; blotFx: number }

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, rng } = ctx;
  const FINE = ctx.hard ? 28 : 24;
  let text = '';
  let lastWord = -1;
  let tiles: Tile[] = [];
  const prog: Record<Who, number> = { player: 0, npc: 0 };
  let pageAt = 0;
  let turning = true;
  let doneBy: Who | null = null;
  let doneFx = -9999;
  const singTicks: { at: number; who: Who }[] = [];
  let started = false;

  const spot = (avoid: Pt[]): Pt => {
    let best: Pt = { x: W / 2, y: (top + H) / 2 }, bs = -1;
    for (let i = 0; i < 24; i++) {
      const c = { x: 100 + rng() * (W - 200), y: top + 70 + rng() * (H - top - 130) };
      const s = avoid.reduce((m, a) => Math.min(m, dist(a.x, a.y, c.x, c.y)), 999);
      if (s > 150) return c;
      if (s > bs) { bs = s; best = c; }
    }
    return best;
  };

  const clear = () => { for (const t of tiles) t.target?.remove(); tiles = []; };

  const blot = (i: number, by: Who) => {
    const t = tiles[i];
    const now = ctx.scene.time.now;
    if (!t || turning || now < t.blotReady || prog[other(by)] !== i) return;
    t.blotReady = now + BLOT_CD;
    t.blotFx = now;
    const p = spot([...tiles.filter((u) => u !== t).map((u): Pt => ({ x: u.x, y: u.y })), { x: ctx.player.x, y: ctx.player.y }, { x: ctx.npc.x, y: ctx.npc.y }]);
    t.x = p.x; t.y = p.y; t.rot = (rng() - 0.5) * 0.4;
    t.target?.moveTo(p.x, p.y);
    ctx.float(p.x, p.y - 36, 'BLOTTED — REPRINTED', css(by));
    ctx.sfx('trap-snap');
  };

  const print = () => {
    clear();
    let i = Math.floor(rng() * WORDS.length);
    if (i === lastWord) i = (i + 1) % WORDS.length;
    lastWord = i;
    text = WORDS[i];
    const avoid: Pt[] = [fighterOf(ctx, 'player'), fighterOf(ctx, 'npc')];
    for (let k = 0; k < text.length; k++) {
      const p = spot(avoid);
      avoid.push(p);
      const tile: Tile = { ch: text[k], x: p.x, y: p.y, rot: (rng() - 0.5) * 0.4, target: null, blotReady: 0, blotFx: -9999 };
      const idx = k;
      tile.target = ctx.target({ x: p.x, y: p.y, r: 24, passThrough: true, onStruck: (by) => blot(idx, by) });
      tiles.push(tile);
    }
    prog.player = 0; prog.npc = 0;
    turning = false;
    doneBy = null;
    ctx.banner(`THE WORD IS ${text}`, '#ffe8d0');
    ctx.sfx('whoosh');
  };

  const enact = (w: Who, time: number) => {
    const o = other(w);
    const f = fighterOf(ctx, o);
    const writer = fighterOf(ctx, w);
    doneBy = w; doneFx = time; turning = true; pageAt = time + TURN_MS;
    ctx.banner(`${w === 'player' ? 'YOUR' : 'HIS'} FAIR COPY — ${text}`, css(w));
    ctx.sfx('judgement');
    if (!alive(f)) return;
    switch (text) {
      case 'KNEEL': ctx.stun(f, 1400); ctx.float(f.x, f.y - 52, 'KNEEL', css(w)); break;
      case 'HUSH': ctx.silence(f, 3200); ctx.float(f.x, f.y - 52, 'HUSH', css(w)); break;
      case 'FINE': ctx.hit(f, FINE, f.x, f.y); ctx.float(f.x, f.y - 52, 'FINED', css(w)); break;
      case 'SING': for (let i = 1; i <= 3; i++) singTicks.push({ at: time + i * 1000, who: o }); ctx.float(f.x, f.y - 52, 'SING', css(w)); break;
      case 'OBEY': {
        ctx.root(f, 1800);
        const dx = writer.x - f.x, dy = writer.y - f.y;
        const d = Math.hypot(dx, dy) || 1;
        const pull = Math.min(220, Math.max(0, d - 70));
        ctx.nudge(f, (dx / d) * pull, (dy / d) * pull);
        ctx.float(f.x, f.y - 52, 'OBEY', css(w));
        break;
      }
    }
  };

  return {
    update(time) {
      if (!started) { started = true; pageAt = time + 1800; }
      if (turning) { if (time >= pageAt) print(); }
      else {
        for (const w of WHO) {
          const f = fighterOf(ctx, w);
          if (!alive(f)) continue;
          const t = tiles[prog[w]];
          if (t && dist(f.x, f.y, t.x, t.y) < TOUCH) {
            prog[w]++;
            ctx.sfx('sparkle');
            if (prog[w] >= tiles.length) { enact(w, time); break; }
          }
        }
      }
      for (let i = singTicks.length - 1; i >= 0; i--) {
        if (time < singTicks[i].at) continue;
        const f = fighterOf(ctx, singTicks[i].who);
        if (alive(f)) { ctx.hit(f, 8, f.x, f.y - 20); ctx.float(f.x, f.y - 46, '♪', '#ffd2ec'); }
        singTicks.splice(i, 1);
      }
    },

    npcSeek(): Pt | null {
      if (turning) return null;
      const n = ctx.npc;
      const mine = tiles[prog.npc];
      const yours = tiles[prog.player];
      // You are one letter from done: blot it out from under you.
      if (yours && prog.player >= tiles.length - 1 && prog.npc < tiles.length - 1 && ctx.scene.time.now >= yours.blotReady) {
        return { x: yours.x, y: yours.y };
      }
      if (mine) return { x: clamp(mine.x, 40, W - 40), y: clamp(mine.y, top + 30, H - 30) };
      return { x: n.x, y: n.y };
    },

    drawGround(g, time) {
      const pg = time - doneFx;
      if (pg < TURN_MS && doneBy) {
        // The page turning: a pale sweep crossing the floor.
        const k = pg / TURN_MS;
        const x = -100 + k * (W + 200);
        g.fillStyle(PAPER, 0.08); g.fillRect(x - 160, top, 160, H - top);
        g.lineStyle(3, PAPER, 0.4); g.lineBetween(x, top, x - 40, H);
      }
      if (turning) return;
      tiles.forEach((t, i) => {
        const pNext = prog.player === i, nNext = prog.npc === i;
        const pDone = prog.player > i, nDone = prog.npc > i;
        const fade = pDone && nDone ? 0.35 : 1;
        const c = Math.cos(t.rot), s = Math.sin(t.rot);
        const corner = (dx: number, dy: number) => ({ x: t.x + dx * c - dy * s, y: t.y + dx * s + dy * c });
        const pts = [corner(-20, -23), corner(20, -23), corner(20, 23), corner(-20, 23)];
        g.fillStyle(0x000000, 0.35 * fade); g.fillEllipse(t.x + 3, t.y + 26, 44, 10);
        g.fillStyle(PAPER_SHADE, fade); g.fillTriangle(pts[0].x + 2, pts[0].y + 3, pts[2].x + 2, pts[2].y + 3, pts[3].x + 2, pts[3].y + 3);
        g.fillStyle(PAPER, fade);
        g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
        g.fillTriangle(pts[0].x, pts[0].y, pts[2].x, pts[2].y, pts[3].x, pts[3].y);
        letter(g, t.ch, t.x, t.y, 26, 3.4, INK, 0.9 * fade);
        // Order dots along the bottom: which letter of the word this is.
        for (let d = 0; d <= i; d++) { g.fillStyle(INK, 0.5 * fade); g.fillCircle(t.x - i * 3 + d * 6, t.y + 18, 1.3); }
        if (pNext) { g.lineStyle(3, VOICE, 0.9); g.strokeCircle(t.x, t.y, 32 + Math.sin(time / 160) * 2); }
        if (nNext) { g.lineStyle(3, OBS.seamLit, 0.9); g.strokeCircle(t.x, t.y, 38 + Math.cos(time / 160) * 2); }
        if (pDone && !nDone) { g.fillStyle(VOICE, 0.8); g.fillCircle(t.x + 16, t.y - 18, 4); }
        if (nDone && !pDone) { g.fillStyle(OBS.seamLit, 0.8); g.fillCircle(t.x - 16, t.y - 18, 4); }
        const b = time - t.blotFx;
        if (b < 500) { g.fillStyle(INK, 0.6 * (1 - b / 500)); g.fillCircle(t.x, t.y, 30 * (b / 500) + 10); }
      });
      // A thread from each fighter to their next letter.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        const t = tiles[prog[w]];
        if (!alive(f) || !t) continue;
        g.lineStyle(1.2, w === 'player' ? VOICE : OBS.seamLit, 0.25); g.lineBetween(f.x, f.y, t.x, t.y);
      }
    },

    drawHud(g, time) {
      if (!text) return;
      const cx = W / 2, cy = top + 26;
      const wd = text.length * 30 + 40;
      g.fillStyle(PAPER, 0.92); g.fillRoundedRect(cx - wd / 2, cy - 22, wd, 50, 4);
      g.lineStyle(1.5, PAPER_SHADE, 1); g.strokeRoundedRect(cx - wd / 2, cy - 22, wd, 50, 4);
      word(g, text, cx, cy, 24, 3, INK, 1, (i) => (prog.player > i && prog.npc > i ? 0x6a4a6a : INK));
      const step = 24 * 0.95, x0 = cx - ((text.length - 1) * step) / 2;
      for (let i = 0; i < text.length; i++) {
        g.fillStyle(prog.player > i ? VOICE : 0xd8ccb0, 1); g.fillRect(x0 + i * step - 8, cy + 16, 16, 3);
        g.fillStyle(prog.npc > i ? OBS.seam : 0xd8ccb0, 1); g.fillRect(x0 + i * step - 8, cy + 21, 16, 3);
      }
      if (doneBy && time - doneFx < TURN_MS) {
        g.lineStyle(3, doneBy === 'player' ? VOICE : OBS.seam, 0.9);
        g.lineBetween(cx - wd / 2 + 8, cy + 12, cx + wd / 2 - 8, cy - 12);
      }
    },

    destroy() { clear(); },
  };
};

export const FAIR_COPY: GimmickDef = {
  id: 'bench-sound-fair-copy',
  rules: 'What is written binds: copy the word out letter by letter, in order. The first fair copy is done to the other. Strike a rival\'s next letter to blot it.',
  make,
};
