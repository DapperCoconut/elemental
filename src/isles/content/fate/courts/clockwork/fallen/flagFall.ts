import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { dial, gear } from '../art';
import {
  BLUED, BLUED_LIT, BRASS, BRASS_DARK, BRASS_LIT, CARD_RED, ENAMEL, IRON_DARK, PAID_GREY, TIMBER, TIMBER_DARK,
  TIMBER_LIT,
} from '../palette';
import { alive, clamp, clock, dist } from '../util';

/**
 * Flag Fall — Window-Clerk Ambrell Quoyle of the Hour Office, who in the King's telling timed the
 * queue: every citizen at his window got one turn of his counter clock to plead their Lot, and
 * when the little red flag fell, the hour was taken whether they had finished speaking or not.
 *
 * His counter clock stands in the middle of the yard: one walnut case, two faces (yours blue, his
 * ember) and a rocker of two brass plungers on top. Only one face runs at a time. Whoever's face is
 * running *has the floor*: their cooldowns run quick and blows glance off them; the one waiting
 * takes more and recovers slowly. But the running face eats that fighter's bank. Press the plunger
 * (strike it, by hand — within reach of the case) and the turn passes, with a little time added.
 * Let your bank run out and the flag falls: you are stamped, held, and the turn goes over anyway.
 *
 * Only the fighter on the clock can press. The clever play is to keep Quoyle *from* the clock while
 * his bank runs low — and to have your own turn's worth of reach when you need it. Halfway down he
 * plays blitz: shorter banks, no added time, and the flag hits harder.
 */

