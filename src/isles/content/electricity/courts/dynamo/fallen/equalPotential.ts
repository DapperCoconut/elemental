import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { bolt, gridSeal, leydenBank, sparks } from '../art';
import {
  ARC, ARC_VIOLET, BRASS, BRASS_DARK, BRASS_LIT, COPPER, COPPER_DARK, COPPER_LIT, FOIL, GLASS, GLASS_LIT, IRON,
  IRON_DARK, IRON_LIT, OFF_RED, SPARK,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Equal Potential — Jar-Mistress Odalys Trune, keeper of the Leyden banks beside the Generator
 * Hall. In the King's telling she was the one who "settled" a short household: she sat the
 * householder down with a charged jar in their lap and let them hold it until the debt felt paid.
 *
 * In her yard every fighter is a Leyden jar. Each blow you take stores charge in you (the jar in
 * your corner of the HUD fills, and you crackle). Charge does nothing on its own — but come close
 * to the other fighter and the fuller jar *equalises* into the emptier: a crackling leader joins
 * you for half a second, then the difference strikes the emptier one, and both settle at the
 * average. So being beaten is ammunition: soak a few blows, then walk into her. Fill to the brim
 * and you flash over on your own, stunned. Three iron earthing grates drain whoever stands on them,
 * harmlessly — the safe way to empty a jar you can't use. Halfway down, the banks start to leak:
 * every few seconds both jars gain a little on their own, so nobody can sit on a full one.
 *
 * The bot walks into you when she is the fuller jar, keeps her distance when you are, and goes to a
 * grate when she is near the brim with nobody to spend it on.
 */

const ID = fallenId('dynamo', 'equal-potential');
const MAX = 8;
const ARC_R = 130;
const LEAD_MS = 560;
const PLATE_R = 40;
const DRAIN = 2.2;
const PER_PIP = 6;

interface Pending { from: Fighter; to: Fighter; at: number; fireAt: number }
interface Flash { a: Pt; b: Pt; at: number; color: number; w: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const plates: Pt[] = [{ x: 150, y: top + 120 }, { x: W - 150, y: top + 120 }, { x: W / 2, y: H - 70 }];
  const charge = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let quiet = false;
  let pending: Pending | null = null;
  let readyAt = 0;
  let leaking = false;
  let nextLeak = 0;
  const flashes: Flash[] = [];

  const get = (f: Fighter) => charge.get(f) ?? 0;
  const set = (f: Fighter, v: number) => charge.set(f, clamp(v, 0, MAX));
  const other = (f: Fighter) => (f === player ? npc : player);
  const onPlate = (f: Fighter) => plates.find((p) => dist(p.x, p.y, f.x, f.y) < PLATE_R);

  /** Gimmick damage that must not itself charge the receiver (no ping-pong). */
  function hurt(f: Fighter, n: number): void {
    quiet = true;
    if (f === player) tk.hitPlayer(n, f.x, f.y);
    else ctx.hit(f, n, f.x, f.y);
    quiet = false;
  }

  function store(f: Fighter, amount: number): void {
    if (quiet) return;
    set(f, get(f) + clamp(amount / 9, 0.35, 2));
  }

  function flashOver(f: Fighter, time: number): void {
    const p = plates.slice().sort((a, b) => dist(a.x, a.y, f.x, f.y) - dist(b.x, b.y, f.x, f.y))[0];
    flashes.push({ a: { x: f.x, y: f.y - 14 }, b: p, at: time, color: ARC_VIOLET, w: 5 });
    set(f, 0);
    hurt(f, 14);
    ctx.stun(f, 500);
    ctx.float(f.x, f.y - 50, 'FLASHED OVER', f === player ? '#ffb0a0' : '#bff0ff');
    ctx.sfx('explosion-small');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!alive(player) || !alive(npc)) return;
      if (!leaking && npc.hp < npc.maxHp * 0.5) {
        leaking = true; nextLeak = time + 1500;
        ctx.banner('The banks are leaking — every jar fills on its own now', '#bff0ff');
        ctx.sfx('electric-charge');
      }
      if (leaking && time >= nextLeak) {
        nextLeak = time + 3200;
        for (const f of [player, npc]) set(f, get(f) + 1);
        ctx.sfx('status-shock');
      }
      // Earthing grates bleed a jar dry, safely.
      for (const f of [player, npc]) if (onPlate(f)) set(f, get(f) - DRAIN * dt);
      for (const f of [player, npc]) if (get(f) >= MAX) flashOver(f, time);

      // Equalising: the fuller jar leads to the emptier one, then strikes.
      const d = dist(player.x, player.y, npc.x, npc.y);
      const gap = get(player) - get(npc);
      if (!pending && time >= readyAt && d < ARC_R && Math.abs(gap) >= 1.5) {
        const from = gap > 0 ? player : npc;
        pending = { from, to: other(from), at: time, fireAt: time + LEAD_MS };
        ctx.sfx('electric-charge');
      }
      if (pending && time >= pending.fireAt) {
        const { from, to } = pending;
        const diff = get(from) - get(to);
        pending = null; readyAt = time + 1100;
        if (dist(from.x, from.y, to.x, to.y) < ARC_R + 30 && diff >= 1) {
          const avg = (get(from) + get(to)) / 2;
          set(from, avg); set(to, avg);
          hurt(to, Math.round(diff * PER_PIP));
          flashes.push({ a: { x: from.x, y: from.y - 16 }, b: { x: to.x, y: to.y - 16 }, at: time, color: ARC, w: 3 + diff });
          ctx.flash(to.x, to.y, ARC);
          ctx.float(to.x, to.y - 52, to === npc ? 'EQUALISED' : 'DISCHARGED INTO YOU', to === npc ? '#bff0ff' : '#ffb0a0');
          ctx.sfx('thunder');
        } else ctx.sfx('sizzle');
      }
      for (let i = flashes.length - 1; i >= 0; i--) if (time - flashes[i].at > 420) flashes.splice(i, 1);
    },

    onPlayerHurt(amount) { store(player, amount); },
    onNpcHurt(amount) { store(npc, amount); },

    npcSeek() {
      if (!alive(player)) return null;
      const mine = get(npc), yours = get(player);
      if (mine >= yours + 1.5) return { x: player.x, y: player.y };
      if (yours >= mine + 1.5) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(npc.x + Math.cos(a) * 200, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 200, top + 50, H - 40) };
      }
      if (mine >= MAX - 2) {
        const p = plates.slice().sort((a, b) => dist(a.x, a.y, npc.x, npc.y) - dist(b.x, b.y, npc.x, npc.y))[0];
        return { x: p.x, y: p.y };
      }
      return null;
    },

    drawGround(g, time) {
      // The bank itself along the north wall, its jars lit by the two fighters' total.
      const total = (get(player) + get(npc)) / (MAX * 2);
      leydenBank(g, W / 2, top + 64, 7, 0.3 + total * 0.7);
      if (leaking) for (let i = 0; i < 7; i++) sparks(g, W / 2 - 90 + i * 30, top - 12, 8, time + i * 90, 2, ARC);
      for (const p of plates) drawGrate(g, p, time, [player, npc].some((f) => alive(f) && dist(p.x, p.y, f.x, f.y) < PLATE_R));
      // Each fighter's stored charge: a ring of foil-blue crackle round the feet.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const k = get(f) / MAX;
        if (k <= 0.02) continue;
        const col = k > 0.8 ? OFF_RED : ARC;
        g.lineStyle(2, col, 0.25 + k * 0.5); g.strokeEllipse(f.x, f.y + 4, 46 + k * 20, 16 + k * 7);
        sparks(g, f.x, f.y - 10, 14 + k * 16, time + (f === npc ? 300 : 0), Math.ceil(k * 8), col);
      }
      // The reach at which jars equalise, shown faintly between the two when it is live.
      if (alive(player) && alive(npc) && Math.abs(get(player) - get(npc)) >= 1.5) {
        const mx = (player.x + npc.x) / 2, my = (player.y + npc.y) / 2;
        g.lineStyle(1, ARC_VIOLET, 0.18); g.strokeCircle(mx, my, ARC_R / 2);
      }
    },

    drawAir(g, time) {
      if (pending) {
        const k = clamp((time - pending.at) / LEAD_MS, 0, 1);
        const { from, to } = pending;
        bolt(g, from.x, from.y - 16, to.x, to.y - 16, Math.floor(time / 40), 1 + k * 2, ARC_VIOLET, 0.3 + k * 0.6, 18, false);
        glow(g, to.x, to.y - 10, 30 + k * 20, ARC, 0.05 + k * 0.05, 2);
      }
      for (const f of flashes) {
        const k = clamp((time - f.at) / 420, 0, 1);
        bolt(g, f.a.x, f.a.y, f.b.x, f.b.y, Math.floor(time / 45) + f.at, f.w * (1 - k) + 1, f.color, 1 - k, 16);
        glow(g, f.b.x, f.b.y, 60, f.color, 0.1 * (1 - k), 3);
        sparks(g, f.b.x, f.b.y, 26, time, 7, SPARK);
      }
    },

    drawHud(g) {
      drawJar(g, 28, top + 8, get(player), false);
      drawJar(g, W - 28, top + 8, get(npc), true);
    },
  };
}

