import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, mixC, type G } from '../../../../../art/IsleArt';
import { card } from '../art';
import { BRASS, BRASS_DARK, CARD_BLACK, CARD_RED, CARD_RED_DARK, CARD_RED_LIT, CHIP_BLUE, GILT_LIT, IVORY, MAHOGANY_DARK } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Luminous Readers — Engraver Osbeth Quarrie, who in the King's telling cut the House's marked
 * plate: the one every deck on the isle is printed from, with a mark in the lattice of every back
 * that only a red lens can see.
 *
 * A dozen cards lie face down about the yard, all the same blue back to the naked eye. Every few
 * seconds Osbeth *calls* some of them in his head: three seconds later each called card springs up
 * edge-first and spins, cutting everyone beside it. To the naked eye a called card gives itself
 * away only at the last moment, lifting at a corner. But a great **reader lens** — a disc of red
 * glass in a brass ring — stands on its tripod in the yard, and any card you look at *through* it
 * shows its mark: the gilt crimp and the ink star of a called card. Walk round the lens to read the
 * far side of the yard.
 *
 * Strike a called card and it springs at once (a breath later): read one by his feet and cut him
 * with it. Strike an honest card and it only turns over. Halfway down he takes the lens up and
 * carries it — it wanders the yard, and four are called at a time.
 */

const ID = fallenId('card', 'readers');
const N = 12;
const LENS_R = 46;
const CALL_MS = 2600;
const CALL_FAST_MS = 2100;
const TURN_MS = 3000;
const LIFT_MS = 750;
const STRUCK_MS = 600;
const CUT_R = 56;
const CUT = 16;
const SPIN_MS = 650;
const CW = 30, CH = 42;

interface Lay {
  x: number; y: number; ang: number;
  turnAt: number;       // 0 = honest / not called
  spunAt: number;       // when it last sprang (for the spin), or turned honest
  honest: boolean;      // turned over honest after a strike
  dealAt: number;       // dealt back in (slides in) at this time
  target: StrikeTarget | null;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const lens = { x: W / 2, y: top + (H - top) * 0.5, tx: W / 2, ty: top + (H - top) * 0.5, moveAt: 0 };
  const lays: Lay[] = [];
  let nextCall = 0;
  let started = false;
  let carried = false;
  let now = 0;

  function spot(): { x: number; y: number } {
    for (let tries = 0; tries < 40; tries++) {
      const x = 70 + rng() * (W - 140), y = top + 50 + rng() * (H - top - 100);
      if (dist(x, y, lens.x, lens.y) < 100) continue;
      if (lays.some((l) => dist(l.x, l.y, x, y) < 86)) continue;
      return { x, y };
    }
    return { x: 70 + rng() * (W - 140), y: top + 50 + rng() * (H - top - 100) };
  }

  function deal(l: Lay, time: number): void {
    const p = spot();
    l.target?.remove();
    l.x = p.x; l.y = p.y; l.ang = (rng() - 0.5) * 0.9;
    l.turnAt = 0; l.spunAt = 0; l.honest = false; l.dealAt = time + 380;
    l.target = ctx.target({ x: l.x, y: l.y, r: 22, passThrough: true, onStruck: () => struck(l) });
  }

  function struck(l: Lay): void {
    if (now < l.dealAt || l.spunAt) return;
    if (l.turnAt) { l.turnAt = Math.min(l.turnAt, now + STRUCK_MS); ctx.sfx('trap-snap'); }
    else { l.honest = true; l.spunAt = now; ctx.sfx('snap-back'); }
  }

  /** Is this card read through the lens from where `f` stands? */
  function readFrom(f: Fighter, l: Lay): boolean {
    const dl = dist(f.x, f.y, lens.x, lens.y);
    if (dl < LENS_R + 14 || dl >= dist(f.x, f.y, l.x, l.y)) return false;
    return segDist(lens.x, lens.y, f.x, f.y, l.x, l.y) < LENS_R;
  }

  const called = (l: Lay) => l.turnAt > 0 && !l.spunAt;

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      now = time;
      if (!started) {
        started = true;
        for (let i = 0; i < N; i++) { const l: Lay = { x: 0, y: 0, ang: 0, turnAt: 0, spunAt: 0, honest: false, dealAt: 0, target: null }; lays.push(l); deal(l, time); }
        nextCall = time + 1500;
        ctx.banner('LOOK THROUGH THE RED LENS TO READ HIS MARKS — STRIKE A MARKED CARD TO SPRING IT', '#ea5560');
      }
      if (!carried && npc.hp < npc.maxHp * 0.5) { carried = true; lens.moveAt = time; ctx.banner('HE TAKES UP THE LENS', '#ea5560'); ctx.sfx('status-debuff'); }
      if (carried) {
        if (time >= lens.moveAt) {
          lens.tx = 160 + rng() * (W - 320); lens.ty = top + 110 + rng() * (H - top - 200);
          lens.moveAt = time + 5200;
        }
        const d = dist(lens.x, lens.y, lens.tx, lens.ty);
        if (d > 1) { const s = Math.min(d, 60 * dt); lens.x += ((lens.tx - lens.x) / d) * s; lens.y += ((lens.ty - lens.y) / d) * s; }
      }

