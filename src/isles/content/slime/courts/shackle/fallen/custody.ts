import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { BRASS, BRASS_LIT, IRON, IRON_DARK, IRON_LIT, RUST, RUST_DARK, STONE_DARK } from '../palette';
import { key, manacle } from '../art';
import { alive, clamp, dist } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Change of Custody — Turnkey Hesketh Mowbray, in the King's telling the gaoler who moved debtors
 * from cell to cell by night so no family ever found the right door.
 *
 * Mantraps lie set about the yard. They are set for *arrivals*: walk over one and it holds; arrive
 * on it — by a dash, or by the turnkey's key — and its jaws close (rooted, bitten). Every few
 * seconds a pair of handcuffs chains the two fighters together and the key turns: you trade places.
 * You land where he stood; he lands where you stood.
 *
 * So when the cuffs glow, stand on a trap — he will arrive in it — and keep him off one. Strike a
 * set trap to spring it: empty, it is spent; with someone on it, it bites them where they stand.
 * Mowbray sets fresh traps and makes for one himself when the cuffs come out. Past half the key turns
 * twice: there, and a beat later back again.
 */

const ID = fallenId('shackle', 'custody');
const SWAP_MS = 8200;
const SWAP_MS_LATE = 6600;
const CUFF_WARN = 1700;
const BACK_MS = 1150;
const TRAP_R = 30;
const MAX_TRAPS = 7;
const SET_MS = 4200;
const BITE_PLAYER = 13;
const BITE_NPC = 18;
const ROOT_MS = 1500;

/** A mantrap: set (jaws open), or sprung (shut, rusting away). */
interface Trap { x: number; y: number; set: boolean; shutAt: number; target: StrikeTarget | null; seed: number; settleAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const traps: Trap[] = [];
  let swapAt = 0;
  let backAt = 0;
  let late = false;
  let nextSet = 0;
  let started = false;
  let lastSwap = -9999;

  function place(p: Pt, time: number): void {
    const x = clamp(p.x, 70, W - 70), y = clamp(p.y, top + 60, H - 60);
    if (traps.some((t) => t.set && dist(t.x, t.y, x, y) < TRAP_R * 2 + 16)) return;
    const t: Trap = { x, y, set: true, shutAt: 0, target: null, seed: rng() * 10, settleAt: time };
    t.target = ctx.target({
      x, y, r: 18, passThrough: true,
      onStruck: () => { if (t.set) spring(t, tk.now, false); },
    });
    traps.push(t);
  }

  function on(t: Trap, f: Fighter): boolean { return alive(f) && dist(f.x, f.y, t.x, t.y) < TRAP_R; }

  function spring(t: Trap, time: number, arrival: boolean): void {
    t.set = false;
    t.shutAt = time;
    t.target?.remove();
    t.target = null;
    ctx.sfx('trap-snap');
    for (const f of [player, npc]) {
      if (!on(t, f)) continue;
      ctx.nudge(f, t.x - f.x, t.y - f.y);
      ctx.root(f, ROOT_MS);
      if (f === player) tk.hitPlayer(BITE_PLAYER, t.x, t.y); else ctx.hit(npc, BITE_NPC, t.x, t.y);
      ctx.float(t.x, t.y - 46, arrival ? 'TAKEN INTO CUSTODY' : 'SPRUNG', f === player ? '#ffb0a0' : '#d8f0a0');
    }
  }

  function swap(time: number): void {
    if (!alive(player) || !alive(npc)) return;
    const px = player.x, py = player.y, nx = npc.x, ny = npc.y;
    ctx.nudge(player, nx - px, ny - py);
    ctx.nudge(npc, px - nx, py - ny);
    ctx.sfx('teleport');
    ctx.flash(px, py, BRASS_LIT); ctx.flash(nx, ny, BRASS_LIT);
    lastSwap = time;
    // Whoever arrives on a set trap is caught by it.
    for (const t of traps) if (t.set && (on(t, player) || on(t, npc))) spring(t, time, true);
  }

