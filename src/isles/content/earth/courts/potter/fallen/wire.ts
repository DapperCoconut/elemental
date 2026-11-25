import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, mixC, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  IRON, IRON_LIT, MARL, MARL_DARK, MARL_LIT, SLIP_DARK, SLIP_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT,
} from '../palette';
import { alive, clamp, dist, segDist, wrapAngle } from '../util';

/**
 * Wired Off — Teasel Marrick, Cut-Off Hand of the Throwing Houses.
 *
 * Every pot in the court leaves the wheel the same way: a twisted wire, a wooden toggle at each
 * end, drawn flat under its foot. Teasel cut them off for forty years. In the King's telling she
 * cut households off the muster roll the same way — one clean pull, and they were gone.
 *
 * Here the wire is huge. One toggle is lashed to a stake driven into the yard; the other is in
 * a fighter's fist. The wire runs taut between them and cuts anyone *else* it passes through, so
 * the holder sweeps it by walking — round the stake, it scythes the floor. It pays out only so
 * far: past its length the stake hauls the holder back. A dash or a leap clears the wire.
 *
 * Strike a stake and its toggle jumps to your hand — now you sweep, and she dodges. Halfway down,
 * the second stake strings itself to her, so a careless player can be caught between two wires.
 * The bot sweeps round its stake to drag the wire through you, and walks to strike yours.
 */

const ID = fallenId('potter', 'wire');
/** How far the wire pays out from its stake. */
const LEN = 430;
/** The wire's bite either side of its line (a body's radius is added). */
const BITE = 12;
const CUT = 11;
const REBITE_MS = 650;
const STAKE_R = 26;
/** A stake that has just changed hands cannot change again for this long. */
const SWAP_MS = 1100;
const PLAYER_C = 0x8fd0ff;
const FOE_C = 0xffa040;

interface Stake { x: number; y: number; holder: Fighter | null; tgt: StrikeTarget | null; swappedAt: number; bit: Map<Fighter, number>; flashAt: number }
interface Hump { x: number; y: number; r: number; a: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const stakes: Stake[] = [
    { x: 170, y: top + 120, holder: npc, tgt: null, swappedAt: -1e9, bit: new Map(), flashAt: -1e9 },
    { x: W - 170, y: H - 110, holder: null, tgt: null, swappedAt: -1e9, bit: new Map(), flashAt: -1e9 },
  ];
  // Wedged humps of clay lying about the yard, each with a flat face where a wire went through.
  const humps: Hump[] = [];
  for (let i = 0; i < 6; i++) humps.push({ x: 120 + rng() * (W - 240), y: top + 70 + rng() * (H - top - 140), r: 16 + rng() * 10, a: rng() * Math.PI });
  let half = false;
  let npcSlowUntil = 0;
  let now = 0;

  const other = (f: Fighter): Fighter => (f === player ? npc : player);

  function take(s: Stake, by: Fighter): void {
    if (s.holder === by || now - s.swappedAt < SWAP_MS) return;
    s.holder = by;
    s.swappedAt = now;
    s.flashAt = now;
    ctx.sfx('snap-back');
    ctx.float(s.x, s.y - 70, by === player ? 'THE TOGGLE IS YOURS' : 'SHE TAKES THE TOGGLE', by === player ? '#8fd0ff' : '#ffa040');
  }

  for (const s of stakes) {
    s.tgt = ctx.target({ x: s.x, y: s.y - 20, r: STAKE_R, onStruck: (by) => take(s, by === 'player' ? player : npc) });
  }

  /** The wire's free end: the holder's hand. */
  const hand = (f: Fighter): Pt => ({ x: f.x + 10, y: f.y - 14 });

