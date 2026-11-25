import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { CARD_WHITE, CHALK, GILT_DARK, IVORY_DARK, MIND, MIND_DARK, MIND_LIT, WOOD, WOOD_DARK, WOOD_LIT } from '../palette';
import { alive, clamp, dist, segDist } from '../util';

/**
 * The Sending — Zillah Pocklington, Sender at the Thought Exchange, who tested the readers: she
 * sat behind a screen turning the five plain cards (circle, cross, waves, square, star) and
 * "sent" them, and any reader who guessed below chance was struck off the House's books. In the
 * King's telling she chose which readers failed.
 *
 * The five symbols are chalked huge across the yard, overlapping here and there. Every few
 * seconds she sends one: a card hangs over her head and the symbol draws itself on it stroke by
 * stroke — and when it is whole, that figure's chalk lines burn wherever they run. She always
 * sends the figure lying nearest you. A circle and the first arc of a wave look alike for a
 * moment; a cross and a star share a first stroke. Read the card early and get off those lines.
 *
 * The exploit is the force, the mentalist's oldest trick: five easels at the yard's edge each
 * show one card. Strike an easel while she is sending and her card wipes and redraws as that
 * symbol — so force the figure *she* is standing on. One force a sending. Halfway down she sends
 * two cards at once.
 */

const ID = fallenId('mind', 'sending');
const SEND_EVERY = 4300;
const DRAW_MS = 2300;
const FORCED_MS = 1150;
const BURN_MS = 480;
const ON_LINE = 30;

type Sym = 'circle' | 'cross' | 'waves' | 'square' | 'star';
const SYMS: Sym[] = ['circle', 'cross', 'waves', 'square', 'star'];

/** Each symbol as polylines in a unit box (-1..1), in the order a hand would draw it. */
function glyph(s: Sym): Pt[][] {
  if (s === 'circle') return [Array.from({ length: 33 }, (_, i) => ({ x: Math.sin((i / 32) * Math.PI * 2), y: -Math.cos((i / 32) * Math.PI * 2) }))];
  if (s === 'cross') return [[{ x: 0, y: -1 }, { x: 0, y: 1 }], [{ x: -1, y: 0 }, { x: 1, y: 0 }]];
  if (s === 'square') return [[{ x: -0.8, y: -0.8 }, { x: 0.8, y: -0.8 }, { x: 0.8, y: 0.8 }, { x: -0.8, y: 0.8 }, { x: -0.8, y: -0.8 }]];
  if (s === 'waves') {
    return [-0.55, 0, 0.55].map((yy) => Array.from({ length: 25 }, (_, i) => ({ x: -1 + i / 12, y: yy + Math.sin((i / 24) * Math.PI * 4) * 0.2 })));
  }
  const v = [0, 2, 4, 1, 3, 0].map((i) => ({ x: Math.sin((i / 5) * Math.PI * 2), y: -Math.cos((i / 5) * Math.PI * 2) }));
  return [v];
}

/** Draw the first `k` (0..1) of a glyph's total stroke length, mapped by `map`. */
function drawPartial(g: G, lines: Pt[][], k: number, map: (p: Pt) => Pt, w: number, color: number, a: number): void {
  let total = 0;
  for (const l of lines) for (let i = 1; i < l.length; i++) total += Math.hypot(l[i].x - l[i - 1].x, l[i].y - l[i - 1].y);
  let left = total * k;
  g.lineStyle(w, color, a);
  for (const l of lines) {
    for (let i = 1; i < l.length && left > 0; i++) {
      const seg = Math.hypot(l[i].x - l[i - 1].x, l[i].y - l[i - 1].y);
      const t = Math.min(1, left / seg);
      const p0 = map(l[i - 1]);
      const p1 = map({ x: l[i - 1].x + (l[i].x - l[i - 1].x) * t, y: l[i - 1].y + (l[i].y - l[i - 1].y) * t });
      g.lineBetween(p0.x, p0.y, p1.x, p1.y);
      left -= seg;
    }
  }
}

interface Figure { sym: Sym; cx: number; cy: number; sx: number; sy: number; lines: Pt[][] }
interface Send { sym: Sym; at: number; fireAt: number; forced: boolean; fired: boolean }
interface Easel { sym: Sym; x: number; y: number; target: StrikeTarget | null; struckAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const placed: Record<Sym, [number, number, number, number]> = {
    circle: [230, top + 155, 88, 88],
    cross: [730, top + 150, 110, 108],
    waves: [480, top + 380, 150, 62],
    square: [760, top + 410, 95, 95],
    star: [220, top + 410, 105, 105],
  };
  const figures: Figure[] = SYMS.map((sym) => {
    const [cx, cy, sx, sy] = placed[sym];
    const lines = glyph(sym).map((l) => l.map((p) => ({ x: cx + p.x * sx, y: cy + p.y * sy })));
    return { sym, cx, cy, sx, sy, lines };
  });
  const figOf = (s: Sym) => figures.find((f) => f.sym === s) as Figure;
  const lineDist = (fig: Figure, x: number, y: number) => {
    let best = 1e9;
    for (const l of fig.lines) for (let i = 1; i < l.length; i++) best = Math.min(best, segDist(x, y, l[i - 1].x, l[i - 1].y, l[i].x, l[i].y));
    return best;
  };
  const easelSpots: [Sym, number, number][] = [
    ['circle', 480, top + 46], ['cross', 905, top + 46], ['waves', 480, H - 30], ['square', 905, H - 30], ['star', 50, top + 270],
  ];
  const easels: Easel[] = easelSpots.map(([sym, x, y]) => ({ sym, x, y, target: null, struckAt: -1e9 }));

