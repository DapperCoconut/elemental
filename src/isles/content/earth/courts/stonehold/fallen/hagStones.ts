import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, mulberry, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { holedStone, shard } from '../art';
import { CHALK, GRANITE, GRANITE_DEEP, LICHEN, REGENT, REGENT_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Through the Hag-Stone — Sibbet Holeway, keeper of the holed stones.
 *
 * Every hamlet on the shoulder has a holed stone, and the old people passed a sick child through
 * the hole three times for luck. In the star's telling Sibbet stood by the stones with a tin cup
 * and charged a copper a pass, and told the Prince's men whose children had come through on a
 * Tithe-day. Three hag-stones stand in the yard.
 *
 * A hag-stone does not keep what it is given. Strike one — a shot, a swing, a blast — and the hole
 * flares and throws the blow on out the other side, *doubled*, as a bolt of light at the
 * striker's foe. So the stones are cover that betrays you: hide behind one and her shots land on
 * the stone and come through it at you twice as hard. Stand clear of the line through a hole, and
 * put a stone between you and her on purpose — your blows come through at her.
 *
 * On a slow toll one stone opens its eye and spits at whoever stands nearest it. Halfway down the
 * stones begin to see each other: a bolt that passes through another hole is caught there, aimed
 * again and made heavier. The bot keeps a stone between itself and you and shoots through it.
 */

const ID = fallenId('stonehold', 'hag-stones');
const SR = 28;
const HOLE = 26;
const BOLT_R = 9;
const BOLT_V = 330;
const RELAY_MS = 260;
const EYE_EVERY = 6500;
const EYE_WARN = 950;

interface Stone { x: number; y: number; hx: number; hy: number; last: number; flareAt: number; seed: number; target: StrikeTarget | null }
interface Pending { s: Stone; at: Fighter; dmg: number; fireAt: number; lockAt: number; lx: number; ly: number; eye: boolean }
interface Bolt { x: number; y: number; vx: number; vy: number; at: Fighter; dmg: number; seen: Set<Stone>; born: number }
interface Chip { x: number; y: number; vx: number; vy: number; born: number; spin: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const fy = (k: number) => top + (H - top) * k;
  const stones: Stone[] = [
    { x: W * 0.27, y: fy(0.42) }, { x: W * 0.73, y: fy(0.42) }, { x: W * 0.5, y: fy(0.86) },
  ].map((p, i) => ({ ...p, hx: p.x, hy: p.y - SR * 1.05, last: -1e9, flareAt: -1e9, seed: 101 + i * 17, target: null }));
  const pending: Pending[] = [];
  const bolts: Bolt[] = [];
  const chips: Chip[] = [];
  let seeing = false;
  let started = false;
  let nextEye = 0;
  let eyeIdx = 0;

  const foeOf = (f: Fighter): Fighter => (f === player ? npc : player);

  function relay(s: Stone, at: Fighter, dmg: number, eye: boolean, delay: number): void {
    const now = tk.now;
    pending.push({ s, at, dmg, fireAt: now + delay, lockAt: now + Math.max(0, delay - 260), lx: at.x, ly: at.y, eye });
    s.flareAt = now;
  }

  for (const s of stones) {
    s.target = ctx.target({
      x: s.hx, y: s.hy, r: SR,
      onStruck: (by, amount) => {
        const now = tk.now;
        if (now - s.last < 420) return;
        s.last = now;
        const striker = by === 'player' ? player : npc;
        relay(s, foeOf(striker), clamp(Math.round(amount * 2), 8, 24), false, RELAY_MS);
        ctx.sfx('crystal-chime');
      },
    });
  }

  function fire(p: Pending, time: number): void {
    const a = Math.atan2(p.ly - p.s.hy, p.lx - p.s.hx);
    bolts.push({ x: p.s.hx, y: p.s.hy, vx: Math.cos(a) * BOLT_V, vy: Math.sin(a) * BOLT_V, at: p.at, dmg: p.dmg, seen: new Set([p.s]), born: time });
    ctx.sfx(p.eye ? 'light-beam' : 'prism');
  }

  function land(b: Bolt): void {
    if (b.at === player) tk.hitPlayer(b.dmg, b.x, b.y);
    else { ctx.hit(npc, b.dmg, b.x, b.y); ctx.float(npc.x, npc.y - 52, 'THROUGH', '#fff0b0'); }
    ctx.flash(b.x, b.y, 0xfff0b0);
    for (let i = 0; i < 4; i++) { const a = rng() * Math.PI * 2; chips.push({ x: b.x, y: b.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, born: tk.now, spin: a }); }
  }

  return {
    update(time, rawDt) {
      const dt = stepDt(rawDt);
      if (!started) { started = true; nextEye = time + 3500; }
      if (!seeing && npc.hp < npc.maxHp * 0.5) {
        seeing = true;
        ctx.banner('THE STONES SEE EACH OTHER', '#fff0b0');
        ctx.sfx('holy-chord');
      }
      // The toll: a stone opens its eye on whoever stands nearest it.
      if (time >= nextEye) {
        nextEye = time + EYE_EVERY;
        const s = stones[eyeIdx++ % stones.length];
        const near = !alive(npc) || dist(player.x, player.y, s.hx, s.hy) <= dist(npc.x, npc.y, s.hx, s.hy) ? player : npc;
        relay(s, near, near === player ? 14 : 22, true, tk.warn(EYE_WARN));
        ctx.sfx('beam-charge');
      }
      for (let i = pending.length - 1; i >= 0; i--) {
        const p = pending[i];
        if (time < p.lockAt) { p.lx = p.at.x; p.ly = p.at.y; }
        if (time >= p.fireAt) { pending.splice(i, 1); if (alive(p.at)) fire(p, time); }
      }
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (seeing) {
          for (const s of stones) {
            if (b.seen.has(s) || dist(b.x, b.y, s.hx, s.hy) > HOLE) continue;
            b.seen.add(s);
            b.x = s.hx; b.y = s.hy;
            b.dmg = Math.min(30, Math.round(b.dmg * 1.5));
            const a = Math.atan2(b.at.y - s.hy, b.at.x - s.hx);
            b.vx = Math.cos(a) * BOLT_V; b.vy = Math.sin(a) * BOLT_V;
            s.flareAt = time;
            ctx.sfx('crystal-chime');
          }
        }
        if (alive(b.at) && dist(b.x, b.y, b.at.x, b.at.y) < 20 + BOLT_R) { land(b); bolts.splice(i, 1); continue; }
        if (b.x < 0 || b.x > W || b.y < top - 20 || b.y > H + 20 || time - b.born > 4000) bolts.splice(i, 1);
      }
      // The stones' feet are solid.
      for (const f of [player, npc]) {
        for (const s of stones) {
          const d = dist(f.x, f.y, s.x, s.y - 8);
          if (d < 30 && d > 0.1) ctx.nudge(f, ((f.x - s.x) / d) * (30 - d), ((f.y - s.y + 8) / d) * (30 - d));
        }
      }
      for (let i = chips.length - 1; i >= 0; i--) { const c = chips[i]; c.x += c.vx * dt; c.y += c.vy * dt; c.spin += dt * 9; if (time - c.born > 450) chips.splice(i, 1); }
    },

    npcSeek() {
      if (!alive(player) || !alive(npc)) return null;
      // Waiting on an eye that has picked it: away from that stone.
      const eye = pending.find((p) => p.eye && p.at === npc);
      if (eye) {
        const d = dist(npc.x, npc.y, eye.s.x, eye.s.y) || 1;
        return { x: tk.clampX(npc.x + ((npc.x - eye.s.x) / d) * 160), y: tk.clampY(npc.y + ((npc.y - eye.s.y) / d) * 160) };
      }
      // Otherwise: a stone between itself and you, so its shots come through doubled.
      let best: Pt | null = null, bd = Infinity;
      for (const s of stones) {
        const pd = dist(player.x, player.y, s.hx, s.hy);
        if (pd < 150) continue;
        const p = { x: tk.clampX(s.hx + ((s.hx - player.x) / pd) * 120), y: tk.clampY(s.hy + ((s.hy - player.y) / pd) * 120) };
        const d = dist(npc.x, npc.y, p.x, p.y);
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    },

    drawGround(g, time) {
      // The line through every hole, faint, so the danger is legible.
      for (const s of stones) {
        g.fillStyle(0x000000, 0.12); g.fillEllipse(s.x, s.y + 2, 80, 22);
        for (let r = 0; r < 3; r++) { g.lineStyle(1, CHALK, 0.18); g.strokeEllipse(s.x, s.y, 70 + r * 22, 20 + r * 7); }
      }
      for (const p of pending) {
        const k = clamp(1 - (p.fireAt - time) / Math.max(1, p.fireAt - (p.lockAt - 260)), 0, 1);
        const locked = time >= p.lockAt;
        const a = Math.atan2(p.ly - p.s.hy, p.lx - p.s.hx);
        const len = dist(p.s.hx, p.s.hy, p.lx, p.ly) + 60;
        for (let d = 30; d < len; d += 18) {
          g.fillStyle(p.eye ? REGENT_LIT : 0xfff0b0, (locked ? 0.7 : 0.35) * (0.4 + k * 0.6));
          g.fillCircle(p.s.hx + Math.cos(a) * d, p.s.hy + Math.sin(a) * d, locked ? 3 : 2);
        }
      }
    },

    drawAir(g, time) {
      for (const s of [...stones].sort((a, b) => a.y - b.y)) {
        const fl = clamp(1 - (time - s.flareAt) / 500, 0, 1);
        const eye = pending.find((p) => p.s === s && p.eye);
        const charge = eye ? clamp(1 - (eye.fireAt - time) / tk.warn(EYE_WARN), 0, 1) : 0;
        holedStone(g, s.x, s.y, SR, mulberry(s.seed), Math.max(fl, charge));
        if (eye) drawEye(g, s.hx, s.hy, charge, time);
        if (fl > 0) { glow(g, s.hx, s.hy, 30 + fl * 26, 0xfff0b0, 0.07 * fl, 3); g.lineStyle(2, 0xffffff, fl); g.strokeCircle(s.hx, s.hy, HOLE * (1.4 - fl * 0.4)); }
        if (seeing) { g.lineStyle(1, 0xfff0b0, 0.25 + Math.sin(time / 300 + s.seed) * 0.15); g.strokeCircle(s.hx, s.hy, HOLE + 4); }
      }
      for (const b of bolts) drawBolt(g, b, time);
      for (const c of chips) shard(g, c.x, c.y, 3, c.spin, 0xfff0b0);
    },

    drawHud(g, time) {
      // Three little hag-stones: the next to wake has its eye half open; lines between them once they see.
      const cx = W / 2, y = top + 18;
      const xs = [cx - 34, cx, cx + 34];
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(cx - 54, y - 15, 108, 30, 6);
      if (seeing) { g.lineStyle(1.5, 0xfff0b0, 0.7); g.lineBetween(xs[0], y, xs[2], y); }
      const k = clamp(1 - (nextEye - time) / EYE_EVERY, 0, 1);
      xs.forEach((x, i) => {
        g.fillStyle(GRANITE, 1); g.fillEllipse(x, y, 22, 24);
        g.fillStyle(GRANITE_DEEP, 1); g.fillCircle(x, y, 5.5);
        const next = i === eyeIdx % 3;
        if (next) { g.fillStyle(REGENT_LIT, 0.4 + k * 0.6); g.fillEllipse(x, y, 9, 2 + k * 6); g.fillStyle(0x1a1418, 1); g.fillCircle(x, y, 1.5 + k); }
        g.fillStyle(LICHEN, 0.8); g.fillCircle(x - 6, y + 6, 2);
      });
    },

    destroy() { for (const s of stones) s.target?.remove(); },
  };
}

/** The stone's eye opening in the hole: violet lids parting on a pupil that finds its mark. */
function drawEye(g: G, x: number, y: number, k: number, time: number): void {
  const open = 2 + k * 9;
  g.fillStyle(0xf4ecdc, 0.95); g.fillEllipse(x, y, 18, open * 1.6);
  g.fillStyle(REGENT, 1); g.fillCircle(x + Math.sin(time / 260) * 2, y, 3 + k * 2);
  g.fillStyle(0x140c18, 1); g.fillCircle(x + Math.sin(time / 260) * 2, y, 1.5 + k);
  g.lineStyle(2, GRANITE_DEEP, 1); g.strokeEllipse(x, y, 19, open * 1.6 + 1);
  if (k > 0.6) glow(g, x, y, 24, REGENT_LIT, 0.05 * k, 3);
}

/** A blow passed through stone: a hot white core in a sheath of gold, dragging a fading tail. */
function drawBolt(g: G, b: Bolt, time: number): void {
  const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
  for (let i = 6; i >= 1; i--) {
    g.fillStyle(0xffd060, 0.08 * (7 - i));
    g.fillCircle(b.x - ux * i * 7, b.y - uy * i * 7, BOLT_R * (1 - i * 0.1));
  }
  const heavy = clamp((b.dmg - 8) / 22, 0, 1);
  glow(g, b.x, b.y, 18 + heavy * 10, 0xfff0b0, 0.08, 3);
  g.fillStyle(0xffc040, 1); g.fillCircle(b.x, b.y, BOLT_R);
  g.fillStyle(0xfff6d8, 1); g.fillCircle(b.x, b.y, BOLT_R * 0.6);
  // A little ring of stone-dust it carries from the hole.
  for (let i = 0; i < 4; i++) {
    const a = time / 90 + i * 1.57;
    g.fillStyle(GRANITE, 0.8); g.fillCircle(b.x + Math.cos(a) * (BOLT_R + 3), b.y + Math.sin(a) * (BOLT_R + 3), 1.4);
  }
}

export const FALLEN_HAG_STONES: GimmickDef = {
  id: ID,
  rules: 'Strike a hag-stone and it throws the blow through its hole at the striker\'s foe, doubled. On the toll one spits at the nearest. Later, bolts chain.',
  make,
};
