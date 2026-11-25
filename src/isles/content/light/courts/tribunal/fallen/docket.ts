import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { chalkLine, noonShadow } from '../art';
import {
  BRONZE, BRONZE_DARK, CHALK, GOLD, GOLD_DARK, GOLD_LIT, INK, PARCH, PARCH_DARK, ROBE_DARK, SIDE_FOE, SIDE_YOU, SUN, SUN_HOT, WAX,
} from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Called in Turn — Docket-Crier Ozanne Pritchet.
 *
 * Pritchet cried the docket: the order the day's cases were heard in, hung up as tablets on a gilt
 * rail outside the courthouse. In the star's telling she hung them in the order the bench liked,
 * and moved a tablet to the back whenever a friend of the court was on it.
 *
 * The rail stands at the head of the yard with the next four cases hanging from it. Each tablet
 * shows the *form* of its sentence (a cross of lanes, a ring, three rows or a spot) and, by its
 * seal, *whose* case it is. Every few beats the front case is called: its form is chalked round
 * that fighter where they stand, and a breath later it falls on anyone inside it — a ring is safe
 * in its middle. Read the rail and be ready for your form.
 *
 * Strike the rail and the front case is adjourned: it goes to the back of the docket with its seal
 * turned over — the other fighter's now. She adjourns her own cases the same way. At half she
 * calls two at a time.
 */

const ID = fallenId('tribunal', 'docket');
type Side = 'player' | 'npc';
type Form = 'cross' | 'ring' | 'rows' | 'spot';
const FORMS: Form[] = ['cross', 'ring', 'rows', 'spot'];
const CALL_MS = 2700;
const CALL_LATE_MS = 2900;
const WARN_MS = 1050;
const LANE_HALF = 26;
const RING_R = 118;
const RING_BAND = 26;
const SPOT_R = 82;
const ROW_GAP = 128;
const DMG_YOU = 15;
const DMG_FOE = 21;
const ADJOURN_CD = 1100;

interface Case { form: Form; party: Side; seed: number }
interface Laid { form: Form; party: Side; x: number; y: number; rot: number; at: number; fired: boolean; firedAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const rail = { x: W / 2, y: top + 34 };
  const queue: Case[] = [];
  const laid: Laid[] = [];
  let late = false;
  let nextCall = 0, started = false, lastAdjourn = -1e9, adjournFlash = 0, called = 0;
  const fighter = (s: Side): Fighter => (s === 'player' ? player : npc);

  function draw(): Case {
    // The crown's docket: three in four cases are yours.
    return { form: FORMS[Math.floor(rng() * FORMS.length)], party: rng() < 0.72 ? 'player' : 'npc', seed: rng() };
  }
  for (let i = 0; i < 4; i++) queue.push(draw());

  const target: StrikeTarget = ctx.target({
    x: rail.x, y: rail.y + 10, r: 46,
    onStruck() {
      if (tk.now - lastAdjourn < ADJOURN_CD || !queue.length) return;
      lastAdjourn = tk.now; adjournFlash = tk.now;
      const c = queue.shift() as Case;
      c.party = c.party === 'player' ? 'npc' : 'player';
      queue.push(c);
      ctx.sfx('chain');
    },
  });

  function call(time: number): void {
    const c = queue.shift();
    if (!c) return;
    queue.push(draw());
    const f = fighter(c.party);
    if (!alive(f)) return;
    laid.push({ form: c.form, party: c.party, x: tk.clampX(f.x, 50), y: tk.clampY(f.y, 40), rot: c.seed * Math.PI, at: time + tk.warn(WARN_MS), fired: false, firedAt: 0 });
    ctx.sfx('judgement');
  }

  /** Is a point inside a laid form? */
  function inside(l: Laid, px: number, py: number): boolean {
    const dx = px - l.x, dy = py - l.y;
    switch (l.form) {
      case 'spot': return Math.hypot(dx, dy) < SPOT_R + 14;
      case 'ring': { const d = Math.hypot(dx, dy); return Math.abs(d - RING_R) < RING_BAND + 14; }
      case 'cross': return Math.abs(dx) < LANE_HALF + 14 || Math.abs(dy) < LANE_HALF + 14;
      case 'rows': {
        const ux = Math.cos(l.rot), uy = Math.sin(l.rot);
        const off = dx * -uy + dy * ux;
        for (const k of [-1, 0, 1]) if (Math.abs(off - k * ROW_GAP) < LANE_HALF + 14) return true;
        return false;
      }
    }
  }

