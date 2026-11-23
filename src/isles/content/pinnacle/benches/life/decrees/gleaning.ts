import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { GREEN, OBS } from '../art';
import { WHO, type Who, alive, clamp, dist, fighterOf, inField, other, stepDt } from './util';

/**
 * Decree of Gleaning — Councilor Bartholomew Gall, Seat of the Heartwood (gluttony / Wood).
 *
 * Gall drafted the Heartwood's clause against gleaning: the windfall belongs to the Crown, and
 * a family caught picking it up off the ground came up short at the Tithe. Here the clause runs
 * backwards. Every wound spills green sap onto the glass — a bead for every nine points, thrown
 * out behind the one who was hit — and whoever walks over a bead eats it, five health a bead.
 * But eat six inside three seconds and you are GORGED: slowed hard and too full to eat any more.
 *
 * Wood perfected is a glutton that turns everything into Sap and health, and this councilor
 * cannot leave a bead on the floor. Feed her six; then make her pay for the meal.
 */

const PER_BEAD = 9;
const BEAD_HEAL = 5;
const EAT_R = 28;
const GORGE_N = 6;
const GORGE_WINDOW = 3000;
const GORGE_MS = 2600;
const MAX_BEADS = 18;
const FLY_MS = 380;

interface Bead { x0: number; y0: number; x: number; y: number; born: number; until: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const life = ctx.hard ? 7000 : 8500;
  const beads: Bead[] = [];
  const owed: Record<Who, number> = { player: 0, npc: 0 };
  const meals: Record<Who, number[]> = { player: [], npc: [] };
  const gorgedUntil: Record<Who, number> = { player: 0, npc: 0 };
  const gulpAt: Record<Who, number> = { player: -9999, npc: -9999 };
  let healing = false;
  const now = () => ctx.scene.time.now;

  const spill = (w: Who, amount: number) => {
    if (healing || amount <= 0) return;
    owed[w] += amount;
    const f = fighterOf(ctx, w), o = fighterOf(ctx, other(w));
    let n = 0;
    while (owed[w] >= PER_BEAD && n < 3) {
      owed[w] -= PER_BEAD;
      n++;
      if (beads.length >= MAX_BEADS) beads.shift();
      // Thrown out of the wound away from the blow, fanning.
      const a = Math.atan2(f.y - o.y, f.x - o.x) + (ctx.rng() - 0.5) * 1.6;
      const d = 60 + ctx.rng() * 90;
      const p = inField(ctx, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 40);
      const t = now();
      beads.push({ x0: f.x, y0: f.y - 16, x: p.x, y: p.y, born: t, until: t + FLY_MS + life, seed: ctx.rng() * 10 });
    }
    if (owed[w] > PER_BEAD * 3) owed[w] = 0;
  };

