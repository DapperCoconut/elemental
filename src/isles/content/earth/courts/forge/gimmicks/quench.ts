import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Rect } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { poly, regentSeal, rivets } from '../art';
import {
  BRICK, BRICK_DARK, HEAT_ORANGE, HEAT_WHITE, HEAT_YELLOW, IRON, IRON_DARK, IRON_LIT, QUENCH, QUENCH_LIT, STEAM,
  STONE, STONE_DARK,
} from '../palette';
import { alive, clamp, dist, heatColor, stepDt } from '../util';

/**
 * Quench — Temperer Hild.
 *
 * A forge at the top of the yard throws out a hot ingot every few seconds; it lands glowing on
 * the floor and slowly cools. Walk over one to pick it up in your tongs. While you carry it,
 * every blow you land sears the foe as well — but it burns your hands the whole time, and you
 * can only bear it so long.
 *
 * Two quench troughs stand at the bottom of the yard. Carry an ingot into one and it goes off in
 * a great blast of steam round the trough, scalding and stunning whoever else is near it. Hild
 * plays it both ways: she grabs an ingot and comes for you, or waits for you to wander near a
 * trough and dunks. So does anyone with a pair of tongs.
 */

const FORGE: Pt = { x: 480, y: 128 };
const TROUGHS: Rect[] = [{ x: 150, y: 548, w: 150, h: 44 }, { x: 660, y: 548, w: 150, h: 44 }];
const MAX_LYING = 3;
const THROW_EVERY = 3600;
const COOL_PER_S = 1 / 16;
const PICK_R = 28;
const CARRY_MAX_MS = 7000;
const BURN_TICK = 650;
const BURN_DMG = 2;
const SEAR_DMG = 5;
const STEAM_R = 170;
const STEAM_DMG = 16;
const STEAM_STUN = 700;

interface Ingot { x: number; y: number; heat: number; flight?: { fx: number; fy: number; tx: number; ty: number; t0: number; ms: number } }
interface Grip { ingot: Ingot | null; since: number; burnAt: number }
interface Blast { x: number; y: number; at: number }

const tc = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

