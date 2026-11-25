import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { ingot } from '../art';
import { GOLD, GOLD_DARK, GOLD_DEEP, GOLD_LIT, IRON, IRON_DARK, IRON_LIT, MOLTEN, MOLTEN_LIT, SOOT, STEEL } from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * The Pour — Founder Hezekiah Crozzle, in the King's telling the mint's founder who melted down
 * the busted households' heirlooms into the King's bars, and never once asked whose they were.
 *
 * A bed of ingot moulds — eight columns, four rows of iron troughs — fills the middle of the mint
 * yard. Over it a travelling crab runs a great ladle along its beam, always drifting after you.
 * On the founder's count it tilts (the column under it glows) and pours: molten gold runs down the
 * column, burning whoever stands in a filled mould. A few seconds later each mould sets: the bar is
 * a wall — it shoves bodies out and stops every shot — until the mould is knocked out and carted off.
 *
 * So the yard is a maze that the ladle keeps rebuilding, and cover you can hide behind. The ladle
 * is a strike target: struck, it pours at once, wherever it hangs. Lead it over him and strike.
 * Halfway down the founder pours crosses — the column and the row you stand on.
 */

const ID = fallenId('treasury', 'pour');
const COLS = 8;
const ROWS = 4;
const CW = 84;
const CH = 62;
const TILT_MS = 1050;
const RUN_MS = 140;
const MOLTEN_MS = 3000;
const SET_MS = 8000;
const BURN_DMG = 7;
const BURN_TICK = 500;
const CRAB_SPEED = 150;
const POUR_EVERY = 3100;