      if (time >= nextCall) {
        nextCall = time + (carried ? CALL_FAST_MS : CALL_MS);
        const free = lays.filter((l) => !l.turnAt && !l.spunAt && time >= l.dealAt);
        // He favours the cards nearest you, but not only those.
        free.sort((a, b) => dist(a.x, a.y, player.x, player.y) - dist(b.x, b.y, player.x, player.y));
        const n = carried ? 4 : 3;
        for (let k = 0; k < n && free.length; k++) {
          const idx = rng() < 0.6 ? 0 : Math.floor(rng() * free.length);
          free.splice(idx, 1)[0].turnAt = time + tk.warn(TURN_MS);
        }
        ctx.sfx('curse-cast');
      }

      for (const l of lays) {
        if (called(l) && time >= l.turnAt) {
          l.spunAt = time;
          ctx.sfx('slash');
          for (const f of [player, npc]) if (alive(f) && dist(f.x, f.y, l.x, l.y) < CUT_R) ctx.hit(f, CUT, f.x, f.y);
        }
        if (l.spunAt && time - l.spunAt > (l.honest ? 700 : SPIN_MS + 250)) deal(l, time);
      }
    },

    npcSeek() {
      const t = now;
      // He knows his marks: off any called card about to spring.
      for (const l of lays) {
        if (!called(l) || l.turnAt - t > 1500) continue;
        const d = dist(npc.x, npc.y, l.x, l.y);
        if (d < CUT_R + 46) {
          const k = (CUT_R + 110) / Math.max(1, d);
          return { x: clamp(l.x + (npc.x - l.x) * k, 50, W - 50), y: clamp(l.y + (npc.y - l.y) * k, top + 50, H - 40) };
        }
      }
      // A called card at your feet with time on it: go and spring it on you.
      let best: Lay | null = null;
      for (const l of lays) {
        if (!called(l) || l.turnAt - t < 1600) continue;
        if (dist(player.x, player.y, l.x, l.y) > 80) continue;
        if (!best || dist(npc.x, npc.y, l.x, l.y) < dist(npc.x, npc.y, best.x, best.y)) best = l;
      }
      if (best && dist(npc.x, npc.y, best.x, best.y) < 320) return { x: best.x, y: best.y };
      return null;
    },

    drawGround(g, time) {
      // The sight-lines: from your eye past both edges of the lens, a faint red wedge on the felt.
      if (alive(player)) {
        const dx = lens.x - player.x, dy = lens.y - player.y, d = Math.hypot(dx, dy);
        if (d > LENS_R + 14) {
          const a = Math.atan2(dy, dx), half = Math.asin(Math.min(1, LENS_R / d));
          const far = 1100;
          const p1 = { x: player.x + Math.cos(a - half) * far, y: player.y + Math.sin(a - half) * far };
          const p2 = { x: player.x + Math.cos(a + half) * far, y: player.y + Math.sin(a + half) * far };
          const e1 = { x: lens.x + Math.cos(a - Math.PI / 2) * LENS_R, y: lens.y + Math.sin(a - Math.PI / 2) * LENS_R };
          const e2 = { x: lens.x + Math.cos(a + Math.PI / 2) * LENS_R, y: lens.y + Math.sin(a + Math.PI / 2) * LENS_R };
          g.fillStyle(CARD_RED, 0.07); g.fillPoints([e1, p1, p2, e2], true);
          g.lineStyle(1, CARD_RED_LIT, 0.22); g.lineBetween(e1.x, e1.y, p1.x, p1.y); g.lineBetween(e2.x, e2.y, p2.x, p2.y);
        }
      }
      for (const l of lays) {
        if (time < l.dealAt) continue;
        if (l.spunAt) {
          const k = clamp((time - l.spunAt) / SPIN_MS, 0, 1);
          if (l.honest) { card(g, l.x, l.y, CW, CH, l.ang, { face: true, suit: 'club', rank: 2 }); continue; }
          // The cut: a ring of shorn felt, fading.
          g.lineStyle(3, CARD_RED_LIT, 0.6 * (1 - k)); g.strokeCircle(l.x, l.y, CUT_R * (0.5 + k * 0.5));
          g.fillStyle(CARD_RED_DARK, 0.15 * (1 - k)); g.fillCircle(l.x, l.y, CUT_R);
          continue;
        }
        const read = alive(player) && readFrom(player, l);
        const lift = called(l) ? clamp(1 - (l.turnAt - time) / LIFT_MS, 0, 1) : 0;
        g.fillStyle(0x000000, 0.22 + lift * 0.15); g.fillEllipse(l.x + 2 + lift * 4, l.y + 6, CW + 10, CH * 0.45);
        drawBack(g, l, read, lift, time);
        if (lift > 0) {
          // The last moment: the corner lifts, the edge glints red; the cut it will make is ringed.
          g.lineStyle(1.5, CARD_RED_LIT, 0.35 + lift * 0.5); g.strokeCircle(l.x, l.y, CUT_R);
          glow(g, l.x, l.y, 20, CARD_RED_LIT, 0.1 * lift, 3);
        }
      }
      drawLensFoot(g, lens.x, lens.y);
    },

    drawAir(g, time) {
      // Cards springing: up on edge and spinning like a thrown blade.
      for (const l of lays) {
        if (!l.spunAt || l.honest) continue;
        const k = clamp((time - l.spunAt) / SPIN_MS, 0, 1);
        if (k >= 1) continue;
        const rise = Math.sin(k * Math.PI) * 26;
        const a = l.ang + k * 18;
        const ex = Math.cos(a) * CW * 0.6, ey = Math.sin(a) * CW * 0.6;
        g.lineStyle(5, CARD_BLACK, 0.5 * (1 - k)); g.lineBetween(l.x - ex, l.y - ey - rise + 3, l.x + ex, l.y + ey - rise + 3);
        g.lineStyle(4, IVORY, 1 - k * 0.5); g.lineBetween(l.x - ex, l.y - ey - rise, l.x + ex, l.y + ey - rise);
        g.lineStyle(1.5, CHIP_BLUE, 1 - k * 0.5); g.lineBetween(l.x - ex * 0.8, l.y - ey * 0.8 - rise, l.x + ex * 0.8, l.y + ey * 0.8 - rise);
        for (let s = 0; s < 3; s++) {
          const b = a - s * 0.5;
          g.lineStyle(2 - s * 0.5, CARD_RED_LIT, (0.6 - s * 0.18) * (1 - k));
          g.beginPath(); g.arc(l.x, l.y - rise, CUT_R * (0.55 + s * 0.15), b - 0.6, b, false); g.strokePath();
        }
      }
      // Cards sliding in from his hand.
      for (const l of lays) {
        const k = 1 - clamp((l.dealAt - time) / 380, 0, 1);
        if (k >= 1 || !alive(npc)) continue;
        card(g, npc.x + (l.x - npc.x) * k, npc.y - 20 + (l.y - npc.y + 20) * k, CW * 0.8, CH * 0.8, l.ang + (1 - k) * 6, { face: false, back: CHIP_BLUE, cheap: true });
      }
      drawLens(g, lens.x, lens.y, time, carried);
    },

    drawHud(g) {
      // The engraver's plate: one ink star for every card he has called that has not yet sprung.
      const n = lays.filter(called).length;
      const x0 = W - 150, y0 = top + 8;
      g.fillStyle(BRASS_DARK, 0.95); g.fillRoundedRect(x0, y0, 136, 34, 5);
      g.fillStyle(BRASS, 1); g.fillRoundedRect(x0 + 3, y0 + 3, 130, 28, 4);
      g.lineStyle(1, lit(BRASS, 0.4), 0.8); for (let i = 0; i < 6; i++) g.lineBetween(x0 + 8 + i * 22, y0 + 6, x0 + 18 + i * 22, y0 + 28);
      for (let i = 0; i < 4; i++) star(g, x0 + 22 + i * 30, y0 + 17, 8, i < n ? CARD_BLACK : dim(BRASS, 0.25), 1);
    },

    destroy() { for (const l of lays) l.target?.remove(); },
  };
}

