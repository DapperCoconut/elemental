import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRASS, BRASS_LIT, FILINGS, FILINGS_LIT, IRON, IRON_DARK, IRON_LIT, MAGNETITE, MAGNETITE_LIT, RUST, RUST_LIT, SLATE_DEEP, SPARK } from '../palette';
import { alive, clamp, dist, segDist } from '../util';

/**
 * Lost Iron — Stone-Picker Grusha Keddle, who picks the lost iron off the great lodestone's fur
 * and, in the King's telling, sold every key she found back to the Prince's bailiffs.
 *
 * The lodestone's foot looms over the north edge of the yard, furred a foot deep with everything
 * iron the crag ever lost: nails, keys, buckles, hinges, horseshoes. Loose iron lies about the floor.
 * Every few seconds the stone *tugs* — every scrap trembles, a line of filings stands up from it
 * to the stone — and then all of it tears home in a straight line, cutting whoever is in the way.
 *
 * Grusha scatters scrap around you. And every hard blow a fighter takes shakes iron off them where
 * they stand — so a fighter who has just been hurt is standing on the start of a line. Move off it.
 * Strike a scrap to kick it away from you: lay it so its line runs through her. Past half the
 * stone is greedy: it tugs more often and blows shake loose twice the iron.
 */

const ID = fallenId('lodestar', 'lost-iron');
const MAX_SCRAP = 12;
const CUT_DMG = 8;
const FLY = 560;
const WARN_MS = 1150;
const LINE_HALF = 16;

type Kind = 'nail' | 'key' | 'shoe' | 'buckle' | 'hinge';
const KINDS: Kind[] = ['nail', 'key', 'shoe', 'buckle', 'hinge'];
interface Scrap {
  x: number; y: number; kind: Kind; rot: number;
  t: StrikeTarget | null;
  /** Flight: start point and when it left; null while lying. */
  from: Pt | null; leftAt: number;
  struck: Set<Fighter>;
  gone: boolean;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const STONE: Pt = { x: W / 2, y: top + 6 };
  let scraps: Scrap[] = [];
  let tugWarnAt = 0;
  let tugAt = 0;
  let nextTug = 0;
  let started = false;
  const shookAt = new Map<Fighter, number>();

  const half = () => npc.hp < npc.maxHp * 0.5;
  const hurt = (f: Fighter, n: number) => { if (f === player) tk.hitPlayer(n, f.x, f.y); else ctx.hit(f, n, f.x, f.y); };
  const lying = () => scraps.filter((s) => !s.from && !s.gone);

  function drop(x: number, y: number): void {
    if (lying().length >= MAX_SCRAP) return;
    const s: Scrap = {
      x: clamp(x, 50, W - 50), y: clamp(y, top + 90, H - 30), kind: KINDS[Math.floor(rng() * KINDS.length)], rot: rng() * Math.PI * 2,
      t: null, from: null, leftAt: 0, struck: new Set(), gone: false,
    };
    s.t = ctx.target({
      x: s.x, y: s.y, r: 18, passThrough: true,
      onStruck: (by) => {
        if (s.from || s.gone) return;
        const f = by === 'player' ? player : npc;
        const d = dist(f.x, f.y, s.x, s.y) || 1;
        s.x = clamp(s.x + ((s.x - f.x) / d) * 110, 50, W - 50);
        s.y = clamp(s.y + ((s.y - f.y) / d) * 110, top + 90, H - 30);
        s.t?.moveTo(s.x, s.y);
        ctx.sfx('clang');
      },
    });
    scraps.push(s);
  }