  return {
    update(time) {
      now = time;
      if (!half && npc.hp < npc.maxHp * 0.5) {
        half = true;
        for (const s of stakes) if (!s.holder) { s.holder = npc; s.flashAt = time; }
        ctx.banner('Teasel strings the second wire to her own hand.', '#ffd27a');
        ctx.sfx('chain');
      }
      for (const s of stakes) {
        const h = s.holder;
        if (!h || !alive(h)) continue;
        // The stake hauls a holder back to the wire's length.
        const d = dist(s.x, s.y, h.x, h.y);
        if (d > LEN) ctx.nudge(h, (s.x - h.x) / d * (d - LEN), (s.y - h.y) / d * (d - LEN));
        // The wire bites whoever else it crosses.
        const v = other(h);
        if (!alive(v) || ctx.dashing(v) || ctx.isAirborne(v)) continue;
        const p = hand(h);
        if (dist(v.x, v.y, h.x, h.y) < 26) continue;
        if (segDist(v.x, v.y, s.x, s.y, p.x, p.y) > BITE + 20) continue;
        if (time - (s.bit.get(v) ?? -1e9) < REBITE_MS) continue;
        s.bit.set(v, time);
        ctx.hit(v, CUT, v.x, v.y);
        if (v === player) tk.slowPlayer(0.6, 500);
        else npcSlowUntil = time + 500;
        ctx.flash(v.x, v.y - 10, 0xe8e4dc);
        ctx.sfx('slash');
      }
    },

    npcSpeedMult() { return now < npcSlowUntil ? 0.6 : 1; },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const held = stakes.find((s) => s.holder === npc);
      if (held) {
        // Walk round the stake so the wire scythes through the player, overshooting their bearing.
        const ap = Math.atan2(player.y - held.y, player.x - held.x);
        const an = Math.atan2(npc.y - held.y, npc.x - held.x);
        const turn = wrapAngle(ap - an);
        const want = ap + (turn >= 0 ? 0.75 : -0.75);
        const r = clamp(dist(held.x, held.y, player.x, player.y) + 90, 150, LEN - 30);
        return { x: clamp(held.x + Math.cos(want) * r, 60, W - 60), y: clamp(held.y + Math.sin(want) * r, top + 50, H - 40) };
      }
      // Holding nothing: go and strike a stake back off the player (or a slack one).
      const s = stakes.find((q) => q.holder === player) ?? stakes.find((q) => !q.holder);
      if (!s) return null;
      const d = dist(s.x, s.y, npc.x, npc.y) || 1;
      return { x: s.x + (npc.x - s.x) / d * 70, y: s.y + (npc.y - s.y) / d * 70 };
    },

    drawGround(g, time) {
      // Wedged humps, each sliced flat on one side — the wire's work.
      for (const m of humps) drawHump(g, m);
      for (const s of stakes) {
        // The reach of each stake, scored lightly into the marl.
        if (s.holder) {
          g.lineStyle(1.5, MARL_DARK, 0.35);
          for (let a = 0; a < Math.PI * 2; a += 0.12) g.lineBetween(s.x + Math.cos(a) * LEN, s.y + Math.sin(a) * LEN, s.x + Math.cos(a + 0.06) * LEN, s.y + Math.sin(a + 0.06) * LEN);
        }
        drawStake(g, s, time);
      }
    },

    drawAir(g, time) {
      for (const s of stakes) {
        const h = s.holder;
        if (!h || !alive(h)) continue;
        const p = hand(h);
        const col = h === player ? PLAYER_C : FOE_C;
        drawWire(g, s.x, s.y - 34, p.x, p.y, time, col);
        drawToggle(g, p.x, p.y, Math.atan2(p.y - s.y, p.x - s.x));
      }
    },

    drawHud(g, time) {
      // Two stakes, top centre: whose toggle each wire runs to.
      stakes.forEach((s, i) => {
        const x = W / 2 - 34 + i * 68, y = top + 18;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 26, y - 14, 52, 30, 6);
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 16, y - 8, 5, 20);
        g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 15, y - 8, 2, 20);
        const col = s.holder === player ? PLAYER_C : s.holder === npc ? FOE_C : 0x6a6668;
        const pulse = clamp(1 - (time - s.flashAt) / 600, 0, 1);
        g.lineStyle(1.5, mixC(0xc8c4bc, 0xffffff, pulse), 1); g.lineBetween(x - 11, y - 2, x + 10, y + 4);
        g.fillStyle(col, 1); g.fillRoundedRect(x + 8, y - 1, 12, 7, 3);
        if (pulse > 0) { g.lineStyle(2, col, pulse); g.strokeRoundedRect(x - 26, y - 14, 52, 30, 6); }
      });
    },

    destroy() { for (const s of stakes) s.tgt?.remove(); },
  };
}

