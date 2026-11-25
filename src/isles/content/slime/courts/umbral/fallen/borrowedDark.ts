import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { BLACKFLAME, BLACKFLAME_EDGE, BLACKFLAME_LIT, FUNGUS, FUNGUS_DARK, IRON, IRON_LIT, MOULD_DARK } from '../palette';
import { alive, clamp, dist } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Borrowed Dark — Wickwife Ambrosine Kell, who dips the black candles for the Prince's lamps. In the
 * King's telling she sold the dark on tick: a sick household could sit under one of her lamps and
 * mend, and on the night the wick burned down they paid back every hour of it.
 *
 * Her black lamp hangs on one of four crook-posts and throws a pool of dark on the moss. **Inside the
 * pool, a blow you take is lent back to you**: a breath later most of it mends, and the lamp writes
 * the mending down. When the wick gutters (it sputters first), whoever is still in the pool pays back
 * all they were lent and more; then Kell hangs it on the next post and the ledger starts clean.
 *
 * So fight in the pool, and leave before it gutters. Strike the lamp to gutter it now: a short
 * sputter, and whoever is deep in the dark with a long debt pays it there. Past half a second lamp
 * burns on the far post, the two guttering by turns.
 */

const ID = fallenId('umbral', 'borrowed-dark');
const POOL_R = 120;
const LIT_MS = 8000;
const SPUTTER_MS = 1600;
const STRUCK_SPUTTER = 650;
const OUT_MS = 1400;
const LEND = 0.6;
const DELAY = 350;
const INTEREST = 1.4;

interface Lamp {
  hook: number; litAt: number; sputterAt: number; gutterAt: number; outUntil: number;
  ledger: Map<Fighter, number>; target: StrikeTarget | null; struckAt: number;
}
interface Loan { f: Fighter; amount: number; at: number }
interface Mend { x: number; y: number; fx: number; fy: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const hooks = [
    { x: W * 0.27, y: top + 170 }, { x: W * 0.73, y: top + 170 },
    { x: W * 0.73, y: H - 120 }, { x: W * 0.27, y: H - 120 },
  ];
  const lamps: Lamp[] = [];
  const loans: Loan[] = [];
  const mends: Mend[] = [];
  let charging = false;
  let started = false;
  let two = false;

  const at = (l: Lamp) => hooks[l.hook];
  const burning = (l: Lamp, t: number) => t >= l.litAt && t < l.gutterAt;
  const sputtering = (l: Lamp, t: number) => t >= l.sputterAt && t < l.gutterAt;
  const inside = (l: Lamp, f: Fighter) => dist(f.x, f.y, at(l).x, at(l).y) < POOL_R;
  const poolOf = (f: Fighter, t: number) => lamps.find((l) => burning(l, t) && inside(l, f)) ?? null;
  const owed = (f: Fighter) => lamps.reduce((s, l) => s + (l.ledger.get(f) ?? 0), 0);

  function hang(l: Lamp, hook: number, time: number): void {
    l.hook = hook;
    l.litAt = time;
    l.sputterAt = time + LIT_MS;
    l.gutterAt = l.sputterAt + tk.warn(SPUTTER_MS);
    l.outUntil = 0;
    l.ledger.clear();
    l.target?.moveTo(hooks[hook].x + 23, hooks[hook].y - 78);
  }

  function addLamp(hook: number, time: number): void {
    const l: Lamp = { hook, litAt: 0, sputterAt: 0, gutterAt: 0, outUntil: 0, ledger: new Map(), target: null, struckAt: -1e9 };
    l.target = ctx.target({
      x: hooks[hook].x + 23, y: hooks[hook].y - 78, r: 26,
      onStruck: () => {
        const t = tk.now;
        if (!burning(l, t) || sputtering(l, t) || t - l.struckAt < 500) return;
        l.struckAt = t;
        l.sputterAt = t;
        l.gutterAt = t + tk.warn(STRUCK_SPUTTER);
        ctx.sfx('sizzle');
      },
    });
    hang(l, hook, time);
    lamps.push(l);
  }

