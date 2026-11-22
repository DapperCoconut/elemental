import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { isotopeRod, trefoil } from '../art';
import { AMBER, GLOW, GLOW_DIM, GLOW_LIT, HAZARD_BLACK, LEAD_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Half-Life — Decayer Curie.
 *
 * Fresh isotope rods drop from the Rod Store's crane on to the yard. Each rod throws a burning
 * aura round it, and every few seconds — its half-life — the aura halves in reach, until it is too
 * small to matter and the rod gutters out. A shadow and a ring on the floor show where each falls
 * and how far it will burn.
 *
 * Walk on to a rod's core and you pick it up: its aura is cradled in your arms (it burns *you*
 * instead, a little, all the while), and the next thing you cast hurls it the way you face. It
 * flies until it meets the other fighter (or runs out of throw), bursts, and lies burning there. A fresh rod is a long reach of
 * fire; a rod three half-lives old is barely a candle. Curie picks rods up too — and she knows
 * which are fresh.
 */

const HALF_MS = 4200;
const MIN_REACH = 24;
const FALL_MS = 1200;
const TICK_MS = 500;
const BURN = 3;
const HELD_BURN = 2;
const THROW_MS = 460;
const THROW_RANGE = 250;
/** How near the flight line the other fighter must be for the rod to land on them. */
const THROW_CATCH = 44;
/** A cast this soon after the pick-up does not throw (the hands are still closing on it). */
const GRIP_MS = 300;
const MAX_RODS = 4;

interface Rod {
  x: number; y: number;
  reach: number;
  /** Half-lives passed (for the drawing). */
  halves: number;
  nextHalf: number;
  /** Falling from the crane until this time. */
  landAt: number;
  holder: Fighter | null;
  heldAt: number;
  /** In flight after a throw. */
  flight: { fx: number; fy: number; tx: number; ty: number; at: number; target: Fighter } | null;
  angle: number;
  halvedAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const REACH0 = ctx.hard ? 165 : 150;
  const dropEvery = ctx.hard ? 4300 : 5600;
  const rods: Rod[] = [];
  const nextTick = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const noPickUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let nextDrop = 0;
  let started = false;
  const bursts: { x: number; y: number; at: number; r: number }[] = [];

  const now = () => ctx.scene.time.now;
  const other = (f: Fighter) => (f === player ? npc : player);
  const hurt = (f: Fighter, n: number) => {
    if (f === player) tk.hitPlayer(n, f.x, f.y); else ctx.hit(f, n, f.x, f.y);
  };

  function dropRod(time: number): void {
    // Mostly somewhere between the fighters or near you; sometimes anywhere.
    let x: number, y: number;
    if (rng() < 0.6 && alive(player)) {
      const a = rng() * Math.PI * 2, d = 80 + rng() * 140;
      x = player.x + Math.cos(a) * d; y = player.y + Math.sin(a) * d;
    } else {
      x = 90 + rng() * (W - 180); y = top + 70 + rng() * (H - top - 130);
    }
    x = clamp(x, 70, W - 70); y = clamp(y, top + 60, H - 50);
    rods.push({ x, y, reach: REACH0, halves: 0, nextHalf: time + FALL_MS + HALF_MS, landAt: time + FALL_MS, holder: null, heldAt: 0, flight: null, angle: rng() * Math.PI, halvedAt: 0 });
    tk.sfx('beam-charge');
  }

  function land(r: Rod, time: number): void {
    tk.sfx('stone-slam');
    bursts.push({ x: r.x, y: r.y, at: time, r: 46 });
    for (const f of [player, npc]) if (alive(f) && dist(f.x, f.y, r.x, r.y) < 46) hurt(f, 8);
  }

