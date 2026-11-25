import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { ABY, alive, bubbleStream, clamp, dist } from '../palette';

/**
 * Valves in Arrears — Breathclerk Ingram Wheeze's fight (the man who turned the valves down).
 *
 * The Breathworks sells the city its air by the household, and Wheeze keeps the book. The
 * arena is laced with the Breathworks main: six brass **taps**, each a valve wheel over a
 * coin-meter. Out on the open floor there is no air to speak of — both fighters' **breath**
 * drains, and an empty chest gasps (hurt every half-second, legs heavy). A paid tap turns
 * (a telegraphed spin, a hiss) and blows a **pocket** of air around itself for a few seconds;
 * inside one, breath comes back fast. Pockets keep opening and closing round the room on the
 * clerk's schedule, so the fight is a walk from pocket to pocket.
 *
 * The exploit is that a valve answers whoever strikes it. Strike an open tap and it is turned
 * down — its pocket collapses on whoever is breathing in it, and another tap pays out
 * elsewhere at once; strike a shut tap and its arrears are paid — it starts turning. Starve
 * Wheeze: shut his pocket, open yours.
 *
 * Halfway, **the account is called**: breath drains faster, pockets shrink, and every blow
 * landed takes breath from the one struck and gives it to the striker.
 */

const ID = fallenId('abyssal', 'arrears');
const TURN_MS = 1100;
const OPEN_MS = 6400;
const CLOSE_MS = 650;
const SCHEDULE_MS = 3100;
const POCKET_R = 84;
const POCKET_R_CALLED = 64;
const DRAIN = 10.5;
const FILL = 46;
const GASP_DMG = 5;
const STEAL = 11;

type G = Parameters<NonNullable<EncounterGimmick['drawGround']>>[0];
type TapState = 'shut' | 'turning' | 'open' | 'closing';

interface Tap { x: number; y: number; state: TapState; since: number; lockUntil: number; target: StrikeTarget | null; spin: number }
interface Lung { breath: number; gaspAt: number }
interface Siphon { ax: number; ay: number; bx: number; by: number; at: number }