  function gutter(l: Lamp, time: number): void {
    const p = at(l);
    charging = true;
    for (const f of [player, npc]) {
      const debt = l.ledger.get(f) ?? 0;
      if (!alive(f) || !inside(l, f) || debt < 3) continue;
      const pay = Math.min(70, Math.round(debt * INTEREST));
      if (f === player) tk.hitPlayer(pay, f.x, f.y);
      else ctx.hit(npc, pay, f.x, f.y);
    }
    charging = false;
    l.ledger.clear();
    l.outUntil = time + OUT_MS;
    l.gutterAt = time; l.litAt = Infinity;
    ctx.flash(p.x, p.y, BLACKFLAME_LIT);
    ctx.sfx('smoke');
  }

  function lend(f: Fighter, amount: number): void {
    if (charging || amount <= 0 || !alive(f)) return;
    if (!poolOf(f, tk.now)) return;
    loans.push({ f, amount: amount * LEND, at: tk.now + DELAY });
  }

  return {
    update(time) {
      if (!started) { started = true; addLamp(0, time); }
      if (!two && npc.hp < npc.maxHp * 0.5) {
        two = true;
        addLamp((lamps[0].hook + 2) % 4, time);
        // Stagger them, so they gutter by turns.
        lamps[1].sputterAt = time + LIT_MS * 0.5; lamps[1].gutterAt = lamps[1].sputterAt + tk.warn(SPUTTER_MS);
        ctx.banner('A SECOND LAMP IS LIT', '#c8a0ff');
        ctx.sfx('curse-cast');
      }
      for (const l of lamps) {
        if (l.litAt !== Infinity && time >= l.gutterAt) gutter(l, time);
        else if (l.litAt === Infinity && time >= l.outUntil) {
          // Re-hung on the next free post.
          let h = (l.hook + 1) % 4;
          if (lamps.some((o) => o !== l && o.hook === h)) h = (h + 1) % 4;
          hang(l, h, time);
          ctx.sfx('status-buff');
        }
      }
      for (let i = loans.length - 1; i >= 0; i--) {
        const n = loans[i];
        if (time < n.at) continue;
        loans.splice(i, 1);
        const l = poolOf(n.f, time);
        if (!l || !alive(n.f)) continue;
        const amt = Math.max(1, Math.round(n.amount));
        ctx.heal(n.f, amt);
        l.ledger.set(n.f, (l.ledger.get(n.f) ?? 0) + amt);
        mends.push({ x: at(l).x, y: at(l).y, fx: n.f.x, fy: n.f.y, at: time });
      }
      for (let i = mends.length - 1; i >= 0; i--) if (time - mends[i].at > 600) mends.splice(i, 1);
    },

    onPlayerHurt(amount) { lend(player, amount); },
    onNpcHurt(amount) { lend(npc, amount); },

    npcSeek() {
      const t = tk.now;
      const here = lamps.find((l) => l.litAt !== Infinity && inside(l, npc)) ?? null;
      // Sputtering over him, or his debt is long: out, the short way.
      if (here && (sputtering(here, t) || (here.ledger.get(npc) ?? 0) > 45)) {
        const p = at(here);
        const a = Math.atan2(npc.y - p.y, npc.x - p.x);
        return { x: tk.clampX(p.x + Math.cos(a) * (POOL_R + 60)), y: tk.clampY(p.y + Math.sin(a) * (POOL_R + 60)) };
      }
      // Otherwise fight from inside a fresh pool, on its edge nearest you.
      const fresh = lamps.filter((l) => burning(l, t) && !sputtering(l, t) && l.sputterAt - t > 2200);
      if (!fresh.length) return null;
      fresh.sort((a, b) => dist(npc.x, npc.y, at(a).x, at(a).y) - dist(npc.x, npc.y, at(b).x, at(b).y));
      const p = at(fresh[0]);
      const a = Math.atan2(player.y - p.y, player.x - p.x);
      return { x: tk.clampX(p.x + Math.cos(a) * POOL_R * 0.55), y: tk.clampY(p.y + Math.sin(a) * POOL_R * 0.55) };
    },

    drawGround(g, time) {
      for (let i = 0; i < hooks.length; i++) {
        const l = lamps.find((o) => o.hook === i && o.litAt !== Infinity);
        if (l) drawPool(g, hooks[i].x, hooks[i].y, time, burning(l, time) ? (sputtering(l, time) ? clamp((l.gutterAt - time) / (l.gutterAt - l.sputterAt), 0, 1) : 1) : 0, time - l.litAt);
      }
      for (const m of mends) {
        const k = (time - m.at) / 600;
        for (let j = 0; j < 3; j++) {
          const a = j * 2.1 + m.at;
          const sx = m.x + Math.cos(a) * POOL_R * 0.9, sy = m.y + Math.sin(a) * POOL_R * 0.6;
          g.lineStyle(2, BLACKFLAME_LIT, 0.7 * (1 - k));
          g.lineBetween(sx + (m.fx - sx) * k * 0.5, sy + (m.fy - sy) * k * 0.5, sx + (m.fx - sx) * Math.min(1, k * 1.6), sy + (m.fy - sy) * Math.min(1, k * 1.6));
        }
      }
    },

    drawAir(g, time) {
      for (let i = 0; i < hooks.length; i++) {
        const l = lamps.find((o) => o.hook === i) ?? null;
        const live = l && l.litAt !== Infinity && burning(l, time);
        const k = l && live ? (sputtering(l, time) ? clamp((l.gutterAt - time) / (l.gutterAt - l.sputterAt), 0, 1) : 1) : 0;
        drawCrook(g, hooks[i].x, hooks[i].y, live ? k : -1, l ? time - l.struckAt : 1e9, time);
      }
    },

    drawHud(g) {
      // Two tally candles: what each of you owes the dark. Yours on the left.
      const y = top + 26;
      const pairs: [Fighter, number, number][] = [[player, W / 2 - 40, 0x8ab8ff], [npc, W / 2 + 40, 0xffa040]];
      for (const [f, x, rim] of pairs) {
        const k = clamp(owed(f) / 50, 0, 1);
        g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 12, y - 26, 24, 34, 4);
        g.fillStyle(FUNGUS_DARK, 1); g.fillRect(x - 5, y - 20, 10, 24);
        g.fillStyle(BLACKFLAME, 1); g.fillRect(x - 5, y + 4 - 24 * k, 10, 24 * k);
        for (let i = 1; i < 5; i++) { g.lineStyle(1, FUNGUS, 0.7); g.lineBetween(x - 5, y + 4 - i * 4.8, x - 2, y + 4 - i * 4.8); }
        g.lineStyle(1.5, rim, 1); g.strokeRect(x - 5, y - 20, 10, 24);
        if (k > 0.7) { g.fillStyle(BLACKFLAME_LIT, 1); g.fillTriangle(x - 3, y - 21, x + 3, y - 21, x, y - 26); }
      }
    },