  /** Grusha's armful: a spray of scrap thrown down round a point. */
  function scatter(at: Pt, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, r = 70 + rng() * 80;
      drop(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r * 0.8);
    }
  }

  function shake(f: Fighter, amount: number): void {
    const time = ctx.scene.time.now;
    if (amount < 6 || time < (shookAt.get(f) ?? 0)) return;
    shookAt.set(f, time + 900);
    const n = half() ? 2 : 1;
    for (let i = 0; i < n; i++) drop(f.x + (i ? 14 : -6), f.y + 10);
  }

  /** Position of a flying scrap. */
  const head = (s: Scrap, time: number): Pt => {
    const f = s.from as Pt;
    const len = dist(f.x, f.y, STONE.x, STONE.y) || 1;
    const k = clamp(((time - s.leftAt) / 1000) * FLY / len, 0, 1);
    return { x: f.x + (STONE.x - f.x) * k, y: f.y + (STONE.y - f.y) * k };
  };

  return {
    update(time) {
      if (!started) {
        started = true;
        scatter({ x: W / 2, y: (top + H) / 2 + 40 }, 6);
        nextTug = time + 4200;
      }
      if (!tugWarnAt && time >= nextTug) { tugWarnAt = time; tugAt = time + tk.warn(WARN_MS); ctx.sfx('magnet-pull'); }
      if (tugWarnAt && time >= tugAt) {
        tugWarnAt = 0;
        nextTug = time + (half() ? 4600 : 6200);
        for (const s of lying()) { s.from = { x: s.x, y: s.y }; s.leftAt = time; s.t?.remove(); s.t = null; }
        ctx.sfx('chain');
        tk.schedule(900, () => { scatter({ x: player.x, y: player.y }, half() ? 4 : 3); ctx.sfx('rock-throw'); });
      }
      for (const s of scraps) {
        if (!s.from || s.gone) continue;
        const p = head(s, time);
        for (const f of [player, npc]) {
          if (!alive(f) || s.struck.has(f)) continue;
          if (dist(p.x, p.y, f.x, f.y) < LINE_HALF + 16) { s.struck.add(f); hurt(f, CUT_DMG); ctx.sfx('slash'); }
        }
        if (dist(p.x, p.y, STONE.x, STONE.y) < 4) s.gone = true;
      }
      scraps = scraps.filter((s) => !s.gone);
      // The stone's foot is solid.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const d = dist(f.x, f.y, STONE.x, STONE.y);
        if (d < 110 && d > 0) ctx.nudge(f, ((f.x - STONE.x) / d) * (110 - d), ((f.y - STONE.y) / d) * (110 - d));
      }
    },

    onPlayerHurt(amount) { shake(player, amount); },
    onNpcHurt(amount) { shake(npc, amount); },

    npcSeek() {
      if (!alive(npc)) return null;
      const lines = lying();
      if (!lines.length) return null;
      const cut = (x: number, y: number) => {
        let m = Infinity;
        for (const s of lines) m = Math.min(m, segDist(x, y, s.x, s.y, STONE.x, STONE.y));
        return m;
      };
      // Warned: a spot clear of every line. Otherwise keep clear when it's cheap to.
      if (!tugWarnAt && cut(npc.x, npc.y) > LINE_HALF + 40) return null;
      let best: Pt | null = null, bs = -Infinity;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const x = clamp(npc.x + Math.cos(a) * 110, 60, W - 60), y = clamp(npc.y + Math.sin(a) * 110, top + 120, H - 40);
        const s = Math.min(cut(x, y), 90) * 3 - dist(x, y, player.x, player.y) * 0.05;
        if (s > bs) { bs = s; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      const warn = tugWarnAt ? clamp((time - tugWarnAt) / Math.max(1, tugAt - tugWarnAt), 0, 1) : 0;
      // Filings standing up along each scrap's line to the stone while the tug gathers.
      if (warn > 0) {
        for (const s of lying()) {
          const len = dist(s.x, s.y, STONE.x, STONE.y);
          const ang = Math.atan2(STONE.y - s.y, STONE.x - s.x);
          g.lineStyle(LINE_HALF * 2, FILINGS, 0.12 + warn * 0.2); g.lineBetween(s.x, s.y, STONE.x, STONE.y);
          for (let d = 14; d < len * warn; d += 9) {
            const x = s.x + Math.cos(ang) * d, y = s.y + Math.sin(ang) * d;
            const o = ((d * 7) % 11) - 5;
            g.lineStyle(1.3, (d | 0) % 3 ? FILINGS_LIT : IRON_LIT, 0.8);
            g.lineBetween(x - Math.sin(ang) * o, y + Math.cos(ang) * o, x - Math.sin(ang) * o + Math.cos(ang) * 4, y + Math.cos(ang) * o + Math.sin(ang) * 4 - 6 * warn);
          }
        }
      }
      for (const s of lying()) {
        const shiver = warn > 0 ? Math.sin(time / 25 + s.rot * 9) * 2 * warn : 0;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(s.x + 2, s.y + 4, 26, 8);
        drawScrap(g, s.x + shiver, s.y, s.kind, s.rot + shiver * 0.05, 1);
      }
      drawStoneFoot(g, STONE, time, warn);
    },

    drawAir(g, time) {
      for (const s of scraps) {
        if (!s.from) continue;
        const p = head(s, time);
        const f = s.from;
        const ang = Math.atan2(STONE.y - f.y, STONE.x - f.x);
        for (let i = 1; i < 5; i++) {
          g.fillStyle(SPARK, 0.5 - i * 0.1); g.fillCircle(p.x - Math.cos(ang) * i * 9, p.y - Math.sin(ang) * i * 9, 3 - i * 0.5);
        }
        drawScrap(g, p.x, p.y - 6, s.kind, ang + time / 40, 1.1);
      }
    },

    drawHud(g, time) {
      // The tug clock: a horseshoe magnet whose bar fills toward the next tug, red while it gathers.
      const x = W / 2, y = H - 24;
      g.fillStyle(SLATE_DEEP, 0.85); g.fillRoundedRect(x - 70, y - 14, 140, 26, 6);
      const span = half() ? 4600 : 6200;
      const k = tugWarnAt ? 1 : clamp(1 - (nextTug - time) / span, 0, 1);
      g.fillStyle(IRON_DARK, 1); g.fillRect(x - 40, y - 3, 96, 6);
      g.fillStyle(tugWarnAt ? RUST_LIT : MAGNETITE_LIT, 1); g.fillRect(x - 40, y - 3, 96 * k, 6);
      g.lineStyle(5, 0xe0383a, 1); g.beginPath(); g.arc(x - 54, y, 7, Math.PI / 2, Math.PI * 1.5); g.strokePath();
      g.lineStyle(5, IRON_LIT, 1); g.lineBetween(x - 54, y - 7, x - 46, y - 7); g.lineBetween(x - 54, y + 7, x - 46, y + 7);
    },

    destroy() { for (const s of scraps) s.t?.remove(); },
  };
}

