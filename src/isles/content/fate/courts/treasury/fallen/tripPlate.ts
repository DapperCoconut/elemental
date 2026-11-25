import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRASS, BRASS_DARK, BRASS_LIT, CARD_RED, IRON, IRON_DARK, IRON_LIT, STEEL, STEEL_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Trip-Plate — Strongroom-Warden Leocadia Brassey, in the King's telling the keeper of the Great
 * Vault's floor, who wired the room where the Lot Register lies so that no thief, and no family
 * come to look up its own number, could cross it unheard.
 *
 * The strongroom floor is laid in steel plates, and some of them are armed — a red stud glows in
 * each. Step on an armed plate (a dash skips it) and it trips: the alarm rings, and a beat later
 * the bolt-guns in the walls fire down that plate's whole row and whole column. The one who
 * tripped it stands on both lines; get off diagonally. That is the exploit too: trip a plate that
 * shares a row or a column with her, then step out of the cross. Strike the alarm bell over the
 * door and the warden re-sets the combination — every armed plate moves round your foe.
 * Halfway down the wiring is crossed: a tripped plate trips every armed plate on its lines.
 */

const ID = fallenId('treasury', 'trip-plate');
const COLS = 9;
const ROWS = 5;
const PW = 96;
const PH = 100;
const ARMED = 6;
const WARN_MS = 950;
const BOLT_DMG = 15;
const BOLT_STUN = 450;
const REARM_MS = 1300;
const BELL_CD = 6000;

/** One plate of the floor. */
interface Plate { c: number; r: number; armed: boolean; trippedAt: number }
/** A tripped plate's cross, waiting to fire or fired. */
interface Cross { c: number; r: number; fireAt: number; fired: boolean; chained: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const X0 = (W - COLS * PW) / 2;
  const Y0 = top + (H - top - ROWS * PH) / 2;
  const plates: Plate[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) plates.push({ c, r, armed: false, trippedAt: -9999 });
  const crosses: Cross[] = [];
  const rearmAt: number[] = [];
  let crossed = false;
  let started = false;
  let bellAt = -9999;
  let npcEscape: Pt | null = null;

  const colOf = (x: number) => clamp(Math.floor((x - X0) / PW), 0, COLS - 1);
  const rowOf = (y: number) => clamp(Math.floor((y - Y0) / PH), 0, ROWS - 1);
  const plateOf = (f: Fighter) => plates[rowOf(f.y) * COLS + colOf(f.x)];
  const centre = (p: { c: number; r: number }) => ({ x: X0 + p.c * PW + PW / 2, y: Y0 + p.r * PH + PH / 2 });
  const inCross = (x: number, y: number, k: Cross) => Math.abs(y - (Y0 + k.r * PH + PH / 2)) < PH / 2 + 6 || Math.abs(x - (X0 + k.c * PW + PW / 2)) < PW / 2 + 6;
  const threatened = (x: number, y: number) => crosses.some((k) => !k.fired && inCross(x, y, k));

  /** Arm one plate, never under or beside a fighter, never on a live line. */
  function armOne(near?: Fighter): boolean {
    const pool = plates.filter((p) => {
      if (p.armed) return false;
      for (const f of [player, npc]) {
        const q = plateOf(f);
        if (Math.max(Math.abs(q.c - p.c), Math.abs(q.r - p.r)) <= 1) return false;
      }
      if (near) { const q = plateOf(near); if (Math.max(Math.abs(q.c - p.c), Math.abs(q.r - p.r)) > 2) return false; }
      const c = centre(p);
      return !threatened(c.x, c.y);
    });
    if (!pool.length) return false;
    pool[Math.floor(rng() * pool.length)].armed = true;
    return true;
  }

  function trip(p: Plate, time: number, chained: boolean): void {
    if (!p.armed) return;
    p.armed = false;
    p.trippedAt = time;
    crosses.push({ c: p.c, r: p.r, fireAt: time + tk.warn(WARN_MS), fired: false, chained });
    rearmAt.push(time + REARM_MS);
    ctx.sfx(chained ? 'electric-charge' : 'trap-snap');
    if (crossed && !chained) {
      for (const q of plates) if (q.armed && (q.r === p.r || q.c === p.c)) tk.schedule(320, () => trip(q, ctx.scene.time.now, true));
    }
  }