export const ARREARS: GimmickDef = {
  id: ID,
  rules: 'Off the air pockets your breath drains; empty, you gasp. Strike an open tap to shut it, a shut one to open it. At half, blows steal breath.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    const ph = H - top;
    const spots: [number, number][] = [[0.18, 0.24], [0.5, 0.18], [0.82, 0.24], [0.18, 0.78], [0.5, 0.84], [0.82, 0.78]];
    const taps: Tap[] = spots.map(([fx, fy]) => ({ x: W * fx, y: top + ph * fy, state: 'shut', since: 0, lockUntil: 0, target: null, spin: 0 }));
    const lungs = new Map<Fighter, Lung>([[ctx.player, { breath: 100, gaspAt: 0 }], [ctx.npc, { breath: 100, gaspAt: 0 }]]);
    const siphons: Siphon[] = [];
    let now = 0;
    let nextAt = -1;
    let called = false;

    const pocketR = (): number => (called ? POCKET_R_CALLED : POCKET_R);
    /** Current radius of a tap's pocket — grows in as it opens, collapses as it shuts. */
    const radiusOf = (t: Tap): number => {
      if (t.state === 'open') return pocketR() * Math.min(1, (now - t.since) / 260);
      if (t.state === 'closing') return pocketR() * Math.max(0, 1 - (now - t.since) / CLOSE_MS);
      return 0;
    };
    const inPocket = (f: Fighter): boolean => taps.some((t) => radiusOf(t) > 10 && dist(f.x, f.y, t.x, t.y) < radiusOf(t));
    const startTurning = (t: Tap): void => { t.state = 'turning'; t.since = now; ctx.sfx('gear-turn'); };
    const shutAny = (except: Tap | null): void => {
      const choices = taps.filter((t) => t !== except && t.state === 'shut');
      if (choices.length) startTurning(choices[Math.floor(ctx.rng() * choices.length)]);
    };

    for (const t of taps) {
      t.target = ctx.target({
        x: t.x, y: t.y - 6, r: 24,
        onStruck: () => {
          if (now < t.lockUntil) return;
          t.lockUntil = now + 1200;
          if (t.state === 'open' || t.state === 'turning') {
            t.state = 'closing'; t.since = now;
            ctx.sfx('clang'); ctx.flash(t.x, t.y, ABY.membrane);
            shutAny(t);
          } else if (t.state === 'shut') {
            startTurning(t); ctx.sfx('money');
          }
        },
      });
    }

    return {
      update(time: number, dtIn: number) {
        const dt = Math.min(0.05, dtIn);
        now = time;
        if (nextAt < 0) { nextAt = time + 400; }
        if (!called && ctx.npc.hp <= ctx.npc.maxHp * 0.5) {
          called = true;
          ctx.banner('THE ACCOUNT IS CALLED', '#ffcf5a');
          ctx.sfx('judgement');
        }
        if (time >= nextAt) {
          nextAt = time + SCHEDULE_MS * (called ? 0.85 : 1);
          if (taps.filter((t) => t.state === 'open' || t.state === 'turning').length < 3) shutAny(null);
        }
        for (const t of taps) {
          if (t.state === 'turning') {
            t.spin += dt * 9;
            if (time - t.since >= TURN_MS) { t.state = 'open'; t.since = time; ctx.sfx('bubble'); }
          } else if (t.state === 'open') {
            t.spin += dt * 1.5;
            if (time - t.since >= OPEN_MS) { t.state = 'closing'; t.since = time; }
          } else if (t.state === 'closing' && time - t.since >= CLOSE_MS) {
            t.state = 'shut'; t.since = time;
          }
        }
        for (const [f, lung] of lungs) {
          if (!alive(f)) continue;
          if (inPocket(f)) lung.breath = Math.min(100, lung.breath + FILL * dt);
          else lung.breath = Math.max(0, lung.breath - DRAIN * (called ? 1.45 : 1) * dt);
          if (lung.breath <= 0 && time >= lung.gaspAt) {
            lung.gaspAt = time + 500;
            ctx.hit(f, GASP_DMG, f.x, f.y);
            if (f === ctx.player) ctx.sfx('heartbeat');
          }
        }
        while (siphons.length && time - siphons[0].at > 600) siphons.shift();
      },

      playerSpeedMult: () => ((lungs.get(ctx.player)?.breath ?? 100) <= 0 ? 0.7 : 1),
      npcSpeedMult: () => ((lungs.get(ctx.npc)?.breath ?? 100) <= 0 ? 0.7 : 1),

      onNpcHurt() {
        if (!called) return;
        const from = lungs.get(ctx.npc), to = lungs.get(ctx.player);
        if (!from || !to) return;
        from.breath = Math.max(0, from.breath - STEAL);
        to.breath = Math.min(100, to.breath + STEAL);
        siphons.push({ ax: ctx.npc.x, ay: ctx.npc.y, bx: ctx.player.x, by: ctx.player.y, at: now });
      },
      onPlayerHurt() {
        if (!called) return;
        const from = lungs.get(ctx.player), to = lungs.get(ctx.npc);
        if (!from || !to) return;
        from.breath = Math.max(0, from.breath - STEAL);
        to.breath = Math.min(100, to.breath + STEAL);
        siphons.push({ ax: ctx.player.x, ay: ctx.player.y, bx: ctx.npc.x, by: ctx.npc.y, at: now });
      },

      npcSeek() {
        const n = ctx.npc, p = ctx.player;
        const b = lungs.get(n)?.breath ?? 100;
        const open = taps.filter((t) => t.state === 'open' && now - t.since < OPEN_MS - 900);
        // The clerk shuts the valve you are breathing at, if he has the air to spare.
        if (b > 45) {
          const yours = open.find((t) => dist(p.x, p.y, t.x, t.y) < pocketR());
          if (yours && dist(n.x, n.y, yours.x, yours.y) < 360) return { x: yours.x, y: yours.y + 30 };
        }
        if (b < 60 && open.length) {
          let best = open[0];
          for (const t of open) if (dist(n.x, n.y, t.x, t.y) < dist(n.x, n.y, best.x, best.y)) best = t;
          return { x: best.x + (n.x < best.x ? -24 : 24), y: best.y + 26 };
        }
        // Short of a pocket, he goes to pay one open himself.
        if (b < 35) {
          const shut = taps.filter((t) => t.state === 'shut');
          if (shut.length) {
            let best = shut[0];
            for (const t of shut) if (dist(n.x, n.y, t.x, t.y) < dist(n.x, n.y, best.x, best.y)) best = t;
            return { x: best.x, y: best.y + 30 };
          }
        }
        return null;
      },

      drawGround(g, time) {
        const t = time / 1000;
        drawMains(g, taps, W, top, ph);
        for (const tap of taps) {
          const r = radiusOf(tap);
          if (tap.state === 'turning') {
            // The telegraph: the pocket's ring drawn in dashes, closing up as the wheel spins.
            const k = (time - tap.since) / TURN_MS;
            g.lineStyle(2, ABY.membrane, 0.25 + 0.5 * k);
            for (let i = 0; i < 24; i++) {
              const a0 = (i / 24) * Math.PI * 2 + t * 0.8, a1 = a0 + (Math.PI * 2 / 24) * k;
              g.beginPath(); g.arc(tap.x, tap.y, pocketR(), a0, a1, false); g.strokePath();
            }
            bubbleStream(g, tap.x - 10, tap.y - 18, 40, t * 3, tap.x, 4, 0.5);
          }
          if (r > 4) {
            g.fillStyle(ABY.membraneDim, 0.13); g.fillCircle(tap.x, tap.y, r);
            g.fillStyle(ABY.membrane, 0.06); g.fillCircle(tap.x - r * 0.15, tap.y - r * 0.15, r * 0.7);
            // The wobbling skin of the pocket.
            g.lineStyle(2.5, ABY.membrane, 0.65);
            g.beginPath();
            for (let i = 0; i <= 40; i++) {
              const a = (i / 40) * Math.PI * 2;
              const rr = r + Math.sin(a * 5 + t * 4 + tap.x) * 2.5;
              const px = tap.x + Math.cos(a) * rr, py = tap.y + Math.sin(a) * rr;
              if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
            }
            g.strokePath();
            g.lineStyle(3, 0xffffff, 0.35);
            g.beginPath(); g.arc(tap.x, tap.y, r * 0.86, Math.PI * 1.1, Math.PI * 1.45, false); g.strokePath();
            for (let i = 0; i < 3; i++) bubbleStream(g, tap.x - 30 + i * 30, tap.y + r * 0.4, r * 1.1, t, i + tap.y, 4, 0.45);
          }
          drawTap(g, tap, t);
        }
      },

      drawAir(g, time) {
        const t = time / 1000;
        for (const [f, lung] of lungs) {
          if (!alive(f) || lung.breath > 22) continue;
          // Running short: the last of the air leaving in a string of bubbles; empty, a blue ring of cold.
          bubbleStream(g, f.x + 6, f.y - 34, 46, t * 1.6, f === ctx.player ? 3 : 9, lung.breath <= 0 ? 6 : 3, 0.8);
          if (lung.breath <= 0) {
            g.lineStyle(2, 0x7aa6c8, 0.45 + Math.sin(t * 9) * 0.2);
            g.strokeCircle(f.x, f.y, 26 + Math.sin(t * 6) * 2);
          }
        }
        for (const s of siphons) {
          // Breath torn from the struck and drawn to the striker: a short string of bright bubbles.
          const k = (time - s.at) / 600;
          for (let i = 0; i < 6; i++) {
            const u = clamp(k * 1.4 - i * 0.08, 0, 1);
            const x = s.ax + (s.bx - s.ax) * u, y = s.ay - 30 + (s.by - s.ay) * u - Math.sin(u * Math.PI) * 30;
            g.lineStyle(1.5, ABY.membrane, 0.9 * (1 - k)); g.strokeCircle(x, y, 3 + i * 0.4);
          }
        }
      },

      drawHud(g) {
        // Two strings of ten breath-bubbles under the HUD: yours on the left, the clerk's on the right.
        const row = (x0: number, f: Fighter, dir: number): void => {
          const b = lungs.get(f)?.breath ?? 0;
          for (let i = 0; i < 10; i++) {
            const x = x0 + dir * i * 15, y = top + 16;
            const fill = clamp(b / 10 - i, 0, 1);
            g.lineStyle(1.5, b <= 0 ? 0xc8283c : ABY.membrane, 0.9); g.strokeCircle(x, y, 6);
            if (fill > 0) { g.fillStyle(ABY.membrane, 0.35 + 0.5 * fill); g.fillCircle(x, y, 5 * fill); }
            g.fillStyle(0xffffff, 0.7); g.fillCircle(x - 2, y - 2, 1.2);
          }
        };
        row(24, ctx.player, 1);
        row(W - 24, ctx.npc, -1);
        if (called) {
          // The called account: an open ledger with the red seal pressed on it.
          const x = W / 2, y = top + 18;
          g.fillStyle(0x000000, 0.5); g.fillRect(x - 24, y - 11, 48, 24);
          g.fillStyle(0xe8e0c8, 1); g.fillRect(x - 21, y - 9, 20, 19); g.fillRect(x + 1, y - 9, 20, 19);
          g.lineStyle(1, ABY.boneDark, 1);
          for (let i = 0; i < 4; i++) { g.lineBetween(x - 18, y - 5 + i * 4, x - 4, y - 5 + i * 4); g.lineBetween(x + 4, y - 5 + i * 4, x + 18, y - 5 + i * 4); }
          g.fillStyle(0xb0283c, 1); g.fillCircle(x + 11, y + 5, 6);
          g.fillStyle(0xe05a6a, 1); g.fillCircle(x + 10, y + 4, 2.5);
        }
      },

      destroy() {
        for (const t of taps) t.target?.remove();
        lungs.clear();
      },
    };
  },
};