    destroy() { for (const l of lamps) { l.target?.remove(); l.target = null; } },
  };
}

/** The pool of lent dark: a bruise on the moss, its motes drifting inward; the rim ticks in as it sputters. */
function drawPool(g: G, x: number, y: number, time: number, k: number, age: number): void {
  const grow = clamp(age / 500, 0, 1);
  const r = POOL_R * grow;
  for (let i = 4; i >= 1; i--) { g.fillStyle(BLACKFLAME, 0.1 * k + 0.04); g.fillEllipse(x, y, r * 2 * (i / 4 + 0.1), r * 1.3 * (i / 4 + 0.1)); }
  g.fillStyle(MOULD_DARK, 0.25 * k); g.fillEllipse(x, y, r * 2, r * 1.3);
  const sput = k < 1;
  if (sput) {
    // The rim breaks into ticks that close as the debt comes due.
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + time / 900;
      const rr = r * (0.6 + 0.4 * k);
      g.lineStyle(3, BLACKFLAME_LIT, 0.9);
      g.lineBetween(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.65, x + Math.cos(a + 0.12) * rr, y + Math.sin(a + 0.12) * rr * 0.65);
    }
  }
  g.lineStyle(2, sput ? BLACKFLAME_LIT : BLACKFLAME_EDGE, sput ? 0.9 : 0.55);
  g.strokeEllipse(x, y, r * 2, r * 1.3);
  for (let i = 0; i < 14; i++) {
    const ph = ((time / 2600 + i / 14) % 1);
    const a = i * 2.4;
    const rr = r * (1 - ph);
    g.fillStyle(BLACKFLAME_LIT, 0.5 * ph);
    g.fillCircle(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.65, 1.6);
  }
}