/** A wedged hump of clay: a domed lump, folded seams on top, one flat cut face catching the light. */
function drawHump(g: G, m: Hump): void {
  shadow(g, m.x, m.y + m.r * 0.5, m.r * 2.4, m.r * 0.7, 0.25);
  g.fillStyle(MARL_DARK, 1); g.fillEllipse(m.x, m.y, m.r * 2.2, m.r * 1.5);
  g.fillStyle(MARL, 1); g.fillEllipse(m.x - 1, m.y - 3, m.r * 2, m.r * 1.3);
  g.fillStyle(MARL_LIT, 0.7); g.fillEllipse(m.x - m.r * 0.3, m.y - m.r * 0.45, m.r * 0.9, m.r * 0.4);
  g.lineStyle(1, MARL_DARK, 0.7);
  for (let k = -1; k <= 1; k++) { g.beginPath(); g.arc(m.x + k * m.r * 0.4, m.y - 2, m.r * 0.5, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath(); }
  // The cut face: a flat, shining plane with the wire's fine striations across it.
  const cx = m.x + Math.cos(m.a) * m.r * 0.7, cy = m.y + Math.sin(m.a) * m.r * 0.4;
  g.fillStyle(SLIP_LIT, 0.85); g.fillEllipse(cx, cy, m.r * 0.9, m.r * 0.7);
  g.lineStyle(0.6, SLIP_DARK, 0.6);
  for (let i = -2; i <= 2; i++) g.lineBetween(cx - m.r * 0.35, cy + i * 2.4, cx + m.r * 0.35, cy + i * 2.4 + 1);
}

/** A wire stake: an iron-shod timber post driven into the clay, an iron cleat, a slack coil if unstrung. */
function drawStake(g: G, s: Stake, time: number): void {
  const { x, y } = s;
  shadow(g, x, y + 2, 40, 12, 0.35);
  // Clay heaved up round the foot where it was driven in.
  g.fillStyle(MARL_DARK, 1); g.fillEllipse(x, y, 34, 12);
  g.fillStyle(MARL_LIT, 0.6); g.fillEllipse(x - 4, y - 2, 18, 5);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 7, y - 46, 14, 46);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 5, y - 46, 9, 46);
  g.fillStyle(TIMBER_LIT, 0.8); g.fillRect(x - 4, y - 46, 2, 46);
  for (const v of [6, 14]) { g.lineStyle(0.8, TIMBER_DARK, 0.8); g.lineBetween(x - 4, y - v * 2, x + 3, y - v * 2 - 3); }
  // Iron cap and the cleat the toggle is lashed to.
  g.fillStyle(IRON, 1); g.fillRect(x - 8, y - 50, 16, 6);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 8, y - 50, 16, 1.5);
  g.lineStyle(3, IRON, 1); g.strokeCircle(x, y - 34, 6);
  g.lineStyle(1, IRON_LIT, 0.8); g.strokeCircle(x - 1, y - 35, 5);
  if (!s.holder) {
    // Unstrung: the wire hangs coiled on the cleat, its toggle dangling.
    g.lineStyle(1.2, 0xbab6ae, 0.9);
    for (let k = 0; k < 3; k++) g.strokeEllipse(x + 3, y - 26 + k * 2, 16 - k * 2, 10 - k);
    g.lineBetween(x + 10, y - 24, x + 12, y - 12);
    drawToggle(g, x + 12, y - 9, Math.PI / 2);
  }
  const fl = clamp(1 - (time - s.flashAt) / 500, 0, 1);
  if (fl > 0) glow(g, x, y - 34, 30, s.holder ? 0xffffff : 0x888888, 0.12 * fl, 3);
}

/** The cutting wire: two strands twisted together, a glint running along it toward the hand. */
function drawWire(g: G, x1: number, y1: number, x2: number, y2: number, time: number, col: number): void {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  g.lineStyle(5, col, 0.16); g.lineBetween(x1, y1, x2, y2);
  const n = Math.max(6, Math.floor(len / 10));
  for (const ph of [0, Math.PI]) {
    g.lineStyle(1.3, ph ? 0x9c9890 : 0xe6e2da, 1);
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const o = Math.sin(t * len / 7 + ph) * 1.4;
      const px = x1 + (x2 - x1) * t + nx * o, py = y1 + (y2 - y1) * t + ny * o;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
  const gt = (time / 700) % 1;
  g.fillStyle(0xffffff, 0.9); g.fillCircle(x1 + (x2 - x1) * gt, y1 + (y2 - y1) * gt, 2.2);
  // Clay crumbs flicked up where the wire drags along the ground near its stake.
  for (let i = 0; i < 3; i++) {
    const t = 0.1 + i * 0.08, ph = ((time / 300) + i * 0.33) % 1;
    g.fillStyle(MARL_LIT, 0.7 * (1 - ph)); g.fillCircle(x1 + (x2 - x1) * t + nx * ph * 8, y1 + (y2 - y1) * t + 30 - ph * 10, 1.6);
  }
}

/** A turned boxwood toggle, wire knotted through its waist. */
function drawToggle(g: G, x: number, y: number, a: number): void {
  const cx = Math.cos(a + Math.PI / 2) * 7, cy = Math.sin(a + Math.PI / 2) * 7;
  g.lineStyle(6, TIMBER_DARK, 1); g.lineBetween(x - cx, y - cy, x + cx, y + cy);
  g.lineStyle(4, 0xd8b884, 1); g.lineBetween(x - cx, y - cy, x + cx, y + cy);
  g.fillStyle(0x4a3a2a, 1); g.fillCircle(x, y, 1.8);
}

export const FALLEN_WIRE: GimmickDef = {
  id: ID,
  rules: 'A cutting wire runs from a stake to a fighter\'s hand and cuts whoever else it crosses. Dash over it. Strike a stake to take its toggle.',
  make,
};
