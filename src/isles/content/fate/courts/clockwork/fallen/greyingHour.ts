import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { hand } from '../art';
import { BLUED, BRASS, BRASS_DARK, BRASS_LIT, GILT, NUMERAL, PAID_GREY, STONE, STONE_DARK, TIMBER } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * The Greying Hour — Dial-Painter Ivett Greaves, who repaints the great clock's face every spring.
 * In the King's telling she kept the Hour Office's board: as each citizen's hour was paid she brushed
 * it over in grey, and the grey stayed on them — a little older, a little slower, a little less.
 *
 * The yard's floor is a dial, and her minute hand is a long brush. As it goes round from twelve it
 * paints the hour behind it grey. Anyone standing in paid time has grown old in it: slow on their
 * feet, soft in their blows. At five to the hour the clock strikes and the hour is *taken* from all
 * who stand in grey — struck and held. Then the paint washes off and the hand starts again.
 *
 * Strike the brush at the hand's tip and it jumps on five minutes, painting a slice at once: catch
 * her just ahead of it. Halfway down she takes up a second brush from six o'clock; the two paint
 * toward each other, and only two thin slices are left clean at the stroke.
 */

const ID = fallenId('clockwork', 'greying');
const HOUR_S = 21;
const R_TIP = 186;
const R_PAINT = 760;
const JUMP = 5;
const TAU = Math.PI * 2;
const EMBER = 0xe8823a;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const O: Pt = { x: W / 2, y: (top + H) / 2 + 8 };
  let mins = 0;
  let twin = false;
  let washUntil = 0;
  let strokeFx = -1e9;
  let jumpFx = -1e9;
  let jumpCd = 0;
  let started = false;
  const tips: StrikeTarget[] = [];

  const strokeAt = (): number => (twin ? 25 : 55);
  /** The hands' start marks (minutes on the dial): twelve, and six once she paints with two. */
  const starts = (): number[] => (twin ? [0, 30] : [0]);
  const angOf = (m: number): number => -Math.PI / 2 + (m / 60) * TAU;
  const tipOf = (s: number): Pt => { const a = angOf(s + mins); return { x: O.x + Math.cos(a) * R_TIP, y: O.y + Math.sin(a) * R_TIP }; };

  function inGrey(f: Fighter): boolean {
    if (!alive(f) || tk.now < washUntil || mins <= 0) return false;
    if (dist(f.x, f.y, O.x, O.y) < 30) return true;
    const a = Math.atan2(f.y - O.y, f.x - O.x);
    return starts().some((s) => {
      const rel = (((a - angOf(s)) % TAU) + TAU) % TAU;
      return rel < (mins / 60) * TAU;
    });
  }

  function jump(): void {
    const now = tk.now;
    if (now < jumpCd || now < washUntil || mins + JUMP >= strokeAt()) return;
    jumpCd = now + 900;
    mins += JUMP;
    jumpFx = now;
    ctx.sfx('clock-tick');
  }

  function stroke(time: number): void {
    strokeFx = time;
    ctx.sfx('judgement');
    for (const f of [player, npc]) {
      if (!inGrey(f)) continue;
      if (f === player) tk.hitPlayer(16, f.x, f.y);
      else ctx.hit(npc, 26, f.x, f.y);
      ctx.stun(f, 1300);
      ctx.flash(f.x, f.y, PAID_GREY);
    }
    ctx.banner('THE HOUR IS TAKEN', '#d8d8d0');
    washUntil = time + 1200;
    mins = 0;
  }

  function syncTips(): void {
    const want = starts().length;
    while (tips.length < want) tips.push(ctx.target({ x: O.x, y: O.y, r: 24, passThrough: true, onStruck: () => jump() }));
    starts().forEach((s, i) => { const p = tipOf(s); tips[i].moveTo(p.x, p.y); });
  }

  return {
    update(time, dt) {
      const d = clamp(dt, 0, 0.1);
      if (!started) { started = true; washUntil = time + 1500; }
      if (!twin && npc.hp < npc.maxHp * 0.5) {
        twin = true;
        mins = Math.min(mins, 20);
        ctx.banner('A SECOND BRUSH, FROM SIX', '#d8d8d0');
        ctx.sfx('curse-cast');
      }
      syncTips();
      if (time < washUntil) return;
      const before = mins;
      mins += (d * 60) / HOUR_S;
      if (Math.floor(before / 5) !== Math.floor(mins / 5) && mins > strokeAt() - 10) ctx.sfx('countdown-tick');
      if (mins >= strokeAt()) stroke(time);
    },

    playerSpeedMult: () => (inGrey(player) ? 0.7 : 1),
    npcSpeedMult: () => (inGrey(npc) ? 0.7 : 1),
    // Old hands hit soft: a fighter in grey lands their blows at 70%.
    npcTakenMult: () => (inGrey(player) ? 0.7 : 1),
    playerTakenMult: () => (inGrey(npc) ? 0.7 : 1),

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const ss = starts();
      if (inGrey(npc) || mins > strokeAt() - 8) {
        // Into the clean slice ahead of the nearest brush, out toward the rim where it is wide.
        const span = (60 / ss.length) - mins;
        const a = Math.atan2(npc.y - O.y, npc.x - O.x);
        let best = 0, bestD = 1e9;
        for (const s of ss) {
          const mid = angOf(s + mins + Math.max(1.5, span * 0.5));
          const dd = Math.abs(Math.atan2(Math.sin(mid - a), Math.cos(mid - a)));
          if (dd < bestD) { bestD = dd; best = mid; }
        }
        return { x: tk.clampX(O.x + Math.cos(best) * 240), y: tk.clampY(O.y + Math.sin(best) * 210) };
      }
      // You stand just ahead of a brush: go and knock it on over you.
      const pa = Math.atan2(player.y - O.y, player.x - O.x);
      for (const s of ss) {
        const rel = (((pa - angOf(s + mins)) % TAU) + TAU) % TAU;
        if (rel < (JUMP / 60) * TAU && mins + JUMP < strokeAt()) return tipOf(s);
      }
      return null;
    },

    drawGround(g, time) {
      drawDialFloor(g, O, time);
      const wash = time < washUntil ? clamp((washUntil - time) / 1200, 0, 1) : 0;
      if (wash > 0 && time - strokeFx < 1300) {
        // The paint running off after the stroke.
        g.fillStyle(PAID_GREY, 0.3 * wash); g.fillCircle(O.x, O.y, R_PAINT);
      }
      for (const s of starts()) {
        if (mins > 0) drawWedge(g, O, angOf(s), angOf(s + mins), time);
        // The stroke line: where the clean slice will end, in gilt.
        const ea = angOf(s + strokeAt());
        g.lineStyle(2, GILT, 0.35 + (mins > strokeAt() - 10 ? 0.35 : 0) + Math.sin(time / 140) * 0.08);
        for (let r = 40; r < 560; r += 26) g.lineBetween(O.x + Math.cos(ea) * r, O.y + Math.sin(ea) * r, O.x + Math.cos(ea) * (r + 13), O.y + Math.sin(ea) * (r + 13));
      }
      for (const s of starts()) drawBrushHand(g, O, angOf(s + mins), time, time - jumpFx < 300);
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(O.x, O.y, 14);
      g.fillStyle(BRASS, 1); g.fillCircle(O.x, O.y, 11);
      g.fillStyle(GILT, 1); g.fillCircle(O.x, O.y, 4);
    },

    drawAir(g, time) {
      const k = (time - strokeFx) / 900;
      if (k >= 0 && k < 1) {
        for (let i = 0; i < 3; i++) {
          g.lineStyle(4 - i, 0xe8e8e0, (1 - k) * (0.6 - i * 0.15));
          g.strokeCircle(O.x, O.y, 40 + k * 520 + i * 26);
        }
      }
      for (const f of [player, npc]) {
        if (!inGrey(f)) continue;
        // Grey hair coming in: a pale wash over the head, flecks drifting off.
        g.fillStyle(PAID_GREY, 0.35); g.fillEllipse(f.x, f.y - 28, 30, 14);
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 900 + i / 3) % 1);
          g.fillStyle(0xd8d8d0, 0.6 * (1 - ph)); g.fillCircle(f.x - 10 + i * 10, f.y - 30 - ph * 22, 1.8);
        }
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 18, r = 15;
      g.fillStyle(0x000000, 0.55); g.fillCircle(x, y, r + 3);
      g.fillStyle(0xf4ecd8, 1); g.fillCircle(x, y, r);
      for (const s of starts()) {
        g.fillStyle(PAID_GREY, 0.85);
        g.slice(x, y, r, angOf(s), angOf(s + mins), false); g.fillPath();
        g.lineStyle(2, GILT, 1);
        const ea = angOf(s + strokeAt());
        g.lineBetween(x, y, x + Math.cos(ea) * r, y + Math.sin(ea) * r);
        g.lineStyle(2, BLUED, 1);
        const ha = angOf(s + mins);
        g.lineBetween(x, y, x + Math.cos(ha) * (r - 2), y + Math.sin(ha) * (r - 2));
      }
      g.lineStyle(1.5, BRASS, 1); g.strokeCircle(x, y, r);
      const near = mins > strokeAt() - 6 && time > washUntil;
      if (near) glow(g, x, y, 24, GILT, 0.08 + Math.sin(time / 80) * 0.04, 2);
    },

    destroy() { for (const t of tips) t.remove(); },
  };
}

