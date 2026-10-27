import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_MIRROR } from '../encounters';
import { FOE_C, GILT, GILT_LIT, INK, MINE_C, POISON, apple, clamp, dist, frameClock, magicMirror } from '../util';

/**
 * Mirror, Mirror — the Stepmother's mirror stands at the head of the yard. Every few seconds it is
 * asked the question, and for a long breath it weighs the two of you (both health shares show in
 * the glass). Then it answers: **whoever has more health left is the fairest** — and the fairest
 * is cursed. Until the next question they take double from everything.
 *
 * While someone is cursed, poisoned apples roll out from under the mirror at them, one after
 * another, along the floor. An apple poisons whoever it touches — cursed or not — and slows them.
 *
 * The rule the player can turn: be the uglier one at the question. Trade a hit just before it is
 * asked, keep your health a shade under Gilt's — then pile into her while she is cursed, and let
 * the apples chase her round the yard.
 */

type Side = 'p' | 'n';
interface Apple { x: number; y: number; vx: number; vy: number; at: number; goAt: number; spin: number; aimed: Side; dead: boolean }

function makeMirror(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const period = hard ? 7500 : 9000;
  const askMs = hard ? 1500 : 1800;
  const appleEvery = hard ? 1300 : 1600;
  const appleSpd = hard ? 290 : 250;
  const mx = W / 2, my = top + 150;
  const t0 = ctx.scene.time.now;

  let nextAsk = t0 + 3500;
  let askAt = -1;
  let cursed: Side | null = null;
  let cursedAt = -9999;
  let nextApple = 0;
  let apples: Apple[] = [];
  const poisonUntil: Record<Side, number> = { p: 0, n: 0 };

  const fighter = (s: Side): Fighter => (s === 'p' ? ctx.player : ctx.npc);
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const share = (f: Fighter): number => f.hp / Math.max(1, f.maxHp);

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;

      // The question.
      if (askAt < 0 && time >= nextAsk) {
        askAt = time;
        ctx.banner('MIRROR, MIRROR, ON THE WALL…', '#d8c8ff');
        ctx.sfx('crystal-chime');
      }
      if (askAt >= 0 && time >= askAt + ctx.tk.warn(askMs)) {
        askAt = -1;
        nextAsk = time + period;
        const p = share(ctx.player), n = share(ctx.npc);
        cursed = p >= n ? 'p' : 'n';
        cursedAt = time;
        nextApple = time + 700;
        const f = fighter(cursed);
        ctx.float(f.x, f.y - 60, 'THE FAIREST OF THEM ALL', cursed === 'p' ? '#ffb0d0' : '#d8c8ff');
        ctx.flash(f.x, f.y, 0xd8c8ff);
        ctx.sfx('curse-cast');
      }

      // Apples roll at the fairest.
      if (cursed && time >= nextApple) {
        nextApple = time + appleEvery;
        apples.push({ x: mx + (ctx.rng() - 0.5) * 40, y: my + 10, vx: 0, vy: 0, at: time, goAt: time + ctx.tk.warn(520), spin: 0, aimed: cursed, dead: false });
        ctx.sfx('boing');
      }
      for (const a of apples) {
        if (a.dead) continue;
        if (time < a.goAt) {
          // Wobbling on the spot under the mirror, lining up.
          const t = fighter(a.aimed);
          const ang = Math.atan2(t.y - a.y, t.x - a.x);
          a.vx = Math.cos(ang) * appleSpd; a.vy = Math.sin(ang) * appleSpd;
          continue;
        }
        a.x += a.vx * dt; a.y += a.vy * dt; a.spin += dt * 10;
        if (a.x < 20 || a.x > W - 20 || a.y < top + 20 || a.y > H - 20) { a.dead = true; continue; }
        for (const s of ['p', 'n'] as Side[]) {
          const f = fighter(s);
          if (!alive(f) || dist(f.x, f.y, a.x, a.y) > 28) continue;
          a.dead = true;
          ctx.hit(f, hard ? 9 : 7, f.x, f.y);
          poisonUntil[s] = time + 1600;
          ctx.float(f.x, f.y - 52, 'POISONED', '#9aff6a');
          ctx.sfx('status-poison');
          break;
        }
      }
      apples = apples.filter((a) => !a.dead && time - a.at < 6000);
    },

    playerTakenMult: () => (cursed === 'p' ? 2 : 1),
    npcTakenMult: () => (cursed === 'n' ? 2 : 1),
    playerSpeedMult: () => (ctx.scene.time.now < poisonUntil.p ? 0.7 : 1),
    npcSpeedMult: () => (ctx.scene.time.now < poisonUntil.n ? 0.7 : 1),

    npcSeek(): Pt | null {
      const n = ctx.npc;
      // Dodge the nearest rolling apple coming her way.
      let worst: Apple | null = null, wd = Infinity;
      for (const a of apples) {
        if (ctx.scene.time.now < a.goAt) continue;
        const d = dist(n.x, n.y, a.x, a.y);
        const closing = (n.x - a.x) * a.vx + (n.y - a.y) * a.vy > 0;
        if (closing && d < wd && d < 260) { wd = d; worst = a; }
      }
      if (worst) {
        const L = Math.hypot(worst.vx, worst.vy) || 1;
        const nx = -worst.vy / L, ny = worst.vx / L;
        const side = (n.x - worst.x) * nx + (n.y - worst.y) * ny >= 0 ? 1 : -1;
        return { x: clamp(n.x + nx * side * 110, 60, W - 60), y: clamp(n.y + ny * side * 110, top + 50, H - 50) };
      }
      return null;
    },

    drawGround(g, time) {
      // A long reflection pooled on the floor under the mirror, and the cursed one's mirror-ring.
      g.fillStyle(0xd8c8ff, 0.08); g.fillEllipse(mx, my + 40, 220, 60);
      g.lineStyle(1.4, 0xd8c8ff, 0.25); g.strokeEllipse(mx, my + 40, 220, 60);
      if (cursed) {
        const f = fighter(cursed);
        if (alive(f)) {
          const p = 0.5 + 0.5 * Math.sin(time / 180);
          g.lineStyle(3, 0xd8c8ff, 0.45 + p * 0.3); g.strokeEllipse(f.x, f.y + 16, 56, 18);
          g.fillStyle(0xd8c8ff, 0.12); g.fillEllipse(f.x, f.y + 16, 56, 18);
        }
      }
      // Aim lines for apples about to roll.
      for (const a of apples) {
        if (time >= a.goAt) continue;
        const L = Math.hypot(a.vx, a.vy) || 1;
        g.lineStyle(2, POISON, 0.25 + 0.5 * clamp((time - a.at) / (a.goAt - a.at), 0, 1));
        g.lineBetween(a.x, a.y, a.x + (a.vx / L) * 420, a.y + (a.vy / L) * 420);
      }
    },

    drawAir(g, time) {
      const asking = askAt >= 0;
      const k = asking ? clamp((time - askAt) / ctx.tk.warn(askMs), 0, 1) : 0;
      magicMirror(g, mx, my, 1.15, time / 1000, asking ? Math.min(1, k * 2) : time - cursedAt < 1200 ? 1 - (time - cursedAt) / 1200 : 0.15, cursed === 'p' ? 0xffb0d0 : 0xc8a4ff);
      if (asking) {
        // The weighing: both health shares rise in the glass as two candles of light.
        const gy = my - 80;
        for (const [s, dx, col] of [['p', -12, MINE_C], ['n', 12, FOE_C]] as const) {
          const h = 50 * share(fighter(s)) * k;
          g.fillStyle(col, 0.85); g.fillRect(mx + dx - 4, gy + 25 - h, 8, h);
          g.lineStyle(1, 0xffffff, 0.6); g.strokeRect(mx + dx - 4, gy - 25, 8, 50);
        }
      }
      for (const a of apples) {
        const wob = time < a.goAt ? Math.sin(time / 40) * 2 : 0;
        apple(g, a.x + wob, a.y, 11, true, a.spin);
      }
      // A crown over the fairest.
      if (cursed) {
        const f = fighter(cursed);
        if (alive(f)) {
          const y = f.y - 66 + Math.sin(time / 300) * 2;
          g.fillStyle(GILT, 1); g.fillRect(f.x - 10, y, 20, 6);
          for (let i = 0; i < 3; i++) g.fillTriangle(f.x - 10 + i * 7, y, f.x - 4 + i * 7, y, f.x - 7 + i * 7, y - 9);
          g.fillStyle(GILT_LIT, 1); g.fillCircle(f.x, y + 3, 1.6);
          g.lineStyle(1.2, INK, 0.8); g.strokeRect(f.x - 10, y, 20, 6);
        }
      }
      for (const s of ['p', 'n'] as Side[]) {
        const f = fighter(s);
        if (alive(f) && time < poisonUntil[s]) {
          for (let i = 0; i < 3; i++) { const ph = ((time / 500) + i / 3) % 1; g.fillStyle(POISON, 0.6 * (1 - ph)); g.fillCircle(f.x - 10 + i * 10, f.y - 20 - ph * 24, 3); }
        }
      }
    },

    drawHud(g, time) {
      // The hourglass to the next question, and who wears the curse.
      const x = W / 2, y = top + 14;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 62, y - 10, 124, 24, 6);
      const k = askAt >= 0 ? 1 : clamp(1 - (nextAsk - time) / period, 0, 1);
      g.fillStyle(0xd8c8ff, 0.9); g.fillRect(x - 40, y + 6, 80 * k, 4);
      g.lineStyle(1, 0xffffff, 0.6); g.strokeRect(x - 40, y + 6, 80, 4);
      g.fillStyle(MINE_C, cursed === 'p' ? 1 : 0.4); g.fillCircle(x - 52, y + 1, 5);
      g.fillStyle(FOE_C, cursed === 'n' ? 1 : 0.4); g.fillCircle(x + 52, y + 1, 5);
      if (cursed) { const cx = cursed === 'p' ? x - 52 : x + 52; g.fillStyle(GILT, 1); g.fillTriangle(cx - 5, y - 4, cx + 5, y - 4, cx, y - 10); }
      g.fillStyle(GILT, 1); g.fillEllipse(x, y - 1, 10, 13);
    },
  };
}

export const MIRROR_MIRROR: GimmickDef = {
  id: GIM_MIRROR,
  rules: 'The mirror is asked who is fairest: whoever has more health left is cursed to take double until the next question, and poisoned apples roll at them.',
  make: makeMirror,
};