  const eat = (w: Who, time: number) => {
    const f = fighterOf(ctx, w);
    meals[w] = meals[w].filter((t) => time - t < GORGE_WINDOW);
    meals[w].push(time);
    healing = true;
    ctx.heal(f, BEAD_HEAL);
    healing = false;
    gulpAt[w] = time;
    ctx.sfx('slime-splat');
    if (meals[w].length >= GORGE_N) {
      meals[w] = [];
      gorgedUntil[w] = time + GORGE_MS;
      ctx.float(f.x, f.y - 60, 'GORGED', '#c8ff9a');
      ctx.sfx('status-slow');
      if (w === 'npc') ctx.banner('THE COUNCILOR HAS GORGED', '#c8ff9a');
    }
  };

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      for (let i = beads.length - 1; i >= 0; i--) {
        const b = beads[i];
        if (time >= b.until) { beads.splice(i, 1); continue; }
        if (time - b.born < FLY_MS) continue;
        for (const w of WHO) {
          const f = fighterOf(ctx, w);
          if (!alive(f) || time < gorgedUntil[w]) continue;
          if (dist(f.x, f.y, b.x, b.y) <= EAT_R) { beads.splice(i, 1); eat(w, time); break; }
        }
      }
    },

    onPlayerHurt(a) { spill('player', a); },
    onNpcHurt(a) { spill('npc', a); },

    playerSpeedMult() { return now() < gorgedUntil.player ? 0.55 : 1; },
    npcSpeedMult() { return now() < gorgedUntil.npc ? 0.55 : 1; },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      if (now() < gorgedUntil.npc) return null;
      // A glutton: the nearest landed bead, always — especially one the player is reaching for.
      let best: Bead | null = null, bs = Infinity;
      for (const b of beads) {
        if (now() - b.born < FLY_MS * 0.5) continue;
        const d = dist(n.x, n.y, b.x, b.y);
        const contest = dist(ctx.player.x, ctx.player.y, b.x, b.y) < 120 ? -80 : 0;
        if (d < 340 && d + contest < bs) { bs = d + contest; best = b; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      for (const b of beads) {
        const k = clamp((time - b.born) / FLY_MS, 0, 1);
        if (k < 1) continue;
        // A splash of sap on the glass where it landed: a soft stain, darkening as it dries.
        const left = clamp((b.until - time) / 1500, 0, 1);
        g.fillStyle(GREEN.vineDark, 0.5 * left); g.fillEllipse(b.x + 3, b.y + 6, 30, 10);
        g.fillStyle(GREEN.vine, 0.25 * left);
        for (let i = 0; i < 4; i++) g.fillCircle(b.x + Math.cos(b.seed + i * 1.7) * 13, b.y + 4 + Math.sin(b.seed + i * 1.7) * 5, 2.5);
      }
    },

    drawAir(g, time) {
      for (const b of beads) {
        const k = clamp((time - b.born) / FLY_MS, 0, 1);
        const x = b.x0 + (b.x - b.x0) * k;
        const y = b.y0 + (b.y - b.y0) * k - Math.sin(k * Math.PI) * 46;
        const left = clamp((b.until - time) / 1500, 0, 1);
        const blink = left < 1 && Math.floor(time / 120) % 2 === 0 ? 0.4 : 1;
        const bob = k >= 1 ? Math.sin(time / 260 + b.seed) * 2 : 0;
        // A bead: a drop of green glass, lit from inside, a white glint.
        g.fillStyle(GREEN.glow, 0.12 * blink); g.fillCircle(x, y - 6 + bob, 15);
        g.fillStyle(GREEN.vineDark, blink); g.fillCircle(x, y - 5 + bob, 7);
        g.fillStyle(GREEN.leaf, blink); g.fillCircle(x - 0.5, y - 6 + bob, 5.8);
        g.fillTriangle(x - 4.5, y - 8 + bob, x + 4.5, y - 8 + bob, x, y - 17 + bob);
        g.fillStyle(GREEN.vineLit, 0.9 * blink); g.fillCircle(x - 2, y - 8 + bob, 2.2);
        g.fillStyle(0xffffff, 0.9 * blink); g.fillCircle(x - 2.6, y - 9 + bob, 0.9);
      }
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        const sinceGulp = time - gulpAt[w];
        if (sinceGulp < 300) {
          const k = sinceGulp / 300;
          g.lineStyle(2, GREEN.vineLit, 1 - k); g.strokeCircle(f.x, f.y - 6, 14 + k * 16);
        }
        if (time < gorgedUntil[w]) {
          // Gorged: a swollen green halo, drips of sap, and the body sinking at every step.
          const wob = Math.sin(time / 140) * 3;
          g.lineStyle(3, GREEN.vine, 0.7); g.strokeEllipse(f.x, f.y - 2, 64 + wob, 50 - wob);
          g.lineStyle(1, GREEN.vineLit, 0.6); g.strokeEllipse(f.x, f.y - 2, 70 + wob, 56 - wob);
          for (let i = 0; i < 3; i++) {
            const ph = ((time / 500) + i / 3) % 1;
            g.fillStyle(GREEN.leaf, 1 - ph); g.fillCircle(f.x - 16 + i * 16, f.y + 10 + ph * 18, 2.4);
          }
        } else {
          // How full: little pips over the head, one per bead in the last three seconds.
          const full = meals[w].filter((t) => time - t < GORGE_WINDOW).length;
          for (let i = 0; i < full; i++) {
            g.fillStyle(i >= GORGE_N - 2 ? 0xffffff : GREEN.vineLit, 0.95);
            g.fillCircle(f.x - ((GORGE_N - 1) * 7) / 2 + i * 7, f.y - 54, 2.6);
          }
        }
      }
    },

    drawHud(g, time) {
      // The plate: six slots each side — fill all six and you are gorged.
      for (const w of WHO) {
        const x0 = w === 'player' ? 24 : ctx.W - 24 - 6 * 18;
        const y = ctx.top + 18;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 8, y - 12, 6 * 18 + 16, 24, 10);
        g.lineStyle(1, OBS.edge, 0.4); g.strokeRoundedRect(x0 - 8, y - 12, 6 * 18 + 16, 24, 10);
        const gorged = time < gorgedUntil[w];
        const full = gorged ? GORGE_N : meals[w].filter((t) => time - t < GORGE_WINDOW).length;
        for (let i = 0; i < GORGE_N; i++) {
          const cx = x0 + 9 + i * 18;
          g.fillStyle(i < full ? (gorged ? 0xffffff : GREEN.leaf) : 0x1a2a1c, 1);
          g.fillCircle(cx, y, 6);
        }
      }
    },
  };
}

export const DECREE_GLEANING: GimmickDef = {
  id: 'bench-life-gleaning',
  rules: 'Every wound spills green sap behind the one hit. Walk over a bead to eat it (+5). Eat six in three seconds and you are GORGED — slowed, and too full to eat.',
  make,
};