/** An earthing grate: a cast-iron grid in a copper-banded frame, the earth tape out to a stake. */
function drawGrate(g: G, p: Pt, time: number, busy: boolean): void {
  shadow(g, p.x, p.y + 4, PLATE_R * 2.2, 16, 0.3);
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(p.x, p.y, PLATE_R * 2, PLATE_R * 0.9);
  g.lineStyle(3, COPPER_DARK, 1); g.strokeEllipse(p.x, p.y, PLATE_R * 2, PLATE_R * 0.9);
  g.lineStyle(1.5, COPPER_LIT, 0.6); g.strokeEllipse(p.x, p.y - 1, PLATE_R * 1.9, PLATE_R * 0.82);
  for (let i = -3; i <= 3; i++) {
    const w = Math.sqrt(Math.max(0, 1 - (i / 3.6) ** 2));
    g.lineStyle(2, IRON_LIT, 0.8);
    g.lineBetween(p.x + i * 10, p.y - PLATE_R * 0.42 * w, p.x + i * 10, p.y + PLATE_R * 0.42 * w);
    g.lineBetween(p.x - PLATE_R * 0.9 * w, p.y + i * 5, p.x + PLATE_R * 0.9 * w, p.y + i * 5);
  }
  gridSeal(g, p.x, p.y, 6, BRASS_DARK);
  // Earth tape to its stake.
  g.lineStyle(3, COPPER, 1); g.lineBetween(p.x + PLATE_R, p.y, p.x + PLATE_R + 22, p.y + 10);
  g.fillStyle(BRASS, 1); g.fillCircle(p.x + PLATE_R + 24, p.y + 11, 4);
  g.fillStyle(IRON, 1); g.fillRect(p.x + PLATE_R + 22, p.y + 11, 4, 8);
  if (busy) {
    sparks(g, p.x, p.y, PLATE_R, time, 10, ARC);
    glow(g, p.x, p.y, PLATE_R, ARC, 0.07, 2);
  }
}

