import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BLUED_LIT, BRASS, BRASS_DARK, BRASS_LIT, COPPER, COPPER_DARK, IRON, IRON_DARK, LAMP_GLOW, NUMERAL } from '../palette';
import { alive, clamp, segDist } from '../util';

/**
 * The Six Pips — Time-Caller Fabian Sixsmith, who sounds the true time from the Hour Office horn so
 * every clock on the hill can be set by it: five short pips, and the sixth, long, on the hour. In the
 * King's telling the pips were the signal for the collectors — on the long pip, whoever had not paid
 * was where the line found them.
 *
 * On every pip, the true time is set down where each of you is standing: a brass time-stud, numbered
 * by its pip. A fighter's studs are joined, pip to pip, by a line of signal. On the long sixth pip
 * the signal runs: a fighter's whole line strikes *the other* fighter if it crosses them. You see his
 * line being laid a second at a time, and you have a breath after the sixth to step off it.
 *
 * So the yard is drawn in your own footsteps, a second apart: run your line through where he will be
 * standing, and keep out of his. Halfway down he adds a leap second — a seventh stud — and calls the
 * pips faster.
 */

const ID = fallenId('clockwork', 'pips');
const PIP_MS = 1000;
const PIP_FAST = 820;
const ARM_MS = 760;
const REST_MS = 1900;
const LINE_HIT = 30;
const EMBER = 0xe8823a;