/** The floor dial: a painted chapter ring of setts, twelve bronze hour-studs and a minute track. */
function drawDialFloor(g: G, O: Pt, time: number): void {
  g.lineStyle(10, STONE_DARK, 0.5); g.strokeCircle(O.x, O.y, 236);
  g.lineStyle(6, STONE, 0.55); g.strokeCircle(O.x, O.y, 236);
  g.lineStyle(2, NUMERAL, 0.35); g.strokeCircle(O.x, O.y, 206);
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI / 2 + (i / 60) * TAU;
    const big = i % 5 === 0;
    g.lineStyle(big ? 3 : 1.5, NUMERAL, big ? 0.5 : 0.3);
    g.lineBetween(O.x + Math.cos(a) * (big ? 212 : 220), O.y + Math.sin(a) * (big ? 212 : 220), O.x + Math.cos(a) * 230, O.y + Math.sin(a) * 230);
    if (big) {
      // A bronze hour-stud, with Roman strokes cut beside it.
      const sx = O.x + Math.cos(a) * 252, sy = O.y + Math.sin(a) * 252;
      g.fillStyle(BRASS_DARK, 1); g.fillEllipse(sx, sy + 1.5, 16, 10);
      g.fillStyle(BRASS, 1); g.fillEllipse(sx, sy, 14, 8);
      g.fillStyle(BRASS_LIT, 0.7 + Math.sin(time / 600 + i) * 0.1); g.fillEllipse(sx - 2, sy - 1.5, 5, 2.5);
      const n = i / 5 === 0 ? 12 : i / 5;
      const strokes = n % 5 === 0 ? 1 : Math.min(4, n % 5);
      for (let k = 0; k < strokes; k++) {
        const ox = (k - (strokes - 1) / 2) * 4;
        g.lineStyle(1.5, NUMERAL, 0.45);
        g.lineBetween(sx + ox, sy + 8, sx + ox, sy + 15);
      }
    }
  }
}

