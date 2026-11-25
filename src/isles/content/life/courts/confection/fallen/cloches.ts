import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRASS, CHERRY, GRAPE, ICING, LEMON, MINT, PINK, dist, gumdrop, wrappedSweet } from '../art';
import { alive, clamp } from './util';

/**
 * The Taster's Cloches — Comfit Vane, Royal Taster to His Sweetness, who in the King's telling
 * tasted every dish before the Prince and put the bad ones in front of whoever had displeased him.
 *
 * Silver cloches are set down in a row and one is lifted to show the Prince's bonbon in its gold
 * twist. Down they go and the tray is shuffled — swaps you can follow if you keep your eye on the
 * right dome — then the cloches slide apart across the floor. They rattle; then all lift at once.
 * Under the true one is the bonbon: whoever takes it has the Prince's favour (they hit harder for a
 * while). Under the others are gumdrop bombs that burst on whoever stands beside them.
 *
 * Strike a cloche while it rattles and it lifts early: a bomb under it goes off *now*, on whoever
 * is next to it. Comfit knows which dome is true and walks to it — another tell, if you watch him.
 * Halfway, a fourth cloche joins the tray, the swaps quicken, and Comfit starts to bluff: he walks
 * to a bomb and only turns for the true dome at the last moment.
 */

const ID = fallenId('confection', 'cloches');
const SHOW_MS = 1300;
const SWAP_MS = 470;
const SWAP_TURN_MS = 340;
const SWAPS = 5;
const SWAPS_TURN = 7;
const SETTLE_MS = 800;
const WAIT_MS = 1700;
const LIFTED_MS = 4200;
const REST_MS = 2400;
const BLAST_R = 82;
const BLAST_PLAYER = 18;
const BLAST_NPC = 38;
const FAVOUR_MS = 5500;
const FAVOUR_MULT = 1.4;
const TAKE_R = 34;

type Stage = 'rest' | 'show' | 'shuffle' | 'settle' | 'wait' | 'lifted';

/** One silver dome. `slot` indexes the row during the shuffle; `spot` is where it settles. */
interface Cloche {
  x: number; y: number; slot: number; real: boolean;
  from: Pt; to: Pt; arc: number; lifted: boolean; liftedAt: number; taken: boolean; burst: boolean;
  target: StrikeTarget | null;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const ym = (top + H) / 2;
  let stage: Stage = 'rest';
  let stageAt = 0;
  let turned = false;
  let cloches: Cloche[] = [];
  let swapsLeft = 0;
  let swapAt = 0;
  const favour = new Map<Fighter, number>();
  let decoy = -1;
  let now = 0;

  const rowPos = (j: number, n: number): Pt => ({ x: W / 2 + (j - (n - 1) / 2) * 92, y: ym });
  const swapMs = (): number => (turned ? SWAP_TURN_MS : SWAP_MS);
  const hasFavour = (f: Fighter): boolean => (favour.get(f) ?? -1e9) > now;

  const removeTargets = (): void => { for (const c of cloches) { c.target?.remove(); c.target = null; } };

  const deal = (time: number): void => {
    removeTargets();
    const n = turned ? 4 : 3;
    const realIdx = Math.floor(rng() * n);
    cloches = [];
    for (let j = 0; j < n; j++) {
      const p = rowPos(j, n);
      cloches.push({ x: p.x, y: p.y, slot: j, real: j === realIdx, from: p, to: p, arc: 0, lifted: false, liftedAt: 0, taken: false, burst: false, target: null });
    }
    stage = 'show'; stageAt = time;
    ctx.sfx('crystal-chime');
  };

  const nextSwap = (time: number): void => {
    const n = cloches.length;
    const a = Math.floor(rng() * n);
    let b = Math.floor(rng() * (n - 1)); if (b >= a) b++;
    const ca = cloches.find((c) => c.slot === a), cb = cloches.find((c) => c.slot === b);
    if (!ca || !cb) return;
    ca.from = rowPos(a, n); ca.to = rowPos(b, n); ca.slot = b; ca.arc = -1;
    cb.from = rowPos(b, n); cb.to = rowPos(a, n); cb.slot = a; cb.arc = 1;
    for (const c of cloches) if (c !== ca && c !== cb) { c.from = rowPos(c.slot, n); c.to = c.from; c.arc = 0; }
    swapAt = time;
    ctx.sfx('clang');
  };

