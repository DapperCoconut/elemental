import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, mulberry, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { ASHLAR_DARK, ASHLAR_LIT, GILT, GILT_DARK, GILT_LIT, OAK, OAK_DARK, OAK_LIT, SURPLICE } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { FOE, MINE, sideBadge, vellum } from './common';

/**
 * Ember Fast — Refectorian Hubert Crust.
 *
 * On the Ember Days the summit fasts, and the Refectorian keeps the fast. In the star's telling a
 * fast is a weapon: the longer you hold back — no cast of any kind — the more of it gathers over
 * your head as gilt rings of abstinence, one every two seconds, three at most. Break it with a cast
 * and what you saved comes down on your foe: a column of light marked where they stood, falling a
 * moment later, heavier for every ring. The same is true of him.
 *
 * Crust also keeps the dole: loaves come over from the refectory hatch, and a loaf that lands on you
 * feeds you — it knocks you and breaks your fast for nothing. So it is a fight of held breath:
 * hold your casts, dodge the bread, step out of his column, and spend yours when he cannot move.
 * Past half the dole goes to both of you, so walk him under it before he can spend his fast.
 */

const RING_S = 2;            // seconds of fast per ring
const RINGS = 3;
const COLUMN_WARN = 700;
const COLUMN_R = 48;
const COLUMN_DMG = 7;        // per ring
const LOAF_FLIGHT = 900;
const LOAF_R = 40;

interface Column { x: number; y: number; at: number; rings: number; by: Fighter; fell: number }
interface Loaf { fx: number; fy: number; x: number; y: number; at: number; seed: number }
interface Crumbs { x: number; y: number; at: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const fast = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const columns: Column[] = [];
  const loaves: Loaf[] = [];
  const crumbs: Crumbs[] = [];
  const hatch: Pt = { x: W / 2, y: top + 18 };
  let nextLoaf = 2200;
  let t0 = -1;
  const half = () => npc.hp < npc.maxHp * 0.5;
  const other = (f: Fighter) => (f === player ? npc : player);
  const rings = (f: Fighter) => Math.min(RINGS, Math.floor((fast.get(f) ?? 0) / RING_S));

  function broke(f: Fighter): void {
    const n = rings(f);
    fast.set(f, 0);
    const o = other(f);
    if (n < 1 || !alive(o)) return;
    columns.push({ x: o.x, y: o.y, at: ctx.scene.time.now + COLUMN_WARN, rings: n, by: f, fell: 0 });
    ctx.sfx('holy-chord');
  }