/** A small five-point ink star — the mark the plate cuts into a called card's lattice. */
function star(g: G, x: number, y: number, r: number, color: number, a: number): void {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const t = -Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? r * 0.42 : r;
    pts.push({ x: x + Math.cos(t) * rr, y: y + Math.sin(t) * rr });
  }
  g.fillStyle(color, a); g.fillPoints(pts, true);
}

/** A face-down card; read through the lens it is washed red and a called one shows its marks. */
function drawBack(g: G, l: Lay, read: boolean, lift: number, time: number): void {
  const marked = l.turnAt > 0;
  card(g, l.x, l.y - lift * 4, CW, CH, l.ang, { face: false, back: CHIP_BLUE });
  if (lift > 0) {
    // The lifting corner: a pale triangle of the face catching the light.
    const ca = Math.cos(l.ang), sa = Math.sin(l.ang);
    const P = (u: number, v: number) => ({ x: l.x + u * ca - v * sa, y: l.y - lift * 4 + u * sa + v * ca });
    const c = P(CW / 2, -CH / 2), s = 10 * lift;
    g.fillStyle(IVORY, 1); g.fillTriangle(c.x, c.y, P(CW / 2 - s, -CH / 2).x, P(CW / 2 - s, -CH / 2).y, P(CW / 2, -CH / 2 + s).x, P(CW / 2, -CH / 2 + s).y);
  }
  if (!read) return;
  g.fillStyle(CARD_RED, 0.28); g.fillCircle(l.x, l.y, CW * 0.75);
  if (!marked) return;
  // The marks: a gilt crimp across the top corner and an ink star in the medallion, pulsing.
  const ca = Math.cos(l.ang), sa = Math.sin(l.ang);
  const P = (u: number, v: number) => ({ x: l.x + u * ca - v * sa, y: l.y + u * sa + v * ca });
  const a = P(-CW / 2 + 3, -CH / 2 + 10), b = P(-CW / 2 + 10, -CH / 2 + 3);
  g.lineStyle(2.5, GILT_LIT, 1); g.lineBetween(a.x, a.y, b.x, b.y);
  const pulse = 0.7 + Math.sin(time / 90) * 0.3;
  star(g, l.x, l.y, 8, mixC(CARD_BLACK, CARD_RED_DARK, 0.4), 1);
  star(g, l.x, l.y, 5, CARD_RED_LIT, pulse);
  // The time it has left, read off the mark: an ink line drawing round the card.
  g.lineStyle(2, CARD_RED_LIT, 0.8); g.beginPath(); g.arc(l.x, l.y, CW * 0.9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp((l.turnAt - time) / TURN_MS, 0, 1), false); g.strokePath();
}