type Phase = 'rest' | 'pips' | 'armed';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const HORN: Pt = { x: W / 2, y: top + 30 };
  const marks = new Map<Fighter, Pt[]>([[player, []], [npc, []]]);
  let phase: Phase = 'rest';
  let phaseAt = 0;
  let laid = 0;
  let fireAt = 0;
  let leap = false;
  let started = false;
  let firedAt = -1e9;
  let firedLines: { f: Fighter; pts: Pt[] }[] = [];
  let pipFx = -1e9;

  const count = (): number => (leap ? 7 : 6);
  const pipMs = (): number => (leap ? PIP_FAST : PIP_MS);
  const other = (f: Fighter): Fighter => (f === player ? npc : player);
  const color = (f: Fighter): number => (f === player ? BLUED_LIT : EMBER);

  function onLine(f: Fighter, pts: Pt[]): boolean {
    if (!pts.length) return false;
    if (pts.length === 1) return Math.hypot(f.x - pts[0].x, f.y - pts[0].y) < LINE_HIT;
    for (let i = 1; i < pts.length; i++) if (segDist(f.x, f.y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) < LINE_HIT) return true;
    return false;
  }

  function fire(time: number): void {
    firedAt = time;
    firedLines = [];
    for (const f of [player, npc]) {
      const pts = marks.get(f) ?? [];
      firedLines.push({ f, pts: pts.slice() });
      const foe = other(f);
      if (!alive(foe) || !onLine(foe, pts)) continue;
      if (foe === player) tk.hitPlayer(16, foe.x, foe.y);
      else ctx.hit(npc, 26, foe.x, foe.y);
      ctx.flash(foe.x, foe.y, color(f));
    }
    ctx.sfx('sonic-pulse');
    marks.set(player, []);
    marks.set(npc, []);
    phase = 'rest';
    phaseAt = time;
  }

  return {
    update(time) {
      if (!started) { started = true; phaseAt = time; }
      if (!leap && npc.hp < npc.maxHp * 0.5) { leap = true; ctx.banner('A LEAP SECOND', '#ffe2a8'); ctx.sfx('time-warp'); }
      if (phase === 'rest' && time - phaseAt >= REST_MS) { phase = 'pips'; phaseAt = time; laid = 0; }
      if (phase === 'pips') {
        while (laid < count() && time - phaseAt >= laid * pipMs()) {
          for (const f of [player, npc]) if (alive(f)) marks.get(f)?.push({ x: f.x, y: f.y });
          laid++;
          pipFx = time;
          if (laid === count()) {
            ctx.sfx('countdown-go');
            phase = 'armed';
            fireAt = time + tk.warn(ARM_MS);
          } else ctx.sfx('countdown-tick');
        }
      }
      if (phase === 'armed' && time >= fireAt) fire(time);
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const yours = marks.get(player) ?? [];
      if (phase === 'armed' && yours.length) {
        // Off your line, the short way, from its nearest leg.
        let best = -1, bd = 1e9;
        for (let i = 1; i < yours.length; i++) {
          const d = segDist(npc.x, npc.y, yours[i - 1].x, yours[i - 1].y, yours[i].x, yours[i].y);
          if (d < bd) { bd = d; best = i; }
        }
        if (best > 0 && bd < LINE_HIT + 40) {
          const a = yours[best - 1], b = yours[best];
          const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
          const s = (npc.x - a.x) * nx + (npc.y - a.y) * ny >= 0 ? 1 : -1;
          return { x: tk.clampX(npc.x + nx * s * 110), y: tk.clampY(npc.y + ny * s * 110) };
        }
        return null;
      }
      if (phase === 'pips') {
        // Run its line through you: always heading for the far side of where you stand.
        const dx = player.x - npc.x, dy = player.y - npc.y, d = Math.hypot(dx, dy) || 1;
        return { x: tk.clampX(player.x + (dx / d) * 170), y: tk.clampY(player.y + (dy / d) * 170) };
      }
      return null;
    },

    drawGround(g, time) {
      const armK = phase === 'armed' ? clamp(1 - (fireAt - time) / Math.max(1, tk.warn(ARM_MS)), 0, 1) : 0;
      for (const f of [player, npc]) {
        const pts = marks.get(f) ?? [];
        const col = color(f);
        for (let i = 1; i < pts.length; i++) drawSignal(g, pts[i - 1], pts[i], col, time, armK, i);
        // The leg still being laid: from the last stud to the fighter, faint.
        if (phase === 'pips' && pts.length && alive(f)) {
          const p = pts[pts.length - 1];
          g.lineStyle(1, col, 0.22);
          const d = Math.hypot(f.x - p.x, f.y - p.y);
          for (let s = 0; s < d; s += 14) g.lineBetween(p.x + ((f.x - p.x) * s) / d, p.y + ((f.y - p.y) * s) / d, p.x + ((f.x - p.x) * Math.min(d, s + 6)) / d, p.y + ((f.y - p.y) * Math.min(d, s + 6)) / d);
        }
        pts.forEach((p, i) => drawStud(g, p, i + 1, col, time, armK));
      }
      // The signal running: a bright line over every leg, fading.
      const k = (time - firedAt) / 450;
      if (k >= 0 && k < 1) {
        for (const l of firedLines) {
          for (let i = 1; i < l.pts.length; i++) {
            g.lineStyle(10 * (1 - k) + 2, color(l.f), 0.25 * (1 - k)); g.lineBetween(l.pts[i - 1].x, l.pts[i - 1].y, l.pts[i].x, l.pts[i].y);
            g.lineStyle(3, 0xffffff, 0.9 * (1 - k)); g.lineBetween(l.pts[i - 1].x, l.pts[i - 1].y, l.pts[i].x, l.pts[i].y);
          }
        }
      }
    },

    drawAir(g, time) {
      drawHorn(g, HORN, time, clamp(1 - (time - pipFx) / 400, 0, 1), phase === 'armed');
    },

    drawHud(g, time) {
      const n = count();
      const y = top + 16;
      const x0 = W - 30 - n * 22;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x0 - 10, y - 11, n * 22 + 16, 22, 6);
      for (let i = 0; i < n; i++) {
        const lastOne = i === n - 1;
        const on = (phase === 'pips' || phase === 'armed') && i < laid;
        const x = x0 + i * 22;
        g.fillStyle(IRON_DARK, 1);
        if (lastOne) g.fillRoundedRect(x - 4, y - 6, 20, 12, 5); else g.fillCircle(x + 2, y, 6);
        g.fillStyle(on ? (lastOne ? 0xffd080 : LAMP_GLOW) : 0x3a3630, on ? 0.95 : 1);
        if (lastOne) g.fillRoundedRect(x - 2, y - 4, 16, 8, 4); else g.fillCircle(x + 2, y, 4);
        if (on && lastOne && phase === 'armed') glow(g, x + 6, y, 16, 0xffd080, 0.1 + Math.sin(time / 50) * 0.05, 2);
      }
    },
  };
}