function make(ctx: GimmickCtx): EncounterGimmick {
  const { tk, player, npc, rng, W, top } = ctx;
  const lying: Ingot[] = [];
  const grips = new Map<Fighter, Grip>([[player, { ingot: null, since: 0, burnAt: 0 }], [npc, { ingot: null, since: 0, burnAt: 0 }]]);
  const blasts: Blast[] = [];
  let nextThrow = 0;
  let started = false;
  /** Set while this rule is dealing damage, so its own hits never count as a searing blow. */
  let own = false;
  let lastThrowAt = -9999;

  const other = (f: Fighter) => (f === player ? npc : player);
  const hurt = (f: Fighter, n: number, x = f.x, y = f.y) => {
    own = true;
    if (f === player) tk.hitPlayer(n, x, y); else ctx.hit(f, n, x, y);
    own = false;
  };

  function throwIngot(time: number): void {
    // Thrown out of the forge mouth in an arc to an open spot, away from the troughs.
    let tx = 0, ty = 0;
    for (let i = 0; i < 8; i++) {
      tx = 90 + rng() * (W - 180); ty = top + 120 + rng() * 300;
      if (TROUGHS.every((r) => dist(tx, ty, tc(r).x, tc(r).y) > 140)) break;
    }
    lying.push({ x: FORGE.x, y: FORGE.y + 30, heat: 1, flight: { fx: FORGE.x, fy: FORGE.y + 30, tx, ty, t0: time, ms: 700 } });
    lastThrowAt = time;
    ctx.sfx('hammer-forge');
  }

  function dunk(f: Fighter, r: Rect, time: number): void {
    const g = grips.get(f);
    if (!g || !g.ingot) return;
    g.ingot = null;
    const c = tc(r);
    blasts.push({ x: c.x, y: c.y, at: time });
    ctx.sfx('geyser');
    ctx.banner('STEAM!', '#d8e2e8');
    const o = other(f);
    if (alive(o) && dist(o.x, o.y, c.x, c.y) < STEAM_R) {
      hurt(o, STEAM_DMG);
      ctx.stun(o, STEAM_STUN);
      const a = Math.atan2(o.y - c.y, o.x - c.x);
      ctx.nudge(o, Math.cos(a) * 70, Math.sin(a) * 70 - 20);
      ctx.float(o.x, o.y - 46, 'SCALDED', '#d8e2e8');
    }
    ctx.heal(f, 6);
    ctx.float(f.x, f.y - 46, 'QUENCHED', '#9ad0ff');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextThrow = time + 600; }
      if (time >= nextThrow) {
        nextThrow = time + (ctx.hard ? THROW_EVERY * 0.8 : THROW_EVERY);
        if (lying.length < MAX_LYING) throwIngot(time);
      }
      // Ingots in flight land; lying ingots cool and, once cold, crumble to scale.
      for (let i = lying.length - 1; i >= 0; i--) {
        const n = lying[i];
        if (n.flight) {
          const k = (time - n.flight.t0) / n.flight.ms;
          if (k >= 1) { n.x = n.flight.tx; n.y = n.flight.ty; n.flight = undefined; ctx.sfx('clang'); }
          else { n.x = n.flight.fx + (n.flight.tx - n.flight.fx) * k; n.y = n.flight.fy + (n.flight.ty - n.flight.fy) * k; }
          continue;
        }
        n.heat -= COOL_PER_S * dt;
        if (n.heat < 0.12) lying.splice(i, 1);
      }
      for (const [f, g] of grips) {
        if (!alive(f)) { g.ingot = null; continue; }
        if (!g.ingot) {
          // Pick up a hot ingot by walking over it.
          const n = lying.find((l) => !l.flight && dist(l.x, l.y, f.x, f.y) < PICK_R);
          if (n) {
            lying.splice(lying.indexOf(n), 1);
            g.ingot = n; g.since = time; g.burnAt = time;
            ctx.float(f.x, f.y - 50, 'HOT INGOT', '#ffc23a');
            ctx.sfx('sizzle');
          }
          continue;
        }
        // It burns your hands; past bearing, you drop it where you stand.
        g.ingot.heat = Math.max(0.3, g.ingot.heat - COOL_PER_S * 0.5 * dt);
        if (time - g.burnAt > BURN_TICK) { g.burnAt = time; hurt(f, BURN_DMG); }
        const r = TROUGHS.find((t) => f.x > t.x - 14 && f.x < t.x + t.w + 14 && f.y > t.y - 24 && f.y < t.y + t.h + 14);
        if (r) { dunk(f, r, time); continue; }
        if (time - g.since > CARRY_MAX_MS) {
          const n = g.ingot;
          g.ingot = null;
          n.x = f.x; n.y = f.y + 12;
          lying.push(n);
          ctx.float(f.x, f.y - 46, 'TOO HOT', '#f06a1a');
        }
      }
      for (let i = blasts.length - 1; i >= 0; i--) if (time - blasts[i].at > 1400) blasts.splice(i, 1);
    },

    onNpcHurt(amount) {
      if (own || amount < 2) return;
      if (grips.get(player)?.ingot && alive(npc)) { hurt(npc, SEAR_DMG); ctx.float(npc.x, npc.y - 40, 'SEARED', '#ffc23a'); }
    },
    onPlayerHurt(amount) {
      if (own || amount < 2) return;
      if (grips.get(npc)?.ingot && alive(player)) { hurt(player, SEAR_DMG); ctx.float(player.x, player.y - 40, 'SEARED', '#ffc23a'); }
    },

    npcSeek() {
      const g = grips.get(npc);
      if (g?.ingot) {
        // Holding: dunk if the player is by a trough, else go and land searing blows.
        for (const r of TROUGHS) {
          const c = tc(r);
          if (dist(player.x, player.y, c.x, c.y) < STEAM_R - 20) return { x: c.x, y: c.y - 6 };
        }
        return { x: player.x + (npc.x < player.x ? -90 : 90), y: player.y };
      }
      // Not holding: the hottest ingot within reach, unless the player is holding and near a trough —
      // then get away from it.
      const pg = grips.get(player);
      if (pg?.ingot) {
        for (const r of TROUGHS) {
          const c = tc(r);
          if (dist(npc.x, npc.y, c.x, c.y) < STEAM_R + 30) return { x: clamp(npc.x + (npc.x - c.x) * 1.5, 60, W - 60), y: clamp(npc.y - 160, top + 60, 500) };
        }
      }
      let best: Ingot | null = null;
      let bs = -Infinity;
      for (const n of lying) {
        if (n.flight) continue;
        const s = n.heat * 300 - dist(n.x, n.y, npc.x, npc.y) * 0.6 + dist(n.x, n.y, player.x, player.y) * 0.25;
        if (s > bs) { bs = s; best = n; }
      }
      return best ? { x: best.x, y: best.y } : { x: player.x + 160, y: player.y };
    },

    drawGround(g, time) {
      // The quench troughs: stone-sided, full of dark water, a steam line rising.
      for (const r of TROUGHS) {
        const c = tc(r);
        g.lineStyle(2, STEAM, 0.12); g.strokeCircle(c.x, c.y, STEAM_R);
        g.fillStyle(STONE_DARK, 1); g.fillRoundedRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16, 6);
        g.fillStyle(STONE, 1); g.fillRoundedRect(r.x - 6, r.y - 10, r.w + 12, 8, 3);
        g.fillStyle(QUENCH, 1); g.fillRect(r.x, r.y, r.w, r.h);
        g.fillStyle(QUENCH_LIT, 0.25); g.fillEllipse(c.x - 20, c.y - 6, r.w * 0.5, 8);
        for (let i = 0; i < 3; i++) {
          const ph = (time / 1400 + i / 3) % 1;
          g.lineStyle(1, QUENCH_LIT, 0.5 * (1 - ph)); g.strokeEllipse(r.x + 30 + i * 44, c.y, 6 + ph * 30, 2 + ph * 8);
        }
        rivets(g, r.x - 4, r.y + r.h + 6, r.x + r.w + 4, r.y + r.h + 6, 6, 1.3);
      }
      // The ingots lying on the floor: a scorch under each.
      for (const n of lying) {
        if (n.flight) continue;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(n.x, n.y + 4, 40, 12);
        glow(g, n.x, n.y, 26, HEAT_ORANGE, 0.03 * n.heat, 3);
      }
      // The tongs' reach: a faint ring round anyone carrying, lit when they are by a trough.
      for (const [f, gr] of grips) {
        if (!gr.ingot || !alive(f)) continue;
        const near = TROUGHS.some((r) => dist(f.x, f.y, tc(r).x, tc(r).y) < 160);
        g.lineStyle(2, near ? STEAM : HEAT_ORANGE, near ? 0.5 : 0.25); g.strokeCircle(f.x, f.y, 30);
      }
    },

    drawAir(g, time) {
      // The forge at the top of the yard, its mouth flaring as it throws.
      const flare = clamp(1 - (time - lastThrowAt) / 500, 0, 1);
      g.fillStyle(BRICK_DARK, 1); g.fillRect(FORGE.x - 70, FORGE.y - 30, 140, 56);
      for (let y = FORGE.y - 28; y < FORGE.y + 24; y += 8) {
        for (let x = FORGE.x - 68 + (((y / 8) | 0) % 2) * 7; x < FORGE.x + 64; x += 14) { g.fillStyle(((x + y) | 0) % 3 ? BRICK : dim(BRICK, 0.2), 1); g.fillRect(x, y, 12, 6); }
      }
      g.fillStyle(0x140806, 1); g.fillRoundedRect(FORGE.x - 30, FORGE.y - 8, 60, 30, 10);
      g.fillStyle(heatColor(0.7 + flare * 0.3), 1); g.fillRoundedRect(FORGE.x - 24, FORGE.y - 2, 48, 22, 8);
      glow(g, FORGE.x, FORGE.y + 10, 50 + flare * 30, HEAT_ORANGE, 0.04 + flare * 0.05, 3);
      g.fillStyle(IRON_DARK, 1); g.fillRect(FORGE.x - 76, FORGE.y - 36, 152, 8);
      regentSeal(g, FORGE.x, FORGE.y - 22, 6, IRON);
      // Ingots in the air and on the floor.
      for (const n of lying) {
        let x = n.x, y = n.y;
        if (n.flight) {
          const k = clamp((time - n.flight.t0) / n.flight.ms, 0, 1);
          y -= Math.sin(k * Math.PI) * 90;
          g.fillStyle(0x000000, 0.25); g.fillEllipse(n.x, n.y + 6, 24, 7);
        }
        drawIngot(g, x, y, n.heat, time);
      }
      // Carried ingots, held up in tongs.
      for (const [f, gr] of grips) {
        if (!gr.ingot || !alive(f)) continue;
        const hx = f.x + 18, hy = f.y - 34;
        g.lineStyle(2.5, IRON_DARK, 1); g.lineBetween(f.x + 6, f.y - 8, hx - 4, hy + 4); g.lineBetween(f.x + 10, f.y - 6, hx + 4, hy + 4);
        drawIngot(g, hx, hy, gr.ingot.heat, time);
        // Heat haze, and the carry clock.
        for (let i = 0; i < 3; i++) {
          const ph = (time / 500 + i / 3) % 1;
          g.lineStyle(1.2, HEAT_YELLOW, 0.4 * (1 - ph)); g.lineBetween(hx - 6 + i * 6, hy - 6 - ph * 18, hx - 4 + i * 6, hy - 12 - ph * 18);
        }
        const k = clamp((time - gr.since) / CARRY_MAX_MS, 0, 1);
        g.lineStyle(2, k > 0.7 ? HEAT_ORANGE : HEAT_YELLOW, 0.8);
        g.beginPath(); g.arc(hx, hy, 14, -Math.PI / 2, -Math.PI / 2 + (1 - k) * Math.PI * 2, false); g.strokePath();
      }
      // Steam blasts.
      for (const b of blasts) {
        const k = (time - b.at) / 1400;
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + i;
          const d = 20 + Math.pow(k, 0.6) * STEAM_R * (0.6 + ((i * 7) % 5) / 10);
          g.fillStyle(i % 2 ? STEAM : lit(STEAM, 0.4), 0.42 * (1 - k));
          g.fillCircle(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d * 0.7 - k * 40, 18 + k * 30);
        }
        g.lineStyle(4 * (1 - k), 0xffffff, 0.6 * (1 - k)); g.strokeCircle(b.x, b.y, STEAM_R * Math.min(1, k * 2.2));
      }
    },
  };
}