  function fire(k: Cross): void {
    k.fired = true;
    ctx.sfx('zap'); ctx.sfx('thunder');
    for (const f of [player, npc]) {
      if (!alive(f) || !inCross(f.x, f.y, k)) continue;
      ctx.hit(f, BOLT_DMG, f.x, f.y);
      ctx.stun(f, BOLT_STUN);
    }
  }

  /** The bell: every armed plate is re-set round the striker's foe. */
  function ringBell(by: 'player' | 'npc', time: number): void {
    if (time - bellAt < BELL_CD) return;
    bellAt = time;
    const foe = by === 'player' ? npc : player;
    const n = plates.filter((p) => p.armed).length;
    for (const p of plates) p.armed = false;
    let placed = 0;
    for (let i = 0; i < n; i++) if (armOne(foe)) placed++;
    for (let i = placed; i < n; i++) armOne();
    ctx.sfx('countdown-go'); ctx.sfx('chain');
    ctx.float(W / 2, top + 40, 'COMBINATION RE-SET', '#ff8a7a');
  }

  const BELL = { x: W / 2, y: Y0 - 2 };
  const bell: StrikeTarget = ctx.target({ x: BELL.x, y: BELL.y, r: 22, passThrough: true, onStruck: (by) => ringBell(by, ctx.scene.time.now) });

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; for (let i = 0; i < ARMED; i++) armOne(); ctx.banner('THE FLOOR IS ARMED', '#ff9a8a'); }
      if (!crossed && alive(npc) && npc.hp < npc.maxHp * 0.5) { crossed = true; ctx.banner('THE WIRING IS CROSSED', '#ff7a6a'); ctx.sfx('glitch'); }
      for (const f of [player, npc]) {
        if (!alive(f) || ctx.dashing(f) || ctx.isAirborne(f)) continue;
        const p = plateOf(f);
        if (!p.armed) continue;
        const c = centre(p);
        if (Math.abs(f.x - c.x) < PW / 2 - 10 && Math.abs(f.y - c.y) < PH / 2 - 10) {
          trip(p, time, false);
          if (f === npc) {
            // The warden steps off on the diagonal, away from you.
            const opts = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dc, dr]) => ({ c: p.c + dc, r: p.r + dr }))
              .filter((q) => q.c >= 0 && q.c < COLS && q.r >= 0 && q.r < ROWS && !plates[q.r * COLS + q.c].armed);
            opts.sort((a, b) => dist(centre(b).x, centre(b).y, player.x, player.y) - dist(centre(a).x, centre(a).y, player.x, player.y));
            npcEscape = opts.length ? centre(opts[0]) : null;
          }
        }
      }
      for (const k of crosses) if (!k.fired && time >= k.fireAt) fire(k);
      for (let i = crosses.length - 1; i >= 0; i--) if (crosses[i].fired && time - crosses[i].fireAt > 400) crosses.splice(i, 1);
      for (let i = rearmAt.length - 1; i >= 0; i--) {
        if (time < rearmAt[i]) continue;
        if (plates.filter((p) => p.armed).length < ARMED) armOne();
        rearmAt.splice(i, 1);
      }
      if (npcEscape && (dist(npc.x, npc.y, npcEscape.x, npcEscape.y) < 24 || !crosses.some((k) => !k.fired))) npcEscape = null;
    },

    npcSeek() {
      if (npcEscape) return npcEscape;
      // On a live line: the nearest plate centre off every line.
      if (threatened(npc.x, npc.y)) {
        let best: Pt | null = null, bd = Infinity;
        for (const p of plates) {
          const c = centre(p);
          if (p.armed || threatened(c.x, c.y)) continue;
          const d = dist(c.x, c.y, npc.x, npc.y);
          if (d < bd) { bd = d; best = c; }
        }
        return best;
      }
      // An armed plate on your row or your column, within a short walk: trip it.
      const pp = plateOf(player);
      let pick: Pt | null = null, pd = 380;
      for (const p of plates) {
        if (!p.armed || (p.r !== pp.r && p.c !== pp.c)) continue;
        const c = centre(p);
        const d = dist(c.x, c.y, npc.x, npc.y);
        if (d < pd) { pd = d; pick = c; }
      }
      if (pick) return pick;
      // Otherwise off your lines, at range, and off the armed plates.
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const x = clamp(player.x + Math.cos(a) * 230, X0 + 30, X0 + COLS * PW - 30), y = clamp(player.y + Math.sin(a) * 200, Y0 + 30, Y0 + ROWS * PH - 30);
        const q = plates[rowOf(y) * COLS + colOf(x)];
        if (!q.armed && q.r !== pp.r && q.c !== pp.c && !threatened(x, y)) return { x, y };
      }
      return null;
    },

    drawGround(g, time) {
      for (const p of plates) {
        const c = centre(p);
        floorPlate(g, c.x, c.y, p.armed, time, time - p.trippedAt);
      }
      // A cross waiting to fire: its row and column fill with red hatching toward the bolt.
      for (const k of crosses) {
        const c = centre(k);
        const rx = X0, ry = Y0 + k.r * PH, cx = X0 + k.c * PW, cy = Y0;
        if (!k.fired) {
          const q = clamp(1 - (k.fireAt - time) / tk.warn(WARN_MS), 0, 1);
          g.fillStyle(CARD_RED, 0.1 + q * 0.2); g.fillRect(rx, ry, COLS * PW, PH); g.fillRect(cx, cy, PW, ROWS * PH);
          g.lineStyle(1.2, CARD_RED, 0.3 + q * 0.5);
          for (let x = rx; x < rx + COLS * PW; x += 18) g.lineBetween(x, ry + PH, x + PH * 0.4, ry);
          for (let y = cy; y < cy + ROWS * PH; y += 18) g.lineBetween(cx, y, cx + PW, y + PW * 0.4);
          g.lineStyle(2, 0xff6050, 0.5 + q * 0.5); g.strokeRect(rx, ry, COLS * PW, PH); g.strokeRect(cx, cy, PW, ROWS * PH);
          glow(g, c.x, c.y, 50, CARD_RED, 0.06 + q * 0.08, 3);
        }
      }
    },

    drawAir(g, time) {
      // The bolt-guns in the four walls, one per row and per column.
      for (let r = 0; r < ROWS; r++) { const y = Y0 + r * PH + PH / 2; boltGun(g, X0 - 10, y, 0); boltGun(g, X0 + COLS * PW + 10, y, Math.PI); }
      for (let c = 0; c < COLS; c++) { const x = X0 + c * PW + PW / 2; boltGun(g, x, H - 8, -Math.PI / 2); }
      // Fired crosses: two bolts of lightning down the row and the column.
      for (const k of crosses) {
        if (!k.fired) continue;
        const q = clamp((time - k.fireAt) / 400, 0, 1);
        const c = centre(k);
        bolt(g, X0, c.y, X0 + COLS * PW, c.y, 1 - q, time + k.c * 17);
        bolt(g, c.x, Y0, c.x, Y0 + ROWS * PH, 1 - q, time + k.r * 31);
      }
      // The alarm bell over the strongroom door.
      alarmBell(g, BELL.x, BELL.y, crosses.some((k) => !k.fired) ? time : 0, clamp(1 - (time - bellAt) / BELL_CD, 0, 1));
    },

    drawHud(g, time) {
      const x = 24, y = H - 30;
      const n = plates.filter((p) => p.armed).length;
      for (let i = 0; i < ARMED; i++) {
        g.fillStyle(IRON_DARK, 0.9); g.fillRect(x + i * 20, y - 6, 16, 16);
        g.fillStyle(i < n ? 0xff4a3a : IRON, i < n ? 0.6 + 0.4 * Math.sin(time / 180 + i) : 1); g.fillCircle(x + i * 20 + 8, y + 2, 4);
      }
      if (crossed) { g.lineStyle(2, 0xff6050, 1); g.lineBetween(x + 128, y - 6, x + 140, y + 10); g.lineBetween(x + 140, y - 6, x + 128, y + 10); }
      const bk = clamp((time - bellAt) / BELL_CD, 0, 1);
      g.fillStyle(IRON_DARK, 0.8); g.fillRect(x, y + 14, 116, 4);
      g.fillStyle(BRASS_LIT, 1); g.fillRect(x, y + 14, 116 * bk, 4);
    },

    destroy() { bell.remove(); },
  };
}