/** A Leyden jar gauge: glass, a foil sleeve, eight foil bands that light as the jar fills, knob on top. */
function drawJar(g: G, x: number, y: number, v: number, right: boolean): void {
  const w = 26, h = 54, x0 = x - w / 2;
  g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 5, y - 4, w + 10, h + 26, 6);
  g.fillStyle(GLASS, 0.22); g.fillRoundedRect(x0, y + 16, w, h, 7);
  g.fillStyle(FOIL, 0.35); g.fillRoundedRect(x0 + 2, y + 16 + h * 0.3, w - 4, h * 0.7 - 2, 5);
  for (let i = 0; i < MAX; i++) {
    const by = y + 16 + h - 5 - i * 6;
    const on = v >= i + 1, part = !on && v > i;
    const col = i >= MAX - 2 ? OFF_RED : i >= MAX - 4 ? SPARK : ARC;
    g.fillStyle(on ? col : part ? col : 0x1a1d24, on ? 0.95 : part ? 0.4 : 0.8);
    g.fillRect(x0 + 4, by, w - 8, 4);
  }
  g.lineStyle(1.5, GLASS_LIT, 0.6); g.strokeRoundedRect(x0, y + 16, w, h, 7);
  g.fillStyle(0x2a1a10, 1); g.fillRect(x0 + 5, y + 11, w - 10, 6);
  g.lineStyle(2, BRASS, 1); g.lineBetween(x, y + 11, x, y + 3);
  g.fillStyle(v >= MAX - 1.5 ? OFF_RED : BRASS_LIT, 1); g.fillCircle(x, y + 1, 4);
  // A tiny chain from the knob toward the middle of the screen, as on the bank.
  g.lineStyle(1, COPPER, 0.8); g.lineBetween(x, y + 1, x + (right ? -16 : 16), y + 4);
}

export const FALLEN_EQUAL_POTENTIAL: GimmickDef = {
  id: ID,
  rules: 'Blows taken charge you like a Leyden jar. Near her, the fuller jar arcs the difference into the emptier. Grates drain you. Full, you flash over.',
  make,
};