/** Paid time: a grey wash laid in long brush-strokes from the hub, wet and bright at its leading edge. */
function drawWedge(g: G, O: Pt, a0: number, a1: number, time: number): void {
  g.fillStyle(PAID_GREY, 0.26);
  g.slice(O.x, O.y, R_PAINT, a0, a1, false); g.fillPath();
  const span = a1 - a0;
  const n = Math.max(2, Math.floor(span * 14));
  for (let i = 0; i <= n; i++) {
    const a = a0 + (span * i) / n;
    const r0 = 30 + ((i * 53) % 70), r1 = 380 + ((i * 97) % 220);
    g.lineStyle(2 + (i % 3), 0xc8c8c0, 0.12 + (i % 4) * 0.03);
    g.lineBetween(O.x + Math.cos(a) * r0, O.y + Math.sin(a) * r0, O.x + Math.cos(a) * r1, O.y + Math.sin(a) * r1);
  }
  // The wet edge, glistening, with drips trailing off it.
  g.lineStyle(4, 0xe0e0d8, 0.5 + Math.sin(time / 200) * 0.1);
  g.lineBetween(O.x + Math.cos(a1) * 30, O.y + Math.sin(a1) * 30, O.x + Math.cos(a1) * 620, O.y + Math.sin(a1) * 620);
  for (let k = 0; k < 6; k++) {
    const r = 70 + k * 80, back = 0.03 + ((k * 7) % 5) * 0.008;
    const dx = O.x + Math.cos(a1 - back) * r, dy = O.y + Math.sin(a1 - back) * r;
    g.fillStyle(PAID_GREY, 0.6); g.fillEllipse(dx, dy, 7, 4);
  }
}

/** The minute hand as her brush: blued steel shaft, a turned wooden ferrule, grey-loaded bristles at the tip. */
function drawBrushHand(g: G, O: Pt, a: number, time: number, jumped: boolean): void {
  const cx = Math.cos(a), cy = Math.sin(a), nx = -cy, ny = cx;
  hand(g, O.x, O.y, a, R_TIP - 30, 6, BLUED);
  const fx = O.x + cx * (R_TIP - 30), fy = O.y + cy * (R_TIP - 30);
  g.lineStyle(10, TIMBER, 1); g.lineBetween(fx, fy, fx + cx * 16, fy + cy * 16);
  g.lineStyle(10, BRASS, 1); g.lineBetween(fx + cx * 16, fy + cy * 16, fx + cx * 24, fy + cy * 24);
  for (let i = -4; i <= 4; i++) {
    const sw = Math.sin(time / 120 + i) * 1.5;
    const bx = fx + cx * 24 + nx * i * 1.6, by = fy + cy * 24 + ny * i * 1.6;
    g.lineStyle(2, i % 2 ? 0x8a8a84 : PAID_GREY, 1);
    g.lineBetween(bx, by, bx + cx * 20 + nx * (i * 0.8 + sw), by + cy * 20 + ny * (i * 0.8 + sw));
  }
  if (jumped) glow(g, fx + cx * 34, fy + cy * 34, 26, EMBER, 0.1, 2);
}

export const FALLEN_GREYING: GimmickDef = {
  id: ID,
  rules: 'Her brush paints the passing hour grey: in it you are slow and hit soft. At five to, all in grey are struck and held. Strike the brush to jump it on.',
  make,
};