  const sends: Send[] = [];
  let nextSend = 0;
  let started = false;
  let two = false;

  /** The figures nearest the player, nearest first. */
  const nearestToPlayer = () => [...figures].sort((a, b) => lineDist(a, player.x, player.y) - lineDist(b, player.x, player.y));

  function force(e: Easel, by: 'player' | 'npc'): void {
    const time = ctx.scene.time.now;
    const live = sends.filter((s) => !s.fired && !s.forced && time < s.fireAt - 150);
    if (!live.length) return;
    const s = live[0];
    if (sends.some((o) => o !== s && !o.fired && o.sym === e.sym)) return;
    s.sym = e.sym;
    s.forced = true;
    s.at = time;
    s.fireAt = Math.max(s.fireAt, time + tk.warn(FORCED_MS));
    e.struckAt = time;
    ctx.sfx('snap-back');
    ctx.flash(e.x, e.y - 40, by === 'player' ? MIND_LIT : MIND);
  }

  function burn(s: Send): void {
    s.fired = true;
    const fig = figOf(s.sym);
    ctx.sfx('plasma-arc');
    const hurt = (f: Fighter) => alive(f) && lineDist(fig, f.x, f.y) < ON_LINE;
    if (hurt(player)) tk.hitPlayer(22, player.x, player.y);
    if (hurt(npc)) { ctx.hit(npc, 32, npc.x, npc.y); ctx.flash(npc.x, npc.y, MIND_LIT); }
  }