  function throwRod(holder: Fighter): void {
    const time = now();
    const r = rods.find((k) => k.holder === holder);
    if (!r || time - r.heldAt < GRIP_MS) return;
    const t = other(holder);
    // Along the way you face: it lands on the other fighter if they stand in its path.
    const a = ctx.facing(holder);
    const ux = Math.cos(a), uy = Math.sin(a);
    let reach = THROW_RANGE;
    if (alive(t)) {
      const along = (t.x - holder.x) * ux + (t.y - holder.y) * uy;
      const off = Math.abs((t.x - holder.x) * uy - (t.y - holder.y) * ux);
      if (along > 0 && along < THROW_RANGE + THROW_CATCH && off < THROW_CATCH) reach = Math.min(along, THROW_RANGE);
    }
    const tx = clamp(holder.x + ux * reach, 50, W - 50), ty = clamp(holder.y + uy * reach, top + 40, H - 40);
    r.holder = null;
    r.flight = { fx: holder.x, fy: holder.y - 20, tx, ty, at: time, target: t };
    noPickUntil.set(holder, time + 1200);
    ctx.float(holder.x, holder.y - 50, 'HURLED!', '#d8ffb0');
    tk.sfx('whoosh');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextDrop = time + 900; }
      if (time >= nextDrop) {
        nextDrop = time + dropEvery;
        if (rods.length < MAX_RODS) dropRod(time);
      }
      for (let i = rods.length - 1; i >= 0; i--) {
        const r = rods[i];
        if (r.landAt > 0 && time >= r.landAt) { r.landAt = 0; land(r, time); }
        if (r.flight) {
          const k = (time - r.flight.at) / THROW_MS;
          if (k >= 1) {
            const t = r.flight.target;
            r.x = clamp(r.flight.tx, 50, W - 50); r.y = clamp(r.flight.ty, top + 40, H - 40);
            r.flight = null;
            bursts.push({ x: r.x, y: r.y, at: time, r: 60 });
            tk.sfx('explosion-small');
            if (alive(t) && dist(t.x, t.y, r.x, r.y) < 60) { hurt(t, 10); ctx.float(t.x, t.y - 46, 'DOSED', '#7dff5a'); }
          }
        }
        if (time >= r.nextHalf && r.landAt === 0) {
          r.nextHalf = time + HALF_MS;
          r.reach /= 2;
          r.halves++;
          r.halvedAt = time;
          if (r.reach < MIN_REACH) {
            if (r.holder) noPickUntil.set(r.holder, time + 600);
            bursts.push({ x: r.holder ? r.holder.x : r.x, y: r.holder ? r.holder.y : r.y, at: time, r: 20 });
            rods.splice(i, 1);
            tk.sfx('sizzle');
            continue;
          }
          ctx.float(r.holder ? r.holder.x : r.x, (r.holder ? r.holder.y : r.y) - 30, 'HALF-LIFE', '#7dff5a');
        }
        if (r.holder) {
          if (!alive(r.holder)) { r.x = r.holder.x; r.y = r.holder.y; r.holder = null; }
          else { r.x = r.holder.x; r.y = r.holder.y; }
          // Too hot to hold for long: dropped at your feet.
          if (r.holder && time - r.heldAt > 6500) { noPickUntil.set(r.holder, time + 1500); r.holder = null; ctx.float(r.x, r.y - 40, 'TOO HOT', '#ffb02a'); }
        }
      }
      // Pick-ups.
      for (const f of [player, npc]) {
        if (!alive(f) || time < (noPickUntil.get(f) ?? 0) || rods.some((r) => r.holder === f)) continue;
        const r = rods.find((k) => !k.holder && !k.flight && k.landAt === 0 && dist(k.x, k.y, f.x, f.y) < 28);
        if (r) { r.holder = f; r.heldAt = time; ctx.float(f.x, f.y - 46, 'ROD IN HAND', '#d8ffb0'); tk.sfx('crystal-chime'); }
      }
      // Burns.
      for (const f of [player, npc]) {
        if (!alive(f) || time < (nextTick.get(f) ?? 0)) continue;
        let n = 0;
        let inside = 0;
        for (const r of rods) {
          if (r.landAt > 0 || r.flight) continue;
          if (r.holder === f) n += HELD_BURN;
          else if (!r.holder && dist(r.x, r.y, f.x, f.y) < r.reach && inside < 2) { n += BURN; inside++; }
        }
        if (n > 0) { nextTick.set(f, time + TICK_MS); hurt(f, n); }
      }
      for (let i = bursts.length - 1; i >= 0; i--) if (time - bursts[i].at > 600) bursts.splice(i, 1);
    },

    onPlayerCast() { throwRod(player); },
    onNpcCast() { throwRod(npc); },

    npcSeek() {
      const held = rods.find((r) => r.holder === npc);
      if (held) {
        // A rod in hand: get within a throw of you — standing still, she faces you, and her next cast hurls it.
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(player.x + Math.cos(a) * 160, 60, W - 60), y: clamp(player.y + Math.sin(a) * 160, top + 50, H - 40) };
      }
      // A fresh rod nearer to her than to you: take it.
      const t = now();
      if (t >= (noPickUntil.get(npc) ?? 0)) {
        let best: Rod | null = null;
        let bs = 0;
        for (const r of rods) {
          if (r.holder || r.flight || r.landAt > 0) continue;
          const dn = dist(r.x, r.y, npc.x, npc.y), dp = dist(r.x, r.y, player.x, player.y);
          if (dn > dp || dn > 420) continue;
          const s = r.reach / (60 + dn);
          if (s > bs) { bs = s; best = r; }
        }
        if (best && best.reach > MIN_REACH * 2) return { x: best.x, y: best.y };
      }
      // Otherwise stand off you, out of every aura.
      let pick: Pt | null = null;
      let ps = -Infinity;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const x = clamp(player.x + Math.cos(a) * 230, 60, W - 60), y = clamp(player.y + Math.sin(a) * 200, top + 50, H - 40);
        let margin = 999;
        for (const r of rods) if (!r.holder && !r.flight) margin = Math.min(margin, dist(r.x, r.y, x, y) - r.reach);
        const s = Math.min(margin, 120) - dist(x, y, npc.x, npc.y) * 0.2;
        if (s > ps) { ps = s; pick = { x, y }; }
      }
      return pick;
    },

    drawGround(g, time) {
      for (const r of rods) {
        if (r.flight) continue;
        if (r.landAt > 0) {
          // The crane's shadow and the ring it will burn.
          const k = clamp(1 - (r.landAt - time) / FALL_MS, 0, 1);
          g.fillStyle(0x000000, 0.2 + k * 0.3); g.fillEllipse(r.x, r.y, 20 + k * 30, 8 + k * 12);
          g.lineStyle(2, GLOW, 0.2 + k * 0.4);
          for (let s = 0; s < 24; s += 2) { g.beginPath(); g.arc(r.x, r.y, r.reach, (s / 24) * Math.PI * 2, ((s + 1) / 24) * Math.PI * 2, false); g.strokePath(); }
          continue;
        }
        if (r.holder) continue;
        // The aura: a burning disc, its edge bright, and the next half dashed inside it.
        const fl = 0.85 + Math.sin(time / 90 + r.x) * 0.15;
        g.fillStyle(GLOW_DIM, 0.14 * fl); g.fillCircle(r.x, r.y, r.reach);
        g.fillStyle(GLOW, 0.08 * fl); g.fillCircle(r.x, r.y, r.reach * 0.7);
        g.lineStyle(2.5, GLOW, 0.65); g.strokeCircle(r.x, r.y, r.reach);
        if (r.reach / 2 >= MIN_REACH) {
          g.lineStyle(1.5, GLOW_LIT, 0.35);
          for (let s = 0; s < 16; s += 2) { g.beginPath(); g.arc(r.x, r.y, r.reach / 2, (s / 16) * Math.PI * 2 + time / 2000, ((s + 1) / 16) * Math.PI * 2 + time / 2000, false); g.strokePath(); }
        }
        // The half-life clock: an amber arc running down round the rim.
        const left = clamp((r.nextHalf - time) / HALF_MS, 0, 1);
        g.lineStyle(4, AMBER, 0.8);
        g.beginPath(); g.arc(r.x, r.y, r.reach + 6, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
        if (time - r.halvedAt < 500) {
          const k = (time - r.halvedAt) / 500;
          g.lineStyle(3 * (1 - k), GLOW_LIT, 1 - k); g.strokeCircle(r.x, r.y, r.reach * (2 - k));
        }
        trefoil(g, r.x, r.y + 18, 7, HAZARD_BLACK, AMBER, 0.6);
      }
      for (const b of bursts) {
        const k = (time - b.at) / 600;
        g.fillStyle(GLOW, 0.3 * (1 - k)); g.fillCircle(b.x, b.y, b.r * (0.6 + k * 0.6));
      }
    },

    drawAir(g, time) {
      for (const r of rods) {
        if (r.landAt > 0) {
          const k = clamp(1 - (r.landAt - time) / FALL_MS, 0, 1);
          const y = r.y - (1 - k) * 360;
          // Crane chain from the top.
          g.lineStyle(2, LEAD_DARK, 0.8); g.lineBetween(r.x, top, r.x, y - 20);
          isotopeRod(g, r.x, y, 40, Math.PI / 2, 1);
          continue;
        }
        const bright = clamp(r.reach / REACH0, 0.2, 1);
        if (r.flight) {
          const k = clamp((time - r.flight.at) / THROW_MS, 0, 1);
          const x = r.flight.fx + (r.flight.tx - r.flight.fx) * k, y = r.flight.fy + (r.flight.ty - r.flight.fy) * k - Math.sin(k * Math.PI) * 90;
          g.fillStyle(0x000000, 0.25); g.fillEllipse(r.flight.fx + (r.flight.tx - r.flight.fx) * k, r.flight.fy + 20 + (r.flight.ty - r.flight.fy) * k, 24, 8);
          isotopeRod(g, x, y, 34, time / 70, bright);
          continue;
        }
        if (r.holder) {
          const f = r.holder;
          isotopeRod(g, f.x + 14, f.y - 18, 32, -1.1, bright);
          // Burning the holder: green licks up the arms.
          const ph = (time / 200) % 1;
          g.fillStyle(GLOW, 0.5 * (1 - ph)); g.fillCircle(f.x + 10 - ph * 8, f.y - 22 - ph * 16, 3 * (1 - ph) + 1);
          glow(g, f.x, f.y - 10, 30, GLOW, 0.04, 2);
          // How long until it is too hot to hold.
          const left = clamp(1 - (time - r.heldAt) / 6500, 0, 1);
          g.fillStyle(0x000000, 0.5); g.fillRect(f.x - 20, f.y - 58, 40, 5);
          g.fillStyle(left < 0.3 ? AMBER : GLOW, 1); g.fillRect(f.x - 20, f.y - 58, 40 * left, 5);
          continue;
        }
        isotopeRod(g, r.x, r.y - 6, 36, r.angle, bright);
      }
    },
  };
}

export const HALF_LIFE: GimmickDef = {
  id: 'halflife-half-life',
  rules: 'Isotope rods fall and burn round them, halving in reach each half-life. Walk on one to lift it (it burns you); your next cast hurls it the way you face.',
  make,
};