  /** Where the domes come to rest: a shuffled set of spots well apart, never on the fighters. */
  const settle = (time: number): void => {
    const n = cloches.length;
    const spots: Pt[] = n === 3
      ? [{ x: W * 0.2, y: top + (H - top) * 0.3 }, { x: W * 0.5, y: top + (H - top) * 0.78 }, { x: W * 0.8, y: top + (H - top) * 0.3 }]
      : [{ x: W * 0.17, y: top + (H - top) * 0.28 }, { x: W * 0.4, y: top + (H - top) * 0.8 }, { x: W * 0.62, y: top + (H - top) * 0.22 }, { x: W * 0.84, y: top + (H - top) * 0.74 }];
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    cloches.forEach((c, i) => { c.from = { x: c.x, y: c.y }; c.to = spots[i]; c.arc = 0; });
    stage = 'settle'; stageAt = time;
    ctx.sfx('whoosh');
  };

  const arm = (time: number): void => {
    stage = 'wait'; stageAt = time;
    const bombs = cloches.filter((c) => !c.real);
    decoy = turned && bombs.length ? cloches.indexOf(bombs[Math.floor(rng() * bombs.length)]) : -1;
    for (const c of cloches) {
      c.target = ctx.target({ x: c.x, y: c.y - 16, r: 22, onStruck: (by) => { if (by === 'player' && stage === 'wait' && !c.lifted) lift(c, tk.now, true); } });
    }
  };

  const lift = (c: Cloche, time: number, early: boolean): void => {
    c.lifted = true; c.liftedAt = time;
    c.target?.remove(); c.target = null;
    if (c.real) { ctx.sfx('sparkle'); if (early) ctx.float(c.x, c.y - 60, 'THE BONBON', '#ffe070'); return; }
    c.burst = true;
    ctx.sfx('explosion-small');
    tk.boom(c.x, c.y, BLAST_R, PINK);
    if (alive(player) && dist(player.x, player.y, c.x, c.y) < BLAST_R + 18) tk.hitPlayer(BLAST_PLAYER, c.x, c.y);
    if (alive(npc) && dist(npc.x, npc.y, c.x, c.y) < BLAST_R + 18) {
      ctx.hit(npc, BLAST_NPC, c.x, c.y);
      ctx.float(npc.x, npc.y - 60, early ? 'TASTED HIS OWN DISH' : 'WRONG DOME', '#ffb8de');
    }
  };

  const ease = (k: number): number => k * k * (3 - 2 * k);