  return {
    update(time) {
      if (!started) {
        started = true;
        nextSend = time + 2500;
        for (const e of easels) e.target = ctx.target({ x: e.x, y: e.y - 34, r: 26, onStruck: (by) => force(e, by) });
      }
      if (!two && npc.hp < npc.maxHp * 0.5) { two = true; ctx.banner('TWO CARDS AT ONCE', '#e2ccff'); ctx.sfx('curse-cast'); }
      if (time >= nextSend && alive(npc)) {
        const near = nearestToPlayer();
        const n = two ? 2 : 1;
        for (let i = 0; i < n; i++) sends.push({ sym: near[i].sym, at: time, fireAt: time + tk.warn(DRAW_MS) + i * 250, forced: false, fired: false });
        nextSend = time + SEND_EVERY;
        ctx.sfx('beam-charge');
      }
      for (const s of sends) if (!s.fired && time >= s.fireAt) burn(s);
      for (let i = sends.length - 1; i >= 0; i--) if (sends[i].fired && time > sends[i].fireAt + BURN_MS) sends.splice(i, 1);
    },

    npcSeek() {
      if (!alive(npc)) return null;
      const time = ctx.scene.time.now;
      const live = sends.filter((s) => !s.fired || time < s.fireAt + 100);
      const risky = (x: number, y: number) => live.some((s) => lineDist(figOf(s.sym), x, y) < ON_LINE + 34);
      if (!live.length || !risky(npc.x, npc.y)) return null;
      let best: Pt | null = null, bd = 1e9;
      for (let a = 0; a < 16; a++) for (const r of [60, 110, 170]) {
        const x = clamp(npc.x + Math.cos((a / 16) * Math.PI * 2) * r, 50, W - 50);
        const y = clamp(npc.y + Math.sin((a / 16) * Math.PI * 2) * r, top + 40, H - 40);
        if (risky(x, y)) continue;
        const d = r + dist(x, y, player.x, player.y) * 0.15;
        if (d < bd) { bd = d; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // The five figures in chalk: a doubled, dusty line, as if dragged on with a block.
      for (const fig of figures) {
        const s = sends.find((x) => x.sym === fig.sym);
        let col = CHALK, a = 0.32, w = 5;
        if (s) {
          const k = clamp((time - s.at) / Math.max(1, s.fireAt - s.at), 0, 1);
          if (time >= s.fireAt) {
            const bk = 1 - clamp((time - s.fireAt) / BURN_MS, 0, 1);
            col = MIND_LIT; a = 0.5 + 0.5 * bk; w = 10 + 14 * bk;
          } else if (k > 0.6) {
            col = MIND; a = 0.35 + 0.5 * ((k - 0.6) / 0.4); w = 6 + 4 * ((k - 0.6) / 0.4);
          }
        }
        for (const l of fig.lines) {
          g.lineStyle(w + 6, col, a * 0.25);
          for (let i = 1; i < l.length; i++) g.lineBetween(l[i - 1].x, l[i - 1].y, l[i].x, l[i].y);
          g.lineStyle(w, col, a);
          for (let i = 1; i < l.length; i++) g.lineBetween(l[i - 1].x, l[i - 1].y, l[i].x, l[i].y);
          g.lineStyle(1.5, CARD_WHITE, a * 0.7);
          for (let i = 1; i < l.length; i++) g.lineBetween(l[i - 1].x + 2, l[i - 1].y - 1, l[i].x + 2, l[i].y - 1);
        }
        // Chalk dust at the figure's heart.
        for (let i = 0; i < 6; i++) {
          const ang = i * 2.4 + fig.cx;
          g.fillStyle(CHALK, 0.18); g.fillCircle(fig.cx + Math.cos(ang) * 14 * (i % 3), fig.cy + Math.sin(ang) * 9 * (i % 3), 2);
        }
        if (s && time >= s.fireAt) {
          const bk = 1 - clamp((time - s.fireAt) / BURN_MS, 0, 1);
          glow(g, fig.cx, fig.cy, Math.max(fig.sx, fig.sy) + 30, MIND_LIT, 0.06 * bk, 3);
        }
      }
    },

    drawAir(g, time) {
      // The easels at the yard's edge, each with its card on the ledge.
      for (const e of easels) {
        const x = e.x, y = e.y;
        shadow(g, x, y + 1, 44, 12, 0.3);
        g.lineStyle(3, WOOD_DARK, 1);
        g.lineBetween(x - 16, y, x - 4, y - 70); g.lineBetween(x + 16, y, x + 4, y - 70); g.lineBetween(x, y + 2, x, y - 64);
        g.fillStyle(WOOD, 1); g.fillRect(x - 20, y - 26, 40, 4);
        g.fillStyle(WOOD_LIT, 1); g.fillRect(x - 20, y - 26, 40, 1.5);
        const flash = clamp(1 - (time - e.struckAt) / 500, 0, 1);
        g.fillStyle(CARD_WHITE, 1); g.fillRoundedRect(x - 16, y - 66, 32, 40, 3);
        g.lineStyle(1, IVORY_DARK, 1); g.strokeRoundedRect(x - 16, y - 66, 32, 40, 3);
        drawPartial(g, glyph(e.sym), 1, (p) => ({ x: x + p.x * 10, y: y - 46 + p.y * 12 }), 2.5, MIND_DARK, 1);
        if (flash > 0) glow(g, x, y - 46, 30, MIND_LIT, 0.14 * flash, 3);
      }
      // Her cards, drawing themselves over her head.
      if (!alive(npc)) return;
      const live = sends.filter((s) => time < s.fireAt + BURN_MS);
      live.forEach((s, i) => {
        const off = live.length > 1 ? (i - 0.5) * 58 : 0;
        const x = npc.x + off, y = npc.y - 98;
        const k = clamp((time - s.at) / Math.max(1, s.fireAt - s.at), 0, 1);
        g.lineStyle(1, GILT_DARK, 0.6); g.lineBetween(npc.x, npc.y - 40, x, y + 30);
        glow(g, x, y, 34, MIND, 0.05 + 0.06 * k, 2);
        g.fillStyle(CARD_WHITE, 1); g.fillRoundedRect(x - 22, y - 30, 44, 60, 4);
        g.lineStyle(2, s.forced ? MIND : IVORY_DARK, 1); g.strokeRoundedRect(x - 22, y - 30, 44, 60, 4);
        drawPartial(g, glyph(s.sym), k, (p) => ({ x: x + p.x * 15, y: y + p.y * 19 }), 3.5, MIND_DARK, 1);
        // The pen nib, where the next stroke is coming from.
        if (k < 1) { g.fillStyle(MIND_LIT, 0.6 + 0.4 * Math.sin(time / 60)); g.fillCircle(x + 17, y + 25, 2.5); }
      });
    },

    drawHud(g, time) {
      // The Sender's screen: five card backs, the one being sent lit, the clock to the next.
      const x0 = W / 2 - 2 * 30, y = top + 24;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 22, y - 22, 4 * 30 + 44, 44, 8);
      SYMS.forEach((sym, i) => {
        const x = x0 + i * 30;
        const lit = sends.some((s) => s.sym === sym && time < s.fireAt);
        g.fillStyle(lit ? CARD_WHITE : 0x3a3446, 1); g.fillRoundedRect(x - 10, y - 14, 20, 26, 2);
        drawPartial(g, glyph(sym), 1, (p) => ({ x: x + p.x * 6.5, y: y - 1 + p.y * 8 }), 1.6, lit ? MIND_DARK : 0x8a8098, 1);
      });
      const left = clamp((nextSend - time) / SEND_EVERY, 0, 1);
      g.fillStyle(MIND_LIT, 0.85); g.fillRect(x0 - 14, y + 17, (4 * 30 + 28) * (1 - left), 2);
    },

    destroy() { for (const e of easels) e.target?.remove(); },
  };
}

export const FALLEN_SENDING: GimmickDef = {
  id: ID,
  rules: 'She sends a symbol, drawing it stroke by stroke over her head; whole, that chalk figure burns. Read it early. Strike an easel to force her card.',
  make,
};