/** The Breathworks main: iron pipe from the west wall along both rows of taps, with brass flanges. */
function drawMains(g: G, taps: Tap[], W: number, top: number, ph: number): void {
  const midY = top + ph * 0.5;
  const runs: [number, number, number, number][] = [
    [0, midY, W * 0.5, midY],
    [W * 0.5, taps[1].y + 30, W * 0.5, taps[4].y - 30],
    [taps[0].x, taps[0].y + 30, taps[2].x, taps[2].y + 30],
    [taps[3].x, taps[3].y - 30, taps[5].x, taps[5].y - 30],
    [taps[0].x, taps[0].y + 30, taps[0].x, taps[0].y + 4],
    [taps[2].x, taps[2].y + 30, taps[2].x, taps[2].y + 4],
    [taps[3].x, taps[3].y - 30, taps[3].x, taps[3].y + 4],
    [taps[5].x, taps[5].y - 30, taps[5].x, taps[5].y + 4],
  ];
  for (const [ax, ay, bx, by] of runs) {
    g.lineStyle(13, 0x000000, 0.35); g.lineBetween(ax + 2, ay + 4, bx + 2, by + 4);
    g.lineStyle(11, ABY.iron, 1); g.lineBetween(ax, ay, bx, by);
    g.lineStyle(5, ABY.ironLit, 0.8); g.lineBetween(ax, ay - 2, bx, by - 2);
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.floor(len / 70);
    for (let i = 1; i <= n; i++) {
      const u = i / (n + 1), x = ax + (bx - ax) * u, y = ay + (by - ay) * u;
      const vert = Math.abs(bx - ax) < 1;
      g.fillStyle(ABY.brassDark, 1);
      if (vert) g.fillRect(x - 9, y - 3, 18, 6); else g.fillRect(x - 3, y - 9, 6, 18);
      g.fillStyle(ABY.brass, 1);
      if (vert) { g.fillCircle(x - 6, y, 1.4); g.fillCircle(x + 6, y, 1.4); } else { g.fillCircle(x, y - 6, 1.4); g.fillCircle(x, y + 6, 1.4); }
    }
    g.fillStyle(ABY.rust, 0.5);
    g.fillCircle(ax + (bx - ax) * 0.37, ay + (by - ay) * 0.37 + 3, 3);
  }
}