  function toss(at: Fighter, time: number): void {
    const x = clamp(at.x + (rng() - 0.5) * 50, 50, W - 50), y = clamp(at.y + (rng() - 0.5) * 50, top + 50, H - 40);
    loaves.push({ fx: hatch.x, fy: hatch.y, x, y, at: time + LOAF_FLIGHT, seed: Math.floor(rng() * 1e6) });
    ctx.sfx('whoosh');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (t0 < 0) t0 = time;
      const el = time - t0;
      for (const f of [player, npc]) if (alive(f)) fast.set(f, (fast.get(f) ?? 0) + dt);

      if (el >= nextLoaf) {
        nextLoaf = el + (half() ? 2600 : 3200);
        if (alive(player)) toss(player, time);
        if (half() && alive(npc)) toss(npc, time);
      }
      for (let i = loaves.length - 1; i >= 0; i--) {
        const l = loaves[i];
        if (time < l.at) continue;
        loaves.splice(i, 1);
        crumbs.push({ x: l.x, y: l.y, at: time, seed: l.seed });
        ctx.sfx('hit-light');
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, l.x, l.y) > LOAF_R + 18) continue;
          ctx.hit(f, 4, l.x, l.y);
          fast.set(f, 0);
        }
      }
      for (const c of columns) {
        if (c.fell || time < c.at) continue;
        c.fell = time;
        ctx.sfx('light-beam');
        for (const f of [player, npc]) {
          if (f === c.by || !alive(f) || dist(f.x, f.y, c.x, c.y) > COLUMN_R + 18) continue;
          ctx.hit(f, COLUMN_DMG * c.rings, c.x, c.y);
        }
      }
      for (let i = columns.length - 1; i >= 0; i--) if (columns[i].fell && time - columns[i].fell > 600) columns.splice(i, 1);
      for (let i = crumbs.length - 1; i >= 0; i--) if (time - crumbs[i].at > 900) crumbs.splice(i, 1);
    },

    onPlayerCast() { broke(player); },
    onNpcCast() { broke(npc); },

    npcSeek(): Pt | null {
      if (!alive(npc)) return null;
      const threats: { x: number; y: number; r: number }[] = [
        ...columns.filter((c) => !c.fell && c.by !== npc).map((c) => ({ x: c.x, y: c.y, r: COLUMN_R })),
        ...loaves.map((l) => ({ x: l.x, y: l.y, r: LOAF_R })),
      ];
      for (const t of threats) {
        const d = dist(npc.x, npc.y, t.x, t.y);
        if (d > t.r + 40) continue;
        const ux = (npc.x - t.x) / (d || 1), uy = (npc.y - t.y) / (d || 1);
        return { x: clamp(t.x + ux * (t.r + 80), 50, W - 50), y: clamp(t.y + uy * (t.r + 80), top + 40, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      // The refectory hatch in the north wall, its shelf heaped with the day's dole.
      g.fillStyle(ASHLAR_DARK, 1); g.fillRect(hatch.x - 70, top, 140, 30);
      g.fillStyle(0x2a1a10, 1); g.fillRect(hatch.x - 56, top + 2, 112, 20);
      g.fillStyle(OAK, 1); g.fillRect(hatch.x - 64, top + 22, 128, 8);
      g.fillStyle(OAK_LIT, 1); g.fillRect(hatch.x - 64, top + 22, 128, 2);
      for (let i = 0; i < 6; i++) {
        const lx = hatch.x - 45 + i * 18;
        g.fillStyle(0x9a5a24, 1); g.fillEllipse(lx, top + 18, 16, 10);
        g.fillStyle(0xd09050, 1); g.fillEllipse(lx - 1, top + 16, 12, 6);
      }
      // Where a loaf will land: a ring and its shadow growing.
      for (const l of loaves) {
        const k = 1 - clamp((l.at - time) / LOAF_FLIGHT, 0, 1);
        g.lineStyle(2, 0xd09050, 0.35 + 0.5 * k); g.strokeCircle(l.x, l.y, LOAF_R);
        shadow(g, l.x, l.y, 18 + 22 * k, 6 + 8 * k, 0.15 + 0.2 * k);
      }
      // A column marked: a gilt rosette on the floor with a ring per fasting day spent, closing.
      for (const c of columns) {
        if (c.fell) continue;
        const k = 1 - clamp((c.at - time) / COLUMN_WARN, 0, 1);
        const col = c.by === npc ? FOE : MINE;
        glow(g, c.x, c.y, COLUMN_R + 6, col, 0.05 + 0.08 * k, 3);
        for (let i = 0; i < c.rings; i++) { g.lineStyle(2, GILT, 0.8); g.strokeCircle(c.x, c.y, COLUMN_R - i * 9); }
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4 + time / 900;
          g.fillStyle(GILT_LIT, 0.7); g.fillEllipse(c.x + Math.cos(a) * 16, c.y + Math.sin(a) * 12, 9, 5);
        }
        g.lineStyle(3, col, 0.9); g.beginPath(); g.arc(c.x, c.y, COLUMN_R + 4, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
      }
      for (const cr of crumbs) {
        const k = (time - cr.at) / 900;
        const rr = mulberry(cr.seed);
        for (let i = 0; i < 10; i++) {
          const a = rr() * Math.PI * 2, d = 10 + rr() * 30 * Math.min(1, k * 3);
          g.fillStyle(i % 2 ? 0xd09050 : 0x9a5a24, 1 - k); g.fillCircle(cr.x + Math.cos(a) * d, cr.y + Math.sin(a) * d * 0.6, 1.5 + rr() * 2);
        }
      }
    },

    drawAir(g, time) {
      // The fast over each head: a gilt ring for every two seconds held, the next one drawing in.
      for (const [f, col] of [[player, MINE], [npc, FOE]] as const) {
        if (!alive(f)) continue;
        const s = fast.get(f) ?? 0;
        const n = rings(f);
        const hx = f.x, hy = f.y - 52;
        for (let i = 0; i < n; i++) {
          g.lineStyle(2.4, GILT_DARK, 1); g.strokeEllipse(hx, hy - i * 6, 26 + i * 6, 8 + i * 2);
          g.lineStyle(1.2, GILT_LIT, 0.9 + 0.1 * Math.sin(time / 200 + i)); g.strokeEllipse(hx, hy - i * 6 - 0.5, 24 + i * 6, 7 + i * 2);
        }
        if (n < RINGS) {
          const k = (s % RING_S) / RING_S;
          g.lineStyle(1.4, col, 0.7); g.beginPath(); g.arc(hx, hy - n * 6, 10 + n * 3, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
        } else {
          glow(g, hx, hy - 12, 22, GILT_LIT, 0.08, 3);
        }
      }
      // Loaves in the air: round, scored, floured, turning as they come.
      for (const l of loaves) {
        const k = 1 - clamp((l.at - time) / LOAF_FLIGHT, 0, 1);
        const x = l.fx + (l.x - l.fx) * k, y = l.fy + (l.y - l.fy) * k - Math.sin(k * Math.PI) * 110;
        const rot = k * 7;
        g.fillStyle(0x7a4418, 1); g.fillEllipse(x, y + 1, 22, 15);
        g.fillStyle(0xc0803e, 1); g.fillEllipse(x, y - 1, 20, 12);
        g.lineStyle(1.4, 0x7a4418, 1);
        for (let i = -1; i <= 1; i++) {
          const a = rot + i * 0.5;
          g.lineBetween(x + Math.cos(a) * 7 + i * 4, y + Math.sin(a) * 3, x - Math.cos(a) * 3 + i * 4, y - Math.sin(a) * 3);
        }
        g.fillStyle(SURPLICE, 0.6); g.fillEllipse(x - 3, y - 4, 8, 3);
      }
      // Falling columns: light down from the vault onto the marked rosette.
      for (const c of columns) {
        if (!c.fell) {
          const left = c.at - time;
          if (left < 260) { g.fillStyle(GILT_LIT, 0.2 * (1 - left / 260)); g.fillRect(c.x - COLUMN_R * 0.4, top, COLUMN_R * 0.8, c.y - top); }
          continue;
        }
        const k = (time - c.fell) / 600;
        const w = COLUMN_R * (0.8 + c.rings * 0.2) * (1 - k * 0.6);
        g.fillStyle(GILT_LIT, 0.5 * (1 - k)); g.fillRect(c.x - w / 2, top, w, c.y - top);
        g.fillStyle(0xffffff, 0.6 * (1 - k)); g.fillRect(c.x - w / 6, top, w / 3, c.y - top);
        g.lineStyle(3 * (1 - k), GILT_LIT, 1 - k); g.strokeEllipse(c.x, c.y, (COLUMN_R + k * 30) * 2, (COLUMN_R + k * 30) * 1.3);
      }
    },

    drawHud(g) {
      const x = W / 2, y = top + 4;
      vellum(g, x, y, 176, 28);
      // Three wafers each: lit for every ring of fast held.
      for (const [f, col, ox] of [[player, MINE, -80], [npc, FOE, 10]] as const) {
        sideBadge(g, x + ox + 8, y + 14, col);
        const n = rings(f);
        const part = ((fast.get(f) ?? 0) % RING_S) / RING_S;
        for (let i = 0; i < RINGS; i++) {
          const wx = x + ox + 26 + i * 16;
          g.fillStyle(OAK_DARK, 1); g.fillCircle(wx, y + 14, 6.5);
          g.fillStyle(i < n ? GILT_LIT : ASHLAR_LIT, 1); g.fillCircle(wx, y + 14, 5.5);
          if (i === n && n < RINGS) { g.fillStyle(GILT, 0.8); g.slice(wx, y + 14, 5.5, -Math.PI / 2, -Math.PI / 2 + part * Math.PI * 2); g.fillPath(); }
          g.lineStyle(0.8, GILT_DARK, 0.9); g.lineBetween(wx - 3, y + 14, wx + 3, y + 14); g.lineBetween(wx, y + 11, wx, y + 17);
        }
      }
    },
  };
}

export const FALLEN_EMBER_FAST: GimmickDef = {
  id: fallenId('cathedral', 'ember-fast'),
  rules: 'Hold your casts and your fast gathers in rings; your next cast brings it down on your foe as a column of light. A dole loaf breaks it.',
  make,
};