/** A riveted steel floor plate: bevel, tread, four rivets, and the alarm stud — red and pulsing when armed. */
function floorPlate(g: G, x: number, y: number, armed: boolean, time: number, sinceTrip: number): void {
  const hw = PW / 2 - 2, hh = PH / 2 - 2;
  g.fillStyle(IRON_DARK, 0.75); g.fillRect(x - hw, y - hh, hw * 2, hh * 2);
  g.fillStyle(STEEL, 0.32); g.fillRect(x - hw + 3, y - hh + 3, hw * 2 - 6, hh * 2 - 6);
  g.lineStyle(1, STEEL_LIT, 0.3); g.lineBetween(x - hw + 3, y - hh + 3, x + hw - 3, y - hh + 3);
  // Diamond tread.
  g.lineStyle(1, IRON_LIT, 0.18);
  for (let k = -3; k <= 3; k++) { g.lineBetween(x + k * 14 - 8, y - 10, x + k * 14 + 8, y + 10); g.lineBetween(x + k * 14 + 8, y - 10, x + k * 14 - 8, y + 10); }
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.fillStyle(IRON_LIT, 0.7); g.fillCircle(x + dx * (hw - 8), y + dy * (hh - 8), 2.2); }
  // The stud: a brass ring, its glass red when armed.
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 8);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, 6);
  if (armed) {
    const pulse = 0.6 + 0.4 * Math.sin(time / 160 + x * 0.05);
    g.fillStyle(0xff3a2a, pulse); g.fillCircle(x, y, 4.5);
    glow(g, x, y, 22, 0xff3a2a, 0.05 * pulse, 3);
    g.lineStyle(1, 0xff6050, 0.35 * pulse); g.strokeRect(x - hw + 6, y - hh + 6, hw * 2 - 12, hh * 2 - 12);
  } else { g.fillStyle(0x3a1010, 1); g.fillCircle(x, y, 4); }
  if (sinceTrip < 600) {
    const k = sinceTrip / 600;
    g.lineStyle(2 * (1 - k), 0xffe0a0, 1 - k); g.strokeCircle(x, y, 10 + k * 30);
    for (let s = 0; s < 4; s++) { const a = s * 1.7 + sinceTrip * 0.02; g.lineBetween(x, y, x + Math.cos(a) * 18 * (1 - k), y + Math.sin(a) * 18 * (1 - k)); }
  }
}