/** One tap: the coin-meter box, the valve wheel on top, and — while shut — its chain and arrears seal. */
function drawTap(g: G, tap: Tap, t: number): void {
  const { x, y } = tap;
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x + 3, y + 14, 44, 12);
  // Meter box: brass casing, a dial, the coin slot.
  g.fillStyle(ABY.brassDark, 1); g.fillRect(x - 16, y - 6, 32, 20);
  g.fillStyle(ABY.brass, 1); g.fillRect(x - 14, y - 4, 28, 16);
  g.fillStyle(0xe8e0c8, 1); g.fillCircle(x - 5, y + 4, 5);
  const needle = tap.state === 'shut' ? Math.PI * 0.8 : Math.PI * 1.6 + Math.sin(t * 7) * 0.2;
  g.lineStyle(1, ABY.tar, 1); g.lineBetween(x - 5, y + 4, x - 5 + Math.cos(needle) * 4, y + 4 + Math.sin(needle) * 4);
  g.fillStyle(ABY.tar, 1); g.fillRect(x + 4, y - 1, 7, 2);
  // Stem and wheel.
  g.fillStyle(ABY.iron, 1); g.fillRect(x - 2, y - 16, 4, 12);
  const wy = y - 18;
  g.lineStyle(3, ABY.brassDark, 1); g.strokeEllipse(x, wy, 30, 12);
  g.lineStyle(1.5, mixC(ABY.brass, 0xffffff, 0.3), 1); g.strokeEllipse(x, wy - 1, 28, 10);
  for (let i = 0; i < 5; i++) {
    const a = tap.spin + (i / 5) * Math.PI * 2;
    g.lineStyle(2, ABY.brass, 1); g.lineBetween(x, wy, x + Math.cos(a) * 14, wy + Math.sin(a) * 5);
  }
  g.fillStyle(ABY.brassDark, 1); g.fillCircle(x, wy, 3);
  if (tap.state === 'shut') {
    // Chained shut: links across the wheel, a padlock, and a red seal for the arrears.
    for (let i = 0; i < 6; i++) {
      g.lineStyle(1.5, ABY.ironLit, 1);
      g.strokeEllipse(x - 13 + i * 5.2, wy + (i % 2 ? 1 : -1), 5, 3);
    }
    g.lineStyle(2, ABY.ironLit, 1); g.beginPath(); g.arc(x + 12, wy + 4, 3.5, Math.PI, 0, false); g.strokePath();
    g.fillStyle(ABY.iron, 1); g.fillRect(x + 7.5, wy + 4, 9, 7);
    g.fillStyle(0xb0283c, 1); g.fillCircle(x - 12, y + 8, 4.5);
    g.fillStyle(0xe05a6a, 0.9); g.fillCircle(x - 13, y + 7, 1.6);
  } else if (tap.state === 'open') {
    bubbleStream(g, x + 6, wy - 4, 22, t * 1.4, x, 3, 0.6);
  }
}