  return {
    update(time) {
      now = time;
      if (!stageAt) stageAt = time;
      if (!turned && npc.hp < npc.maxHp * 0.5) {
        turned = true;
        ctx.banner('A FOURTH DOME — AND THE TASTER BLUFFS', '#ffe070');
        ctx.sfx('chaos');
      }
      const t = time - stageAt;
      if (stage === 'rest' && t >= REST_MS) deal(time);
      else if (stage === 'show' && t >= tk.warn(SHOW_MS)) {
        stage = 'shuffle'; stageAt = time;
        swapsLeft = turned ? SWAPS_TURN : SWAPS;
        nextSwap(time); swapsLeft--;
      } else if (stage === 'shuffle') {
        const k = clamp((time - swapAt) / swapMs(), 0, 1);
        for (const c of cloches) {
          const e = ease(k);
          c.x = c.from.x + (c.to.x - c.from.x) * e;
          c.y = c.from.y + (c.to.y - c.from.y) * e + Math.sin(e * Math.PI) * 46 * c.arc;
        }
        if (k >= 1) { if (swapsLeft > 0) { nextSwap(time); swapsLeft--; } else settle(time); }
      } else if (stage === 'settle') {
        const e = ease(clamp(t / SETTLE_MS, 0, 1));
        for (const c of cloches) { c.x = c.from.x + (c.to.x - c.from.x) * e; c.y = c.from.y + (c.to.y - c.from.y) * e; }
        if (t >= SETTLE_MS) arm(time);
      } else if (stage === 'wait' && t >= tk.warn(WAIT_MS)) {
        for (const c of cloches) if (!c.lifted) lift(c, time, false);
        stage = 'lifted'; stageAt = time;
      } else if (stage === 'lifted' || stage === 'wait') {
        if (stage === 'lifted' && t >= LIFTED_MS) { removeTargets(); cloches = []; stage = 'rest'; stageAt = time; }
      }
      // The bonbon, once uncovered, is taken by the first to reach it.
      for (const c of cloches) {
        if (!c.real || !c.lifted || c.taken) continue;
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, c.x, c.y) > TAKE_R + 14) continue;
          c.taken = true;
          favour.set(f, time + FAVOUR_MS);
          ctx.sfx('status-buff');
          ctx.float(f.x, f.y - 64, f === player ? 'THE PRINCE\'S FAVOUR' : 'FAVOURED', '#ffe070');
          break;
        }
      }
    },

    npcTakenMult() { return hasFavour(player) ? FAVOUR_MULT : 1; },
    playerTakenMult() { return hasFavour(npc) ? FAVOUR_MULT : 1; },

    npcSeek() {
      if (!alive(npc) || !cloches.length) return null;
      const real = cloches.find((c) => c.real);
      if (!real) return null;
      if (stage === 'lifted') return real.taken ? null : { x: real.x, y: real.y };
      if (stage !== 'wait' && stage !== 'settle') return null;
      const left = tk.warn(WAIT_MS) - (now - stageAt);
      const go = decoy >= 0 && stage === 'wait' && left > 900 ? cloches[decoy] : decoy >= 0 && stage === 'settle' ? cloches[decoy] : real;
      if (decoy < 0 && stage === 'settle') return null;
      const a = Math.atan2(npc.y - go.y, npc.x - go.x);
      return { x: tk.clampX(go.x + Math.cos(a) * 30), y: tk.clampY(go.y + Math.sin(a) * 30) };
    },

    drawGround(g, time) {
      if (stage === 'show' || stage === 'shuffle') drawTablecloth(g, W / 2, ym, cloches.length);
      for (const c of cloches) {
        if (stage === 'wait') {
          const k = clamp((time - stageAt) / tk.warn(WAIT_MS), 0, 1);
          g.lineStyle(2, PINK, 0.25 + k * 0.5); g.strokeCircle(c.x, c.y, BLAST_R);
          g.fillStyle(PINK, 0.04 + k * 0.07); g.fillCircle(c.x, c.y, BLAST_R * k);
        }
        if (c.burst) {
          const k = 1 - (time - c.liftedAt) / 1600;
          if (k > 0) drawSyrupSplash(g, c.x, c.y, k, c.x);
        }
        shadow(g, c.x, c.y + 4, 64, 18, 0.3);
      }
    },

    drawAir(g, time) {
      const order = [...cloches].sort((a, b) => a.y - b.y);
      for (const c of order) {
        const rattle = stage === 'wait' ? Math.sin(time / 30 + c.x) * (1 + clamp((time - stageAt) / tk.warn(WAIT_MS), 0, 1) * 2.5) : 0;
        const showing = stage === 'show' && c.real;
        const lift = c.lifted ? clamp((time - c.liftedAt) / 260, 0, 1) * 40 : showing ? 34 : 0;
        drawPlatter(g, c.x, c.y);
        if ((c.lifted || showing) && c.real && !c.taken) {
          wrappedSweet(g, c.x, c.y - 10, 9, LEMON, time / 900);
          glow(g, c.x, c.y - 10, 30, LEMON, 0.06, 3);
        }
        if (c.lifted && !c.real && !c.burst) gumdrop(g, c.x, c.y - 2, 12, MINT);
        const fade = c.lifted ? clamp(1 - (time - c.liftedAt - 600) / 700, 0, 1) : 1;
        if (fade > 0) drawDome(g, c.x + rattle, c.y - lift, fade);
      }
      for (const [f, until] of favour) {
        if (until <= time || !alive(f)) continue;
        for (let i = 0; i < 3; i++) {
          const a = time / 500 + i * 2.1;
          wrappedSweet(g, f.x + Math.cos(a) * 26, f.y - 30 + Math.sin(a) * 10, 4, LEMON, a);
        }
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 18;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 70, y - 13, 140, 26, 6);
      const n = turned ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const cx = x - (n - 1) * 13 + i * 26;
        g.fillStyle(0x9aa2b0, 1); g.fillEllipse(cx, y + 6, 22, 5);
        g.fillStyle(0xd8dee8, 1); g.beginPath(); g.arc(cx, y + 5, 9, Math.PI, 0, false); g.closePath(); g.fillPath();
        g.fillStyle(BRASS, 1); g.fillCircle(cx, y - 5, 2);
      }
      for (const [f, side] of [[player, -1], [npc, 1]] as [Fighter, number][]) {
        const left = (favour.get(f) ?? 0) - time;
        if (left <= 0) continue;
        const bx = x + side * 58;
        wrappedSweet(g, bx, y, 5, LEMON, 0);
        g.lineStyle(2, f === player ? 0x9ad0ff : 0xffa040, 1);
        g.beginPath(); g.arc(bx, y, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (left / FAVOUR_MS), false); g.strokePath();
      }
    },

    destroy() { removeTargets(); },
  };
}