/** The lodestone's foot: blue-black magnetite heaped at the north wall, furred with lost iron. */
function drawStoneFoot(g: G, p: Pt, time: number, warn: number): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(p.x, p.y + 70, 300, 70);
  g.fillStyle(MAGNETITE, 1);
  g.beginPath(); g.moveTo(p.x - 160, p.y - 20); g.lineTo(p.x - 150, p.y + 40); g.lineTo(p.x - 90, p.y + 78); g.lineTo(p.x, p.y + 92);
  g.lineTo(p.x + 95, p.y + 76); g.lineTo(p.x + 150, p.y + 42); g.lineTo(p.x + 160, p.y - 20); g.closePath(); g.fillPath();
  g.fillStyle(MAGNETITE_LIT, 0.45);
  g.beginPath(); g.moveTo(p.x - 120, p.y + 10); g.lineTo(p.x - 70, p.y + 50); g.lineTo(p.x - 20, p.y + 20); g.lineTo(p.x - 60, p.y - 10); g.closePath(); g.fillPath();
  // Glitter in the stone.
  for (let i = 0; i < 18; i++) {
    const x = p.x - 130 + ((i * 53) % 260), y = p.y + 4 + ((i * 31) % 70);
    g.fillStyle(0xb8c4dc, 0.3 + 0.3 * Math.sin(time / 300 + i)); g.fillRect(x, y, 2, 2);
  }
  // The fur: lost iron sticking out of it every which way, bristling up while it tugs.
  for (let i = 0; i < 34; i++) {
    const a = Math.PI * (0.08 + (i / 34) * 0.84);
    const r = 86 + (i % 4) * 6;
    const x = p.x - Math.cos(a) * r * 1.6, y = p.y + Math.sin(a) * r * 0.9 - 4;
    const ang = Math.atan2(y - (p.y + 20), x - p.x) + Math.sin(time / 90 + i) * 0.06 * warn;
    const k = KINDS[i % KINDS.length];
    if (i % 2) { g.lineStyle(2, i % 3 ? IRON_LIT : RUST, 1); g.lineBetween(x, y, x + Math.cos(ang) * (10 + warn * 6), y + Math.sin(ang) * (10 + warn * 6)); }
    else drawScrap(g, x, y, k, ang, 0.8);
  }
  if (warn > 0) glow(g, p.x, p.y + 40, 120, MAGNETITE_LIT, 0.05 * warn, 3);
}