  function fire(l: Laid): void {
    l.fired = true; l.firedAt = tk.now;
    ctx.sfx(l.form === 'ring' ? 'sonic-pulse' : 'stone-slam');
    if (alive(player) && inside(l, player.x, player.y)) tk.hitPlayer(DMG_YOU, player.x, player.y);
    if (alive(npc) && inside(l, npc.x, npc.y)) ctx.hit(npc, DMG_FOE, npc.x, npc.y);
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextCall = time + 2200; }
      if (!late && npc.hp < npc.maxHp * 0.5) { late = true; ctx.banner('TWO CASES AT A TIME', '#e8c860'); ctx.sfx('boss-phase'); }
      if (time >= nextCall) {
        nextCall = time + (late ? CALL_LATE_MS : CALL_MS);
        called++;
        call(time);
        if (late) call(time);
      }
      for (const l of laid) if (!l.fired && time >= l.at) fire(l);
      for (let i = laid.length - 1; i >= 0; i--) if (laid[i].fired && time - laid[i].firedAt > 520) laid.splice(i, 1);
      // The rail is a solid thing: nobody stands inside its posts.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        if (segDist(f.x, f.y, rail.x - 120, rail.y, rail.x + 120, rail.y) < 16 && f.y < rail.y + 16) ctx.nudge(f, 0, rail.y + 16 - f.y);
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Out of anything chalked where he stands (into the eye of a ring, if it is a ring).
      for (const l of laid) {
        if (l.fired || !inside(l, npc.x, npc.y)) continue;
        if (l.form === 'ring') return { x: l.x, y: l.y };
        if (l.form === 'cross') {
          const dx = npc.x - l.x, dy = npc.y - l.y;
          return { x: tk.clampX(l.x + (Math.sign(dx) || 1) * 110), y: tk.clampY(l.y + (Math.sign(dy) || 1) * 110) };
        }
        if (l.form === 'rows') {
          const ux = Math.cos(l.rot), uy = Math.sin(l.rot);
          return { x: tk.clampX(npc.x - uy * ROW_GAP * 0.5), y: tk.clampY(npc.y + ux * ROW_GAP * 0.5) };
        }
        const a = Math.atan2(npc.y - l.y, npc.x - l.x);
        return { x: tk.clampX(l.x + Math.cos(a) * (SPOT_R + 70)), y: tk.clampY(l.y + Math.sin(a) * (SPOT_R + 70)) };
      }
      // His case is next and there is time to reach the rail: go and adjourn it onto you.
      const front = queue[0];
      if (front && front.party === 'npc' && tk.now - lastAdjourn > ADJOURN_CD) {
        const reach = dist(npc.x, npc.y, rail.x, rail.y + 60) / 190 * 1000;
        if (reach < nextCall - tk.now + 400) return { x: rail.x + (npc.x < rail.x ? -60 : 60), y: rail.y + 70 };
      }
      return null;
    },

    drawGround(g, time) {
      for (const l of laid) {
        const col = l.party === 'player' ? SIDE_YOU : SIDE_FOE;
        const k = l.fired ? 1 : clamp(1 - (l.at - time) / Math.max(1, tk.warn(WARN_MS)), 0, 1);
        const fade = l.fired ? clamp(1 - (time - l.firedAt) / 520, 0, 1) : 1;
        const fillA = l.fired ? 0.45 * fade : 0.05 + k * 0.13;
        const fillC = l.fired ? SUN : col;
        const lineA = (0.45 + k * 0.5) * fade;
        const L = 1200;
        switch (l.form) {
          case 'spot': {
            g.fillStyle(fillC, fillA); g.fillCircle(l.x, l.y, SPOT_R);
            g.lineStyle(2, col, lineA); g.strokeCircle(l.x, l.y, SPOT_R);
            g.lineStyle(1.5, CHALK, lineA); g.strokeCircle(l.x, l.y, SPOT_R * (1 - k * 0.7));
            break;
          }
          case 'ring': {
            g.lineStyle(RING_BAND * 2, fillC, fillA); g.strokeCircle(l.x, l.y, RING_R);
            g.lineStyle(2, col, lineA); g.strokeCircle(l.x, l.y, RING_R - RING_BAND); g.strokeCircle(l.x, l.y, RING_R + RING_BAND);
            // The eye of the ring, marked safe with a little chalk cross-hatch.
            chalkLine(g, l.x - 14, l.y, l.x + 14, l.y, lineA * 0.7, 1.5); chalkLine(g, l.x, l.y - 14, l.x, l.y + 14, lineA * 0.7, 1.5);
            break;
          }
          case 'cross': {
            g.fillStyle(fillC, fillA);
            g.fillRect(l.x - L, l.y - LANE_HALF, L * 2, LANE_HALF * 2); g.fillRect(l.x - LANE_HALF, l.y - L, LANE_HALF * 2, L * 2);
            chalkLine(g, 0, l.y - LANE_HALF, W, l.y - LANE_HALF, lineA); chalkLine(g, 0, l.y + LANE_HALF, W, l.y + LANE_HALF, lineA);
            chalkLine(g, l.x - LANE_HALF, top, l.x - LANE_HALF, H, lineA); chalkLine(g, l.x + LANE_HALF, top, l.x + LANE_HALF, H, lineA);
            break;
          }
          case 'rows': {
            const ux = Math.cos(l.rot), uy = Math.sin(l.rot);
            for (const r of [-1, 0, 1]) {
              const ox = l.x - uy * r * ROW_GAP, oy = l.y + ux * r * ROW_GAP;
              const nx = -uy * LANE_HALF, ny = ux * LANE_HALF;
              g.fillStyle(fillC, fillA);
              g.fillPoints([{ x: ox - ux * L + nx, y: oy - uy * L + ny }, { x: ox + ux * L + nx, y: oy + uy * L + ny }, { x: ox + ux * L - nx, y: oy + uy * L - ny }, { x: ox - ux * L - nx, y: oy - uy * L - ny }], true);
              g.lineStyle(1.5, col, lineA);
              g.lineBetween(ox - ux * L + nx, oy - uy * L + ny, ox + ux * L + nx, oy + uy * L + ny);
              g.lineBetween(ox - ux * L - nx, oy - uy * L - ny, ox + ux * L - nx, oy + uy * L - ny);
            }
            break;
          }
        }
        if (!l.fired) { g.fillStyle(col, 0.9); g.fillCircle(l.x, l.y, 4); g.fillStyle(WAX, 0.9); g.fillCircle(l.x, l.y, 2); }
      }
      noonShadow(g, rail.x, rail.y + 34, 280, 0.28);
    },

    drawAir(g, time) {
      drawRail(g, rail.x, rail.y, queue, time, time - adjournFlash < 400, called);
    },

    drawHud(g) {
      // The beat to the next call.
      const x0 = 24, y = top + 26;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 10, y - 14, 120, 28, 8);
      const total = late ? CALL_LATE_MS : CALL_MS;
      const k = clamp(1 - (nextCall - tk.now) / total, 0, 1);
      g.fillStyle(0x2a2420, 1); g.fillRect(x0, y - 4, 100, 8);
      g.fillStyle(k > 0.75 ? 0xe8642a : GOLD, 1); g.fillRect(x0, y - 4, 100 * k, 8);
      for (let i = 0; i < (late ? 2 : 1); i++) { g.fillStyle(GOLD_LIT, 1); g.fillCircle(x0 + 104 - i * 10, y - 9, 2.5); }
    },

    destroy() { target.remove(); },
  };
}