/** One mould: empty, molten (burning) or set (a wall). */
interface Mould { c: number; r: number; fillAt: number; setAt: number; outAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const X0 = (W - COLS * CW) / 2;
  const Y0 = top + 138;
  const BEAM_Y = Y0 - 46;
  const moulds: Mould[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) moulds.push({ c, r, fillAt: -1, setAt: -1, outAt: -1 });
  const cell = (c: number, r: number) => moulds[r * COLS + c];
  let crabX = W / 2;
  let tiltAt = -1;
  let pourCol = -1;
  let lastPour = -9999;
  let nextPour = 0;
  let cross = false;
  let started = false;
  const lastBurn = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);

  const colOf = (x: number) => clamp(Math.floor((x - X0) / CW), 0, COLS - 1);
  const rowOf = (y: number) => Math.floor((y - Y0) / CH);
  const inBed = (x: number, y: number) => x >= X0 && x < X0 + COLS * CW && y >= Y0 && y < Y0 + ROWS * CH;
  const state = (m: Mould, t: number): 'empty' | 'molten' | 'set' => {
    if (m.fillAt < 0 || t < m.fillAt || t >= m.outAt) return 'empty';
    return t < m.setAt ? 'molten' : 'set';
  };
  const mouldAt = (x: number, y: number) => (inBed(x, y) ? cell(colOf(x), rowOf(y)) : null);

  function fill(m: Mould, at: number): void {
    if (m.fillAt >= 0 && at < m.outAt) return;
    m.fillAt = at; m.setAt = at + MOLTEN_MS; m.outAt = at + MOLTEN_MS + SET_MS;
  }

  function tilt(time: number): void {
    if (tiltAt >= 0 || time - lastPour < 1500) return;
    tiltAt = time;
    pourCol = colOf(crabX);
    ctx.sfx('beam-charge');
  }

  function pour(time: number): void {
    tiltAt = -1; lastPour = time; nextPour = time + POUR_EVERY;
    ctx.sfx('sizzle'); ctx.sfx('oil-splash');
    for (let r = 0; r < ROWS; r++) fill(cell(pourCol, r), time + r * RUN_MS);
    if (cross && alive(player)) {
      const pr = rowOf(player.y);
      if (pr >= 0 && pr < ROWS) for (let c = 0; c < COLS; c++) fill(cell(c, pr), time + Math.abs(c - pourCol) * RUN_MS);
    }
  }

  /** Struck, the ladle tips at once: it pours a beat later wherever it hangs. */
  function strikeLadle(time: number): void {
    const soon = time - tk.warn(TILT_MS) + 380;
    if (tiltAt >= 0) { tiltAt = Math.min(tiltAt, soon); return; }
    if (time - lastPour < 1500) return;
    tiltAt = soon;
    pourCol = colOf(crabX);
    ctx.sfx('clang');
  }

  const ladle: StrikeTarget = ctx.target({ x: crabX, y: BEAM_Y + 30, r: 30, passThrough: true, onStruck: () => strikeLadle(ctx.scene.time.now) });

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextPour = time + 2000; ctx.banner('THE LADLE IS FULL', '#ffcf6a'); }
      if (!cross && alive(npc) && npc.hp < npc.maxHp * 0.5) { cross = true; ctx.banner('HE POURS CROSSES NOW', '#ffb060'); ctx.sfx('inferno'); }
      // The crab drifts after you (it stops while the ladle tilts).
      if (tiltAt < 0 && alive(player)) {
        const want = clamp(player.x, X0 + CW / 2, X0 + COLS * CW - CW / 2);
        crabX += clamp(want - crabX, -CRAB_SPEED * dt, CRAB_SPEED * dt);
      }
      ladle.moveTo(crabX, BEAM_Y + 30);
      if (tiltAt < 0 && time >= nextPour) tilt(time);
      if (tiltAt >= 0 && time - tiltAt >= tk.warn(TILT_MS)) pour(time);
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const m = mouldAt(f.x, f.y);
        if (!m) continue;
        const s = state(m, time);
        if (s === 'molten' && time - (lastBurn.get(f) ?? 0) >= BURN_TICK) {
          lastBurn.set(f, time);
          ctx.hit(f, BURN_DMG, f.x, f.y);
          if (f === player) tk.slowPlayer(0.75, 520);
        } else if (s === 'set') {
          // A set bar is a wall: shove out through its nearest edge.
          const cx = X0 + m.c * CW, cy = Y0 + m.r * CH;
          const dl = f.x - cx, dr = cx + CW - f.x, du = f.y - cy, dd = cy + CH - f.y;
          const mn = Math.min(dl, dr, du, dd), push = 260 * dt + 2;
          if (mn === dl) ctx.nudge(f, -push, 0); else if (mn === dr) ctx.nudge(f, push, 0); else if (mn === du) ctx.nudge(f, 0, -push); else ctx.nudge(f, 0, push);
        }
      }
      // Set bars stop every shot that flies into them.
      for (const m of moulds) {
        if (state(m, time) !== 'set') continue;
        const cx = X0 + m.c * CW + CW / 2, cy = Y0 + m.r * CH + CH / 2;
        for (const s of ctx.shotsNear(cx, cy, CW * 0.6)) {
          if (Math.abs(s.x - cx) < CW / 2 && Math.abs(s.y - cy) < CH / 2) { s.block(); ctx.flash(s.x, s.y, GOLD_LIT); }
        }
      }
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      const unsafe = (x: number, y: number) => {
        const m = mouldAt(x, y);
        if (m && state(m, now) !== 'empty') return true;
        return tiltAt >= 0 && inBed(x, y) && colOf(x) === pourCol;
      };
      // You are under the ladle and it is ready: step up beside it and strike it.
      if (tiltAt < 0 && now - lastPour > 1500 && inBed(player.x, player.y) && Math.abs(player.x - crabX) < CW * 0.6) {
        const x = crabX + (npc.x < crabX ? -56 : 56), y = BEAM_Y + 14;
        if (!unsafe(x, y)) return { x, y };
      }
      if (!unsafe(npc.x, npc.y) && Math.abs(npc.x - crabX) > CW) {
        const d = Math.hypot(npc.x - player.x, npc.y - player.y);
        if (d > 170 && d < 330) return null;
      }
      // Off the column, clear of hot metal, at range.
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const x = clamp(player.x + Math.cos(a) * 240, 60, W - 60), y = clamp(player.y + Math.sin(a) * 200, top + 50, H - 50);
        if (!unsafe(x, y) && Math.abs(x - crabX) > CW) return { x, y };
      }
      return { x: npc.x < W / 2 ? 70 : W - 70, y: H - 70 };
    },

    drawGround(g, time) {
      for (const m of moulds) {
        const x = X0 + m.c * CW, y = Y0 + m.r * CH;
        const s = state(m, time);
        // The iron trough: a raised lip, a sunk bed with the King's die in it.
        g.fillStyle(IRON_DARK, 0.9); g.fillRect(x + 4, y + 4, CW - 8, CH - 8);
        g.fillStyle(IRON, 1); g.fillRect(x + 10, y + 10, CW - 20, CH - 20);
        g.lineStyle(1.5, IRON_LIT, 0.6); g.lineBetween(x + 4, y + 4, x + CW - 4, y + 4);
        g.lineStyle(1, IRON_DARK, 1); g.strokeEllipse(x + CW / 2, y + CH / 2, 18, 12);
        // The column under a tilting ladle glows from the rim inwards.
        if (tiltAt >= 0 && m.c === pourCol) {
          const k = clamp((time - tiltAt) / tk.warn(TILT_MS), 0, 1);
          g.lineStyle(2 + k * 3, MOLTEN, 0.4 + k * 0.6); g.strokeRect(x + 6, y + 6, CW - 12, CH - 12);
          g.fillStyle(MOLTEN, 0.08 + k * 0.22); g.fillRect(x + 10, y + 10, CW - 20, CH - 20);
        }
        if (s === 'molten') {
          const k = (time - m.fillAt) / MOLTEN_MS;
          g.fillStyle(MOLTEN_LIT, 1 - k * 0.3); g.fillRect(x + 10, y + 10, CW - 20, CH - 20);
          g.fillStyle(MOLTEN, 0.85); g.fillRect(x + 10, y + CH / 2 + 4, CW - 20, CH / 2 - 14);
          for (let b = 0; b < 4; b++) {
            const ph = (time / 700 + b * 0.27 + m.c * 0.13) % 1;
            g.fillStyle(0xfff6c8, 0.7 * (1 - ph)); g.fillCircle(x + 18 + b * 16, y + 16 + ((b * 13) % (CH - 30)), 2 + ph * 3);
          }
          g.lineStyle(2, GOLD_DARK, k); g.strokeRect(x + 10, y + 10, CW - 20, CH - 20);
        } else if (s === 'empty' && m.fillAt >= 0 && time < m.fillAt) {
          // Metal on its way down the column.
          g.fillStyle(MOLTEN, 0.25); g.fillRect(x + 10, y + 10, CW - 20, CH - 20);
        }
      }
      // The beam's rails and the shadow of the ladle.
      g.fillStyle(SOOT, 0.4); g.fillRect(X0 - 10, BEAM_Y - 6, COLS * CW + 20, 12);
      shadow(g, crabX, BEAM_Y + 36, 56, 16, 0.35);
    },

    drawAir(g, time) {
      // Set bars stand proud of their moulds.
      for (const m of moulds) {
        if (state(m, time) !== 'set') continue;
        const x = X0 + m.c * CW + CW / 2, y = Y0 + m.r * CH + CH - 12;
        const late = clamp((time - (m.outAt - 900)) / 900, 0, 1);
        ingot(g, x, y - late * 10, 2.3, clamp(1 - (time - m.setAt) / 900, 0, 1));
        if (late > 0) { g.fillStyle(0xffffff, late * 0.25); g.fillRect(x - 30, y - 30, 60, 26); }
      }
      // The gantry beam, the crab and the tilting ladle.
      g.fillStyle(IRON_DARK, 1); g.fillRect(X0 - 16, BEAM_Y - 74, COLS * CW + 32, 12);
      g.fillStyle(IRON_LIT, 1); g.fillRect(X0 - 16, BEAM_Y - 74, COLS * CW + 32, 2);
      for (const px of [X0 - 16, X0 + COLS * CW + 10]) { g.fillStyle(IRON, 1); g.fillRect(px, BEAM_Y - 74, 6, 80); }
      const tk01 = tiltAt >= 0 ? clamp((time - tiltAt) / tk.warn(TILT_MS), 0, 1) : clamp(1 - (time - lastPour) / 500, 0, 1);
      ladleArt(g, crabX, BEAM_Y, tk01, time);
      if (time - lastPour < 420) {
        const k = (time - lastPour) / 420;
        const cx = X0 + pourCol * CW + CW / 2;
        g.fillStyle(MOLTEN_LIT, 0.9 * (1 - k)); g.fillRect(cx - 3, BEAM_Y + 22, 8, Y0 + ROWS * CH * k - BEAM_Y - 22);
        glow(g, cx, Y0 + 40, 60, MOLTEN, 0.08 * (1 - k), 3);
      }
    },

    drawHud(g, time) {
      // The founder's count: a sand-cast bar filling with heat to the next pour.
      const k = tiltAt >= 0 ? 1 : clamp(1 - (nextPour - time) / POUR_EVERY, 0, 1);
      const x = 24, y = H - 34;
      g.fillStyle(IRON_DARK, 0.85); g.fillRect(x - 2, y - 2, 164, 14);
      g.fillStyle(tiltAt >= 0 ? MOLTEN_LIT : MOLTEN, 0.95); g.fillRect(x, y, 160 * k, 10);
      for (let i = 1; i < 4; i++) { g.fillStyle(IRON, 1); g.fillRect(x + i * 40 - 1, y, 2, 10); }
      if (cross) { g.lineStyle(2, MOLTEN_LIT, 1); g.lineBetween(x + 170, y - 1, x + 182, y + 11); g.lineBetween(x + 182, y - 1, x + 170, y + 11); }
      // Bars standing.
      const set = moulds.filter((m) => state(m, time) === 'set').length;
      for (let i = 0; i < Math.min(set, 12); i++) { g.fillStyle(GOLD, 1); g.fillRect(x + i * 13, y + 16, 10, 5); g.fillStyle(GOLD_DEEP, 1); g.fillRect(x + i * 13, y + 20, 10, 1); }
    },

    destroy() { ladle.remove(); },
  };
}