/** One piece of lost iron, drawn as the thing it is. */
function drawScrap(g: G, x: number, y: number, kind: Kind, rot: number, s: number): void {
  const c = Math.cos(rot), sn = Math.sin(rot);
  const P = (u: number, v: number): [number, number] => [x + (u * c - v * sn) * s, y + (u * sn + v * c) * s];
  const seg = (u1: number, v1: number, u2: number, v2: number, w: number, col: number) => {
    const [a, b] = P(u1, v1), [d, e] = P(u2, v2); g.lineStyle(w * s, col, 1); g.lineBetween(a, b, d, e);
  };
  if (kind === 'nail') {
    seg(-9, 0, 8, 0, 2.4, IRON_LIT); seg(-9, -3.5, -9, 3.5, 2.6, IRON); seg(4, 0, 9, 0, 1.2, RUST);
  } else if (kind === 'key') {
    const [cx, cy] = P(-7, 0);
    g.lineStyle(2.2 * s, BRASS, 1); g.strokeCircle(cx, cy, 4 * s);
    seg(-3, 0, 10, 0, 2.2, BRASS); seg(7, 0, 7, 4, 2, BRASS); seg(10, 0, 10, 3.5, 2, BRASS_LIT);
  } else if (kind === 'shoe') {
    const [cx, cy] = P(0, 0);
    g.lineStyle(3.4 * s, IRON, 1); g.beginPath(); g.arc(cx, cy, 7 * s, rot + 0.5, rot + Math.PI * 2 - 0.5); g.strokePath();
    g.lineStyle(1.2 * s, IRON_LIT, 1); g.beginPath(); g.arc(cx, cy, 7 * s, rot + 1.2, rot + 3.2); g.strokePath();
    for (const a of [1.5, 2.6, 3.7, 4.8]) { g.fillStyle(SLATE_DEEP, 1); g.fillCircle(cx + Math.cos(rot + a) * 7 * s, cy + Math.sin(rot + a) * 7 * s, 0.9 * s); }
  } else if (kind === 'buckle') {
    const pts = [P(-7, -5), P(7, -5), P(7, 5), P(-7, 5)];
    g.lineStyle(2.2 * s, RUST_LIT, 1); g.strokePoints(pts.map(([a, b]) => ({ x: a, y: b })), true);
    seg(0, -5, 0, 5, 1.6, IRON_LIT);
  } else {
    seg(-8, -3, 8, -3, 3, IRON); seg(-8, 3, 8, 3, 3, IRON_DARK); seg(0, -4, 0, 4, 2, RUST);
    for (const u of [-5, 5]) { const [a, b] = P(u, -3); g.fillStyle(IRON_LIT, 1); g.fillCircle(a, b, 1 * s); }
  }
}

export const FALLEN_LOST_IRON: GimmickDef = {
  id: ID,
  rules: 'On the tug, all loose iron tears in a line to the lodestone, cutting all in the way. Hard blows shake iron off you. Strike a scrap to kick it.',
  make,
};