/** A small glyph of a sentence's form, drawn on a tablet. */
function formGlyph(g: G, f: Form, x: number, y: number, s: number, col: number): void {
  g.lineStyle(2, col, 1);
  switch (f) {
    case 'cross': g.lineBetween(x - s, y, x + s, y); g.lineBetween(x, y - s, x, y + s); break;
    case 'ring': g.strokeCircle(x, y, s * 0.8); g.fillStyle(col, 1); g.fillCircle(x, y, 1.2); break;
    case 'rows': for (const k of [-1, 0, 1]) g.lineBetween(x - s, y + k * s * 0.6 - s * 0.3, x + s, y + k * s * 0.6 + s * 0.3); break;
    case 'spot': g.fillStyle(col, 1); g.fillCircle(x, y, s * 0.7); break;
  }
}

/** The docket rail: two gilt posts, a bar with hooks, and the next four case-tablets hanging in order. */
function drawRail(g: G, x: number, y: number, queue: Case[], time: number, jolt: boolean, called: number): void {
  const half = 120;
  for (const k of [-1, 1]) {
    const px = x + k * half;
    g.fillStyle(BRONZE_DARK, 1); g.fillRect(px - 5, y - 30, 10, 62);
    g.fillStyle(BRONZE, 1); g.fillRect(px - 3, y - 30, 4, 62);
    g.fillStyle(GOLD, 1); g.fillCircle(px, y - 33, 7);
    g.fillStyle(GOLD_LIT, 1); g.fillCircle(px - 2, y - 35, 2.5);
    g.fillStyle(BRONZE_DARK, 1); g.fillRect(px - 9, y + 28, 18, 6);
  }
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - half, y - 26, half * 2, 7);
  g.fillStyle(GOLD, 1); g.fillRect(x - half, y - 26, half * 2, 3);
  // The tablets: the front one (the next called) at the left, by the crier's bell.
  queue.slice(0, 4).forEach((c, i) => {
    const tx = x - 78 + i * 52;
    const sway = Math.sin(time / 400 + i + called) * (jolt && i === 3 ? 6 : 1.5);
    const ty = y - 18;
    g.lineStyle(1.5, BRONZE_DARK, 1); g.lineBetween(tx - 8, ty, tx - 10 + sway, ty + 10); g.lineBetween(tx + 8, ty, tx + 10 + sway, ty + 10);
    const bx = tx + sway, by = ty + 10;
    g.fillStyle(dim(PARCH_DARK, 0.3), 1); g.fillRoundedRect(bx - 20, by, 40, 40, 4);
    g.fillStyle(PARCH, 1); g.fillRoundedRect(bx - 18, by + 2, 36, 36, 3);
    // Ruled lines of the case's writ under the glyph.
    g.lineStyle(1, PARCH_DARK, 0.8);
    for (let r = 0; r < 3; r++) g.lineBetween(bx - 13, by + 26 + r * 4, bx + 13 - r * 4, by + 26 + r * 4);
    formGlyph(g, c.form, bx, by + 14, 8, INK);
    // The seal: whose case it is.
    const col = c.party === 'player' ? SIDE_YOU : SIDE_FOE;
    g.fillStyle(dim(col, 0.35), 1); g.fillCircle(bx + 13, by + 34, 7);
    g.fillStyle(col, 1); g.fillCircle(bx + 13, by + 34, 5.5);
    g.fillStyle(ROBE_DARK, 0.5); g.fillCircle(bx + 13, by + 34, 2);
    if (i === 0) {
      glow(g, bx, by + 20, 30, SUN_HOT, 0.06 + Math.sin(time / 120) * 0.02, 3);
      g.lineStyle(2, SUN, 0.9); g.strokeRoundedRect(bx - 21, by - 1, 42, 42, 5);
    }
  });
  // The crier's bell at the front end.
  const bx = x - half - 18, by = y - 6;
  g.lineStyle(2, BRONZE_DARK, 1); g.lineBetween(x - half, y - 22, bx, y - 22); g.lineBetween(bx, y - 22, bx, by - 8);
  g.fillStyle(GOLD_DARK, 1); g.fillTriangle(bx - 9, by + 6, bx + 9, by + 6, bx, by - 8);
  g.fillStyle(GOLD, 1); g.fillTriangle(bx - 6, by + 5, bx + 4, by + 5, bx - 1, by - 6);
  g.fillStyle(BRONZE_DARK, 1); g.fillCircle(bx, by + 8, 2.5);
}

export const FALLEN_DOCKET: GimmickDef = {
  id: ID,
  rules: 'The rail shows the next four cases, each form and whose it is; called, it falls round them. Strike the rail to send the next case to the back, turned.',
  make,
};