const ID = fallenId('clockwork', 'flag-fall');
const BANK = 9;
const BANK_BLITZ = 6;
const INCREMENT = 1.5;
/** A turn must run this long (s) before the plunger takes — no tapping it straight back. */
const MIN_TURN = 1.8;
const REACH = 170;
const EMBER = 0xe8823a;
const EMBER_LIT = 0xffc080;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const step = clock();
  const C: Pt = { x: W / 2, y: (top + H) / 2 + 20 };
  const bank = new Map<Fighter, number>([[player, BANK], [npc, BANK]]);
  let runner: Fighter = npc;
  let turnAge = 0;
  let blitz = false;
  let plunger: StrikeTarget | null = null;
  let lastWarnSec = -1;
  let flagAt = -1e9;
  let flagged: Fighter | null = null;
  let pressAt = -1e9;
  let nagAt = -1e9;

  const other = (f: Fighter): Fighter => (f === player ? npc : player);
  const full = (): number => (blitz ? BANK_BLITZ : BANK);
  const left = (f: Fighter): number => bank.get(f) ?? 0;

  function press(by: 'player' | 'npc'): void {
    const f = by === 'player' ? player : npc;
    const now = tk.now;
    if (f !== runner) {
      if (now - nagAt > 900) { nagAt = now; ctx.float(C.x, C.y - 86, 'NOT YOUR MOVE', '#c8c8c0'); }
      return;
    }
    if (dist(f.x, f.y, C.x, C.y) > REACH || turnAge < MIN_TURN) return;
    if (!blitz) bank.set(f, Math.min(full() + 3, left(f) + INCREMENT));
    runner = other(f);
    turnAge = 0;
    pressAt = now;
    lastWarnSec = -1;
    ctx.sfx('clock-tick');
  }

  function flag(time: number): void {
    const f = runner;
    flagAt = time;
    flagged = f;
    if (f === player) tk.hitPlayer(blitz ? 24 : 18, f.x, f.y);
    else ctx.hit(npc, blitz ? 40 : 30, f.x, f.y);
    ctx.stun(f, blitz ? 1600 : 1300);
    ctx.flash(f.x, f.y, CARD_RED);
    ctx.sfx('judgement');
    ctx.banner(f === player ? 'YOUR FLAG FALLS' : 'HIS FLAG FALLS', '#ff8a7a');
    runner = other(f);
    turnAge = 0;
    lastWarnSec = -1;
    bank.set(player, full());
    bank.set(npc, full());
  }

  return {
    update(time, dt) {
      step(time);
      const d = clamp(dt, 0, 0.1);
      if (!plunger) plunger = ctx.target({ x: C.x, y: C.y - 62, r: 26, onStruck: (by) => press(by) });
      if (!blitz && npc.hp < npc.maxHp * 0.5) {
        blitz = true;
        bank.set(player, Math.min(left(player), BANK_BLITZ));
        bank.set(npc, Math.min(left(npc), BANK_BLITZ));
        ctx.banner('BLITZ — NO ADDED TIME', '#ffd08a');
        ctx.sfx('countdown-go');
      }
      if (!alive(player) || !alive(npc)) return;
      turnAge += d;
      const b = Math.max(0, left(runner) - d);
      bank.set(runner, b);
      const sec = Math.ceil(b);
      if (b < 3 && sec !== lastWarnSec) { lastWarnSec = sec; ctx.sfx('countdown-tick'); }
      if (b <= 0) flag(time);
    },

    playerTakenMult: () => (runner === player ? 0.75 : 1.25),
    npcTakenMult: () => (runner === npc ? 0.75 : 1.25),
    playerCooldownRate: () => (runner === player ? 1.4 : 0.8),
    npcCooldownRate: () => (runner === npc ? 1.4 : 0.8),

    npcSeek() {
      if (!alive(player) || !alive(npc)) return null;
      if (runner === npc) {
        // Low on time: go and press, from the side away from you.
        if (left(npc) < 3.6 && turnAge > MIN_TURN - 0.4) {
          const s = player.x < C.x ? 1 : -1;
          return { x: tk.clampX(C.x + s * 70), y: tk.clampY(C.y - 20) };
        }
        return null;
      }
      // Waiting: if your bank is low, stand in the way between you and the clock.
      if (left(player) < 4.5) return { x: tk.clampX(player.x + (C.x - player.x) * 0.5), y: tk.clampY(player.y + (C.y - player.y) * 0.5) };
      return null;
    },

    drawGround(g, time) {
      // The reach ring: where a hand can find the plunger.
      const mine = runner === player;
      g.lineStyle(2, mine ? BLUED_LIT : EMBER, 0.22 + Math.sin(time / 300) * 0.06);
      for (let i = 0; i < 48; i += 2) {
        const a0 = (i / 48) * Math.PI * 2, a1 = ((i + 1) / 48) * Math.PI * 2;
        g.beginPath(); g.arc(C.x, C.y, REACH, a0, a1, false); g.strokePath();
      }
      // A ring of ticks under whoever has the floor, turning as their time drains.
      if (alive(runner)) {
        const col = runner === player ? BLUED_LIT : EMBER_LIT;
        const k = left(runner) / full();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + time / 900;
          const on = i / 12 < k;
          g.lineStyle(on ? 3 : 1.5, on ? col : PAID_GREY, on ? 0.85 : 0.4);
          g.lineBetween(runner.x + Math.cos(a) * 24, runner.y + 16 + Math.sin(a) * 9, runner.x + Math.cos(a) * 31, runner.y + 16 + Math.sin(a) * 11.5);
        }
      }
      drawCounterClock(g, C, time, {
        pk: left(player) / full(), nk: left(npc) / full(), runner: runner === player ? 'p' : 'n',
        press: clamp(1 - (time - pressAt) / 260, 0, 1), flagged: time - flagAt < 900 ? (flagged === player ? 'p' : 'n') : '',
      });
    },

    drawHud(g, time) {
      const y = top + 16;
      for (const side of ['p', 'n'] as const) {
        const f = side === 'p' ? player : npc;
        const k = clamp(left(f) / full(), 0, 1);
        const x0 = side === 'p' ? W / 2 - 152 : W / 2 + 22;
        const run = runner === f;
        const col = side === 'p' ? BLUED_LIT : EMBER;
        g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x0 - 4, y - 9, 138, 18, 5);
        g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x0, y - 6, 130, 12, 4);
        const low = k < 0.3 && run;
        g.fillStyle(low ? CARD_RED : col, run ? 0.9 + Math.sin(time / 90) * 0.1 : 0.45);
        if (side === 'p') g.fillRect(x0 + 130 * (1 - k), y - 5, 130 * k, 10);
        else g.fillRect(x0, y - 5, 130 * k, 10);
        // A little flag at the empty end.
        const fx = side === 'p' ? x0 - 12 : x0 + 142;
        const up = low ? -4 + Math.sin(time / 50) * 2 : 0;
        g.lineStyle(1.5, BRASS_LIT, 1); g.lineBetween(fx, y + 7, fx, y - 8);
        g.fillStyle(CARD_RED, 1); g.fillTriangle(fx, y - 8 + up, fx, y - 1 + up, fx + (side === 'p' ? -8 : 8), y - 4.5 + up);
      }
      // Whose move: a rocker between the bars.
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(W / 2 - 4, y, 4);
      const tilt = runner === player ? 0.35 : -0.35;
      g.lineStyle(3, BRASS, 1); g.lineBetween(W / 2 - 4 - Math.cos(tilt) * 12, y - Math.sin(tilt) * 12, W / 2 - 4 + Math.cos(tilt) * 12, y + Math.sin(tilt) * 12);
    },

    destroy() { plunger?.remove(); },
  };
}