/** A Tithe ingot at a heat: a trapezoid bar, glowing from its heart, stamped with the seal. */
function drawIngot(g: Phaser.GameObjects.Graphics, x: number, y: number, heat: number, time: number): void {
  const c = heat > 0.2 ? heatColor(heat * 0.95 + Math.sin(time / 140) * 0.02) : IRON;
  poly(g, [{ x: x - 14, y: y + 5 }, { x: x + 14, y: y + 5 }, { x: x + 10, y: y - 5 }, { x: x - 10, y: y - 5 }], dim(c, 0.25));
  poly(g, [{ x: x - 12, y: y + 3 }, { x: x + 12, y: y + 3 }, { x: x + 9, y: y - 5 }, { x: x - 9, y: y - 5 }], c);
  g.fillStyle(heat > 0.6 ? HEAT_WHITE : lit(c, 0.3), 0.8); g.fillRect(x - 8, y - 4, 16, 2);
  regentSeal(g, x, y - 0.5, 2.6, dim(c, 0.35));
  if (heat < 0.35) { g.fillStyle(IRON_LIT, 0.3); g.fillRect(x - 9, y - 5, 18, 1); }
}

export const QUENCH_FIGHT: GimmickDef = {
  id: 'forge-quench-fight',
  rules: 'Hot ingots fly out of the forge — walk over one to carry it. Carried, your blows sear but it burns your hands. Dunk it in a trough for a steam blast that scalds whoever is near.',
  make,
};