/** A wall bolt-gun: a brass box with a blued barrel pointing into the room along `a`. */
function boltGun(g: G, x: number, y: number, a: number): void {
  const c = Math.cos(a), s = Math.sin(a);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 8);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, 6);
  g.lineStyle(4, IRON_DARK, 1); g.lineBetween(x, y, x + c * 14, y + s * 14);
  g.lineStyle(1.4, IRON_LIT, 1); g.lineBetween(x, y, x + c * 13, y + s * 13);
}

/** A bolt of current down a line: a white core and two jagged arcs that re-draw every few ms. */
function bolt(g: G, x0: number, y0: number, x1: number, y1: number, a: number, seed: number): void {
  if (a <= 0) return;
  const L = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
  g.lineStyle(14 * a, 0xff6050, 0.25 * a); g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(4 * a, 0xfff4e0, a); g.lineBetween(x0, y0, x1, y1);
  for (let arc = 0; arc < 2; arc++) {
    let px = x0, py = y0;
    g.lineStyle(1.6, arc ? 0xffb0a0 : 0xc8e8ff, a);
    for (let k = 1; k <= 16; k++) {
      const t = k / 16;
      const j = Math.sin(seed * 0.05 + k * 2.3 + arc * 4) * 12 * a;
      const qx = x0 + (x1 - x0) * t + nx * j, qy = y0 + (y1 - y0) * t + ny * j;
      g.lineBetween(px, py, qx, qy); px = qx; py = qy;
    }
  }
}

/** The alarm bell over the door: a brass gong on a bracket, its hammer chattering while a cross is live. */
function alarmBell(g: G, x: number, y: number, ringing: number, cooling: number): void {
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 3, y - 26, 6, 12);
  const shake = ringing ? Math.sin(ringing / 22) * 2 : 0;
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x + shake, y - 6, 14);
  g.fillStyle(cooling > 0 ? BRASS : BRASS_LIT, 1); g.fillCircle(x + shake, y - 6, 11);
  g.fillStyle(0xffffff, 0.35); g.fillEllipse(x - 4 + shake, y - 11, 7, 4);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x + shake, y - 6, 2.5);
  g.lineStyle(2, IRON, 1); g.lineBetween(x + 16, y - 20, x + 6 + (ringing ? Math.sin(ringing / 15) * 4 : 0), y - 8);
  if (ringing) glow(g, x, y - 6, 30, CARD_RED, 0.06, 2);
}

export const FALLEN_TRIP_PLATE: GimmickDef = {
  id: ID,
  rules: 'Step on a red-studded plate: a beat later its row and column are bolted. Step off diagonally. Trip one on her lines; the bell re-sets them.',
  make,
};