/** The tripod's three feet and their shadow on the felt. */
function drawLensFoot(g: G, x: number, y: number): void {
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 46, 120, 30);
  for (const a of [Math.PI * 0.5, Math.PI * 0.5 + 2.1, Math.PI * 0.5 - 2.1]) {
    const fx = x + Math.cos(a) * 44, fy = y + 40 + Math.sin(a) * 14;
    g.lineStyle(4, MAHOGANY_DARK, 1); g.lineBetween(x, y + 24, fx, fy);
    g.fillStyle(BRASS, 1); g.fillCircle(fx, fy, 3.5);
  }
}

/** The reader lens: a disc of red glass in a turned brass ring, on its post, catching the light. */
function drawLens(g: G, x: number, y: number, time: number, carried: boolean): void {
  const bob = carried ? Math.sin(time / 300) * 3 : 0;
  const cy = y + bob;
  g.lineStyle(5, BRASS_DARK, 1); g.lineBetween(x, cy + LENS_R - 2, x, y + 26);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y + 26, 5);
  glow(g, x, cy, LENS_R + 20, CARD_RED, 0.05, 3);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, cy, LENS_R + 7);
  g.fillStyle(BRASS, 1); g.fillCircle(x, cy, LENS_R + 4);
  g.lineStyle(1, lit(BRASS, 0.5), 0.9); g.strokeCircle(x, cy, LENS_R + 2);
  for (let i = 0; i < 4; i++) {
    const r = LENS_R * (1 - i * 0.22);
    g.fillStyle(mixC(CARD_RED_DARK, CARD_RED_LIT, i * 0.18), 0.55 + i * 0.08); g.fillCircle(x - i * 2, cy - i * 2, r);
  }
  // The glints that slide round the glass as the light moves.
  const t = time / 1400;
  g.lineStyle(3, 0xffffff, 0.45); g.beginPath(); g.arc(x, cy, LENS_R * 0.78, -2.6 + Math.sin(t) * 0.2, -1.7 + Math.sin(t) * 0.2, false); g.strokePath();
  g.fillStyle(0xffffff, 0.6); g.fillCircle(x - LENS_R * 0.42, cy - LENS_R * 0.4, 4);
  g.lineStyle(1.5, GILT_LIT, 0.6); g.beginPath(); g.arc(x, cy, LENS_R * 0.9, 0.4, 1.3, false); g.strokePath();
  // The engraver's screw-handle at the side.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x + LENS_R + 4, cy - 4, 14, 8);
  g.fillStyle(BRASS, 1); g.fillCircle(x + LENS_R + 20, cy, 6);
  g.fillStyle(BRASS_DARK, 1); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.fillCircle(x + LENS_R + 20 + Math.cos(a) * 6, cy + Math.sin(a) * 6, 1.3); }
}

export const FALLEN_READERS: GimmickDef = {
  id: ID,
  rules: 'Called cards spring and cut. Only seen through the red lens do they show his marks. Strike a marked card to spring it at once — by his feet.',
  make,
};