/** A crook-post: iron upright, the crook, and — when hung — the caged black candle burning dark. */
function drawCrook(g: G, x: number, y: number, k: number, sinceStruck: number, time: number): void {
  shadow(g, x, y + 2, 34, 9, 0.4);
  g.fillStyle(IRON, 1); g.fillRect(x - 3, y - 104, 6, 104);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 1, y - 104, 2, 100);
  g.lineStyle(4, IRON, 1);
  g.beginPath(); g.arc(x + 12, y - 104, 12, Math.PI, Math.PI * 1.9, false); g.strokePath();
  g.fillStyle(IRON, 1); g.fillRect(x - 8, y - 4, 16, 4);
  if (k < 0) {
    // An empty hook; the drip of old wax below it.
    g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(x + 23, y - 104, x + 23, y - 96);
    g.fillStyle(BLACKFLAME, 0.8); g.fillEllipse(x + 23, y - 2, 10, 4);
    return;
  }
  const lx = x + 23, ly = y - 78;
  g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(lx, y - 104, lx, ly - 18);
  // The cage.
  g.fillStyle(IRON, 1); g.fillTriangle(lx - 11, ly - 14, lx + 11, ly - 14, lx, ly - 22);
  g.fillStyle(BLACKFLAME, 0.4); g.fillRect(lx - 9, ly - 14, 18, 22);
  // The black candle: lampblack wax, drips down its side.
  g.fillStyle(0x0c0810, 1); g.fillRect(lx - 4, ly - 4, 8, 12);
  g.fillStyle(dim(BLACKFLAME_EDGE, 0.5), 1); g.fillRect(lx - 4, ly - 4, 2, 9); g.fillRect(lx + 2, ly - 4, 2, 5);
  g.lineStyle(1.2, IRON, 1); for (const s of [-9, -3, 3, 9]) g.lineBetween(lx + s, ly - 14, lx + s, ly + 8);
  g.fillStyle(IRON, 1); g.fillRect(lx - 11, ly + 8, 22, 3);
  // The flame: tall when fresh; ragged and shrinking as it sputters.
  const flick = k < 1 ? 0.5 + Math.abs(Math.sin(time / 45)) * 0.5 : 1 + Math.sin(time / 80) * 0.08;
  const h = (6 + 10 * k) * flick;
  g.fillStyle(BLACKFLAME_EDGE, 0.9); g.fillTriangle(lx - 4, ly - 4, lx + 4, ly - 4, lx + Math.sin(time / 70) * 2, ly - 4 - h);
  g.fillStyle(BLACKFLAME, 1); g.fillTriangle(lx - 2, ly - 4, lx + 2, ly - 4, lx, ly - 4 - h * 0.7);
  glow(g, lx, ly - 6, 26 * (0.4 + k * 0.6), BLACKFLAME_LIT, 0.05, 3);
  if (k < 1) for (let i = 0; i < 3; i++) {
    const p = ((time / 700 + i / 3) % 1);
    g.fillStyle(lit(BLACKFLAME_EDGE, 0.2), 0.6 * (1 - p)); g.fillCircle(lx + Math.sin(i * 3 + time / 200) * 5, ly - 14 - p * 30, 2 + p * 4);
  }
  if (sinceStruck < 300) { g.lineStyle(2, BLACKFLAME_LIT, 1 - sinceStruck / 300); g.strokeCircle(lx, ly - 4, 20); }
}

export const FALLEN_BORROWED_DARK: GimmickDef = {
  id: ID,
  rules: 'In the black lamp\'s pool, blows taken are lent back as mending. When it gutters, all inside pay it back and more. Strike the lamp to gutter it.',
  make,
};