/** The crab on the beam, its chains, and the great clay-lined ladle tipped by `k` (0 level, 1 pouring). */
function ladleArt(g: G, x: number, beamY: number, k: number, time: number): void {
  g.fillStyle(IRON, 1); g.fillRect(x - 22, beamY - 82, 44, 18);
  for (const wx of [-14, 14]) { g.fillStyle(IRON_DARK, 1); g.fillCircle(x + wx, beamY - 64, 5); g.fillStyle(STEEL, 1); g.fillCircle(x + wx, beamY - 64, 2); }
  g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x - 10, beamY - 64, x - 16, beamY - 8); g.lineBetween(x + 10, beamY - 64, x + 16, beamY - 8);
  for (let i = 0; i < 6; i++) { g.lineStyle(1.5, STEEL, 0.8); g.strokeEllipse(x - 11 - i, beamY - 56 + i * 9, 3, 6); g.strokeEllipse(x + 11 + i, beamY - 56 + i * 9, 3, 6); }
  const a = k * 0.9;
  const c = Math.cos(a), s = Math.sin(a);
  const pt = (dx: number, dy: number) => ({ x: x + dx * c - dy * s, y: beamY + dx * s + dy * c });
  const p1 = pt(-26, -8), p2 = pt(26, -8), p3 = pt(20, 26), p4 = pt(-20, 26);
  g.fillStyle(IRON_DARK, 1); g.fillTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y); g.fillTriangle(p1.x, p1.y, p3.x, p3.y, p4.x, p4.y);
  const q1 = pt(-22, -6), q2 = pt(22, -6), q3 = pt(18, 22), q4 = pt(-18, 22);
  g.fillStyle(IRON, 1); g.fillTriangle(q1.x, q1.y, q2.x, q2.y, q3.x, q3.y); g.fillTriangle(q1.x, q1.y, q3.x, q3.y, q4.x, q4.y);
  // The melt's surface and the spout's glow.
  const m1 = pt(-22, -7), m2 = pt(22, -7);
  g.lineStyle(4, MOLTEN_LIT, 1); g.lineBetween(m1.x, m1.y, m2.x, m2.y);
  const lip = pt(28, -9);
  g.fillStyle(IRON_DARK, 1); g.fillTriangle(p2.x, p2.y, lip.x, lip.y, pt(22, 0).x, pt(22, 0).y);
  if (k > 0.2) {
    for (let d = 0; d < 3; d++) {
      const ph = (time / 260 + d / 3) % 1;
      g.fillStyle(MOLTEN_LIT, 0.9 * (1 - ph)); g.fillCircle(lip.x + 1, lip.y + ph * 36 * k, 2.2);
    }
  }
  glow(g, x, beamY - 6, 30, MOLTEN, 0.05 + k * 0.06, 3);
  g.fillStyle(GOLD_LIT, 0.5); g.fillCircle(pt(-8, -8).x, pt(-8, -8).y, 2);
}

export const FALLEN_POUR: GimmickDef = {
  id: ID,
  rules: 'The ladle drifts after you and pours a column of moulds: molten burns, then sets into bars that wall bodies and shots. Strike it to pour now.',
  make,
};