/** A brass time-stud let into the setts, with its pip count punched round the rim. */
function drawStud(g: G, p: Pt, n: number, col: number, time: number, armK: number): void {
  shadow(g, p.x, p.y + 2, 30, 10, 0.3);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(p.x, p.y + 1.5, 26, 13);
  g.fillStyle(BRASS, 1); g.fillEllipse(p.x, p.y, 24, 11);
  g.lineStyle(2, col, 0.6 + armK * 0.4); g.strokeEllipse(p.x, p.y, 24, 11);
  g.fillStyle(BRASS_LIT, 0.8); g.fillEllipse(p.x - 3, p.y - 2, 8, 3);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    g.fillStyle(NUMERAL, 0.85); g.fillCircle(p.x + Math.cos(a) * 7, p.y + Math.sin(a) * 3.2, 1.2);
  }
  if (armK > 0) glow(g, p.x, p.y, 16, col, 0.05 + armK * 0.06 + Math.sin(time / 60 + n) * 0.02, 2);
}

/** One leg of the signal: a wavering tone-line between two studs, steadying and brightening as it arms. */
function drawSignal(g: G, a: Pt, b: Pt, col: number, time: number, armK: number, seed: number): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 2) return;
  const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, nx = -uy, ny = ux;
  if (armK > 0) { g.lineStyle(LINE_HIT * 2 - 20, col, 0.07 + armK * 0.1); g.lineBetween(a.x, a.y, b.x, b.y); }
  g.lineStyle(armK > 0 ? 2.5 : 1.5, col, 0.35 + armK * 0.5);
  g.beginPath();
  const steps = Math.max(4, Math.floor(len / 8));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const amp = (armK > 0 ? 2 + armK * 4 : 3) * Math.sin(t * Math.PI);
    const w = Math.sin(t * len * 0.18 - time / 50 + seed) * amp;
    const x = a.x + ux * len * t + nx * w, y = a.y + uy * len * t + ny * w;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
}

/** The Hour Office horn on its mast: a copper flare on a brass elbow, ringing out each pip. */
function drawHorn(g: G, p: Pt, time: number, ring: number, armed: boolean): void {
  g.fillStyle(IRON_DARK, 1); g.fillRect(p.x - 3, p.y - 30, 6, 30);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(p.x, p.y - 30, 6);
  // The flare, opening downward into the yard.
  g.fillStyle(COPPER_DARK, 1);
  g.fillTriangle(p.x - 6, p.y - 34, p.x + 6, p.y - 34, p.x + 26, p.y - 6);
  g.fillTriangle(p.x - 6, p.y - 34, p.x - 26, p.y - 6, p.x + 26, p.y - 6);
  g.fillStyle(COPPER, 1); g.fillEllipse(p.x, p.y - 6, 54, 16);
  g.fillStyle(IRON, 1); g.fillEllipse(p.x, p.y - 5, 40, 10);
  g.lineStyle(1.5, BRASS_LIT, 0.8); g.strokeEllipse(p.x, p.y - 6, 54, 16);
  if (ring > 0) {
    for (let i = 0; i < 3; i++) {
      g.lineStyle(2, LAMP_GLOW, ring * (0.7 - i * 0.2));
      g.beginPath(); g.arc(p.x, p.y - 4, 30 + (1 - ring) * 40 + i * 12, 0.3, Math.PI - 0.3, false); g.strokePath();
    }
  }
  if (armed) glow(g, p.x, p.y - 6, 30, 0xffd080, 0.06 + Math.sin(time / 50) * 0.03, 2);
}

export const FALLEN_SIX_PIPS: GimmickDef = {
  id: ID,
  rules: 'Each pip sets a stud where you stand, joined to the last. On the long sixth pip your line strikes him if it crosses him, and his strikes you.',
  make,
};