interface ClockState { pk: number; nk: number; runner: 'p' | 'n'; press: number; flagged: '' | 'p' | 'n' }

/**
 * The counter clock: a walnut case on bun feet, two enamel faces whose minute hands climb toward
 * twelve as a bank drains (lifting a red flag on its pivot), and the brass rocker of plungers on top
 * — the running side's button stands up, the other is pressed down.
 */
function drawCounterClock(g: G, C: Pt, time: number, s: ClockState): void {
  const x = C.x, y = C.y;
  shadow(g, x, y + 36, 200, 34, 0.38);
  // Bun feet and the case.
  for (const fx of [-70, 70]) { g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x + fx, y + 34, 26, 12); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x - 92, y - 52, 184, 86, 12);
  g.fillStyle(TIMBER, 1); g.fillRoundedRect(x - 88, y - 50, 176, 80, 10);
  // Walnut figure: a few dark grain lines across the case.
  for (let i = 0; i < 6; i++) {
    const gy = y - 40 + i * 13;
    g.lineStyle(1, TIMBER_DARK, 0.35);
    g.beginPath(); g.moveTo(x - 84, gy);
    for (let k = 1; k <= 8; k++) g.lineTo(x - 84 + k * 21, gy + Math.sin(k * 1.3 + i) * 2.5);
    g.strokePath();
  }
  g.lineStyle(2, TIMBER_LIT, 0.7); g.strokeRoundedRect(x - 86, y - 48, 172, 76, 9);
  // Brass plinth rail.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 90, y + 22, 180, 7);
  g.fillStyle(BRASS, 1); g.fillRect(x - 90, y + 22, 180, 3);
  // The two faces.
  for (const side of ['p', 'n'] as const) {
    const fx = x + (side === 'p' ? -44 : 44), fy = y - 10;
    const k = clamp(side === 'p' ? s.pk : s.nk, 0, 1);
    const run = s.runner === side;
    const minA = (1 - Math.min(1, k)) * Math.PI * 1.6 - Math.PI * 1.6;
    const bez = side === 'p' ? BLUED : 0xa85a22;
    if (run) glow(g, fx, fy, 40, side === 'p' ? BLUED_LIT : EMBER_LIT, 0.05, 3);
    dial(g, fx, fy, 30, minA / 12 - 0.6, minA, run ? ENAMEL : 0xd8d2c4, bez);
    // The flag on its pivot at twelve: lifted by the hand as it nears, dropped when it falls.
    const fallen = s.flagged === side;
    const lift = fallen ? 1.9 : k < 0.18 ? (0.18 - k) / 0.18 : 0;
    const pa = -Math.PI / 2 - 0.35 - lift * 0.9;
    const px = fx + 5, py = fy - 30;
    g.lineStyle(1.5, IRON_DARK, 1); g.lineBetween(px, py, px + Math.cos(pa) * 12, py + Math.sin(pa) * 12);
    g.fillStyle(CARD_RED, 1);
    g.fillTriangle(px + Math.cos(pa) * 12, py + Math.sin(pa) * 12, px + Math.cos(pa) * 5, py + Math.sin(pa) * 5,
      px + Math.cos(pa) * 9 + Math.cos(pa + Math.PI / 2) * 7, py + Math.sin(pa) * 9 + Math.sin(pa + Math.PI / 2) * 7);
    g.fillStyle(BRASS, 1); g.fillCircle(px, py, 2);
    if (fallen) glow(g, fx, fy - 26, 22, CARD_RED, 0.12, 2);
  }
  // The rocker and its two plungers.
  const tilt = s.runner === 'p' ? -1 : 1;
  const bob = s.press * 3;
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 6, y - 64, 12, 14);
  gear(g, x, y - 58, 9, 10, time / 1200, BRASS, 0.5, 3);
  for (const side of [-1, 1]) {
    const up = side === tilt ? 0 : 8;
    const bx = x + side * 44, by = y - 70 + up + (side === tilt ? 0 : bob);
    g.fillStyle(BRASS_DARK, 1); g.fillRect(bx - 4, by, 8, y - 52 - by);
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(bx, by + 2, 24, 10);
    g.fillStyle(side === tilt ? BRASS_LIT : BRASS, 1); g.fillEllipse(bx, by, 22, 9);
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(bx - 4, by - 1.5, 8, 3);
  }
  g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(x - 44, y - 56 + (tilt < 0 ? -4 : 4), x + 44, y - 56 + (tilt < 0 ? 4 : -4));
}

export const FALLEN_FLAG_FALL: GimmickDef = {
  id: ID,
  rules: 'Your running face shields and quickens you but drains your bank. Press the plunger, in reach, to pass the turn. Let your flag fall: stamped.',
  make,
};