/** The silver dome: bright crown, dark band, a reflection of the room smeared down one side. */
function drawDome(g: G, x: number, y: number, a: number): void {
  const r = 26;
  g.fillStyle(0x6a7080, a); g.beginPath(); g.arc(x, y - 4, r + 1, Math.PI, 0, false); g.closePath(); g.fillPath();
  g.fillStyle(0xc8ced8, a); g.beginPath(); g.arc(x, y - 5, r, Math.PI, 0, false); g.closePath(); g.fillPath();
  g.fillStyle(lit(0xc8ced8, 0.5), a * 0.8); g.fillEllipse(x - r * 0.42, y - r * 0.6, r * 0.32, r * 0.7);
  g.fillStyle(dim(0xc8ced8, 0.25), a * 0.7); g.fillEllipse(x + r * 0.45, y - r * 0.35, r * 0.4, r * 0.5);
  g.fillStyle(GRAPE, a * 0.25); g.fillEllipse(x + r * 0.15, y - r * 0.25, r * 0.3, r * 0.18);
  g.lineStyle(2, BRASS, a); g.lineBetween(x - r, y - 5, x + r, y - 5);
  g.fillStyle(dim(BRASS, 0.3), a); g.fillCircle(x, y - r - 5, 5);
  g.fillStyle(BRASS, a); g.fillCircle(x, y - r - 6, 4);
  g.fillStyle(0xffffff, a * 0.7); g.fillCircle(x - 1.5, y - r - 7.5, 1.3);
}

/** The silver platter each dome sits on, with a doily of piped icing. */
function drawPlatter(g: G, x: number, y: number): void {
  g.fillStyle(0x7a808c, 1); g.fillEllipse(x, y - 3, 66, 18);
  g.fillStyle(0xd8dee8, 1); g.fillEllipse(x, y - 4, 62, 15);
  g.lineStyle(1, ICING, 0.9);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.strokeCircle(x + Math.cos(a) * 20, y - 4 + Math.sin(a) * 4.5, 2.5); }
}

/** The pink tablecloth the shuffle is played out on. */
function drawTablecloth(g: G, x: number, y: number, n: number): void {
  const w = n * 92 + 60;
  g.fillStyle(dim(PINK, 0.4), 0.55); g.fillRoundedRect(x - w / 2, y - 64, w, 128, 10);
  g.fillStyle(PINK, 0.5); g.fillRoundedRect(x - w / 2 + 4, y - 60, w - 8, 120, 8);
  for (let i = 0; i < w / 14; i++) { g.fillStyle(ICING, 0.6); g.fillCircle(x - w / 2 + 7 + i * 14, y + 62, 4); }
  g.lineStyle(1, CHERRY, 0.35); for (let i = 1; i < n * 2; i++) g.lineBetween(x - w / 2 + (i * w) / (n * 2), y - 60, x - w / 2 + (i * w) / (n * 2), y + 60);
}

/** Burst gumdrop: a sticky star of pink and mint syrup thrown out from the platter. */
function drawSyrupSplash(g: G, x: number, y: number, k: number, seed: number): void {
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7 + seed * 0.01, r = BLAST_R * (0.45 + ((i * 37) % 5) / 10);
    g.fillStyle(i % 2 ? MINT : PINK, 0.4 * k);
    g.fillEllipse(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.4, 16, 9);
    g.lineStyle(3, i % 2 ? MINT : PINK, 0.35 * k); g.lineBetween(x, y, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.4);
  }
}

export const FALLEN_CLOCHES: GimmickDef = {
  id: ID,
  rules: 'Follow the bonbon as the cloches shuffle: under the true one, the Prince\'s favour; under the rest, gumdrop bombs. Strike a dome to lift it early.',
  make,
};