  return {
    update(time) {
      if (!started) {
        started = true;
        for (let i = 0; i < 4; i++) place({ x: 160 + rng() * (W - 320), y: top + 90 + rng() * (H - top - 180) }, time);
        swapAt = time + 4200;
        nextSet = time + SET_MS;
        ctx.banner('WHEN THE CUFFS GLOW YOU TRADE PLACES — LAND HIM ON A TRAP', '#f0d48a');
      }
      if (!late && npc.hp < npc.maxHp * 0.5) { late = true; ctx.banner('THE KEY TURNS TWICE', '#ffb0a0'); ctx.sfx('boss-phase'); }
      // Fresh traps, set away from both fighters.
      if (time >= nextSet) {
        nextSet = time + SET_MS;
        const live = traps.filter((t) => t.set).length;
        for (let n = 0; n < (late ? 2 : 1) && live + n < MAX_TRAPS; n++) {
          for (let tries = 0; tries < 8; tries++) {
            const p = { x: 110 + rng() * (W - 220), y: top + 80 + rng() * (H - top - 160) };
            if (dist(p.x, p.y, player.x, player.y) > 120 && dist(p.x, p.y, npc.x, npc.y) > 120) { place(p, time); break; }
          }
        }
        ctx.sfx('trap-set');
      }
      // Arriving on a trap at a dash bites too.
      for (const t of traps) {
        if (!t.set) continue;
        for (const f of [player, npc]) if (on(t, f) && ctx.dashing(f) && time - t.settleAt > 400) { spring(t, time, true); break; }
      }
      if (swapAt > 0 && time >= swapAt && time - lastSwap > 300) {
        swap(time);
        swapAt = time + (late ? SWAP_MS_LATE : SWAP_MS);
        if (late) backAt = time + BACK_MS;
      }
      if (backAt && time >= backAt) { backAt = 0; swap(time); }
      for (let i = traps.length - 1; i >= 0; i--) if (!traps[i].set && time - traps[i].shutAt > 2600) traps.splice(i, 1);
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const time = tk.now;
      const cuffs = swapAt - time < tk.warn(CUFF_WARN) || (backAt > 0 && backAt - time < BACK_MS);
      if (!cuffs) return null;
      // The cuffs are out: stand on the set trap nearest him that you are not on.
      let best: Trap | null = null, bd = Infinity;
      for (const t of traps) {
        if (!t.set || on(t, player)) continue;
        const d = dist(npc.x, npc.y, t.x, t.y);
        if (d < bd) { bd = d; best = t; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      for (const t of traps) drawTrap(g, t, time);
      // The cuffs: a chain between the two, glowing as the key comes round.
      const left = swapAt - time;
      const warn = tk.warn(CUFF_WARN);
      if ((left < warn || backAt) && alive(player) && alive(npc)) {
        const k = backAt ? 1 : clamp(1 - left / warn, 0, 1);
        g.lineStyle(2 + k * 3, BRASS, 0.25 + k * 0.5);
        const n = 18;
        for (let i = 0; i < n; i++) {
          const a = i / n, b = (i + 0.6) / n;
          const sag = Math.sin(a * Math.PI) * 30 * (1 - k);
          g.lineBetween(player.x + (npc.x - player.x) * a, player.y + (npc.y - player.y) * a + sag,
            player.x + (npc.x - player.x) * b, player.y + (npc.y - player.y) * b + sag);
        }
      }
    },

    drawAir(g, time) {
      const left = swapAt - time;
      const warn = tk.warn(CUFF_WARN);
      if (!(left < warn || backAt)) return;
      const k = backAt ? 1 : clamp(1 - left / warn, 0, 1);
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        manacle(g, f.x + 12, f.y - 6, 6, 0.4, 0.2, 0);
        // A great key over each head, turning a quarter as the time runs out.
        glow(g, f.x, f.y - 66, 18, BRASS_LIT, 0.05 + k * 0.05, 3);
        key(g, f.x, f.y - 66, 1, -Math.PI / 2 + k * Math.PI / 2, BRASS);
      }
    },

    drawHud(g, time) {
      // The turnkey's dial, bottom centre: a keyhole that fills as the swap comes.
      const x = W / 2, y = H - 26;
      const k = clamp(1 - (swapAt - time) / (late ? SWAP_MS_LATE : SWAP_MS), 0, 1);
      g.fillStyle(IRON_DARK, 0.9); g.fillCircle(x, y, 17);
      g.lineStyle(4, k > 0.8 ? BRASS_LIT : BRASS, 1);
      g.beginPath(); g.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      g.fillStyle(0x0a0a0c, 1); g.fillCircle(x, y - 3, 4); g.fillTriangle(x - 3, y - 1, x + 3, y - 1, x, y + 8);
      if (late) { g.fillStyle(BRASS, 1); g.fillCircle(x + 22, y - 10, 3); g.fillCircle(x + 22, y, 3); }
    },
  };

  function drawTrap(g: G, t: Trap, time: number): void {
    const { x, y } = t;
    const age = t.set ? 0 : clamp((time - t.shutAt) / 2600, 0, 1);
    const a = 1 - age;
    // The peg and the chain it is staked to.
    g.fillStyle(STONE_DARK, 0.5 * a); g.fillCircle(x + 32, y + 6, 5);
    g.lineStyle(2, RUST, 0.8 * a); g.lineBetween(x + 20, y + 2, x + 32, y + 6);
    shadow(g, x, y + 4, 56, 14, 0.22 * a);
    // The spring bars either side and the treadle plate in the middle.
    g.fillStyle(IRON_DARK, a); g.fillRoundedRect(x - 30, y - 3, 12, 7, 3); g.fillRoundedRect(x + 18, y - 3, 12, 7, 3);
    g.fillStyle(IRON, a); g.fillRect(x - 18, y - 1, 36, 3);
    if (t.set) {
      const breathe = Math.sin(time / 500 + t.seed) * 0.06;
      g.fillStyle(RUST_DARK, 1); g.fillCircle(x, y, 7);
      g.fillStyle(IRON_LIT, 0.6); g.fillCircle(x - 1.5, y - 1.5, 3);
      // Two open jaws lying flat, teeth up.
      for (const s of [-1, 1]) {
        g.lineStyle(3, IRON, 1);
        g.beginPath(); g.arc(x, y + s * 2, 24, s < 0 ? Math.PI + 0.25 : 0.25, s < 0 ? Math.PI * 2 - 0.25 : Math.PI - 0.25, false); g.strokePath();
        g.fillStyle(IRON_LIT, 1);
        for (let i = 0; i < 7; i++) {
          const ang = (s < 0 ? Math.PI : 0) + 0.45 + i * ((Math.PI - 0.9) / 6);
          const r0 = 24, r1 = 16 - breathe * 30;
          g.fillTriangle(x + Math.cos(ang - 0.08) * r0, y + s * 2 + Math.sin(ang - 0.08) * r0,
            x + Math.cos(ang + 0.08) * r0, y + s * 2 + Math.sin(ang + 0.08) * r0,
            x + Math.cos(ang) * r1, y + s * 2 + Math.sin(ang) * r1);
        }
      }
      g.lineStyle(1, BRASS, 0.25 + Math.sin(time / 300 + t.seed) * 0.1); g.strokeCircle(x, y, TRAP_R);
    } else {
      // Shut: the jaws standing up, teeth meshed.
      const snap = clamp((time - t.shutAt) / 120, 0, 1);
      g.fillStyle(IRON_DARK, a); g.fillRoundedRect(x - 24, y - 14 * snap - 4, 48, 8, 3);
      g.fillStyle(IRON_LIT, a);
      for (let i = 0; i < 8; i++) g.fillTriangle(x - 22 + i * 6, y - 14 * snap + 4, x - 16 + i * 6, y - 14 * snap + 4, x - 19 + i * 6, y - 14 * snap - 4);
      if (time - t.shutAt < 200) { g.lineStyle(3, 0xffffff, 1 - (time - t.shutAt) / 200); g.strokeCircle(x, y - 6, 20 + (time - t.shutAt) / 8); }
    }
  }
}

export const FALLEN_CUSTODY: GimmickDef = {
  id: ID,
  rules: 'When the cuffs glow you trade places. Mantraps bite whoever arrives on them: stand on one so he lands in it. Strike a trap to spring it.',
  make,
};
