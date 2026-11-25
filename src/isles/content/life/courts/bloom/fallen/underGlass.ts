import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { cloche } from '../art';
import { GLASS, GLASS_EDGE, GLASS_LIT, SOIL_DARK, TERRA, TERRA_DARK } from '../palette';
import { alive, clamp, dist } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Brought On Under Glass — Forcer Amaryllis Pym, who in the King's telling kept the forcing lawn
 * and put the answerers-back under its cloches herself, "to bring them on".
 *
 * Bell cloches the height of a man come down out of the sky. Each one's shadow is marked on the
 * lawn a beat before it lands; whoever is under it when it lands is shut in. Under the glass the air
 * is forced: your cooldowns come round twice as fast, but the heat ticks at you, and the glass wall
 * stops every shot — in or out — and every step. Three strikes on the glass shatter it (and the
 * shards cut whoever is inside); otherwise it lifts after a few seconds. An empty cloche just stands
 * there: cover, for a while.
 *
 * Exploit: walk her under the shadow, then stand outside her glass and break it on her. From half,
 * a cloche comes down on each of you at once.
 */

const ID = fallenId('bloom', 'under-glass');
const R = 74;
const WARN_MS = 1300;
const HOLD_MS = 3600;
const HEAT_MS = 500;
const CRACKS = 3;

interface Bell {
  x: number; y: number; at: number; landAt: number; liftAt: number;
  landed: boolean; inside: Fighter | null; cracks: number; heatAt: number; t: StrikeTarget | null; shatterAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, top, player, npc, tk } = ctx;
  const bells: Bell[] = [];
  let next = 0;
  let turned = false;

  function drop(f: Fighter, time: number): void {
    bells.push({
      x: tk.clampX(f.x, R + 10), y: tk.clampY(f.y, R), at: time, landAt: time + tk.warn(WARN_MS), liftAt: 0,
      landed: false, inside: null, cracks: 0, heatAt: 0, t: null, shatterAt: 0,
    });
    ctx.sfx('whoosh');
  }

  function land(b: Bell, time: number): void {
    b.landed = true;
    b.liftAt = time + HOLD_MS;
    b.heatAt = time + HEAT_MS;
    b.inside = [player, npc].find((f) => alive(f) && dist(f.x, f.y, b.x, b.y) < R - 6) ?? null;
    ctx.sfx('crystal-chime');
    tk.boom(b.x, b.y, R, GLASS_EDGE);
    if (b.inside) ctx.float(b.inside.x, b.inside.y - 60, 'UNDER GLASS', '#cfeff0');
    b.t = ctx.target({
      x: b.x, y: b.y, r: R,
      onStruck: () => {
        if (b.shatterAt) return;
        b.cracks++;
        ctx.sfx('crystal-shatter');
        if (b.cracks >= CRACKS) shatter(b, tk.now);
      },
    });
  }

  function shatter(b: Bell, time: number): void {
    b.shatterAt = time;
    b.t?.remove(); b.t = null;
    const f = b.inside;
    if (f && alive(f)) {
      if (f === player) tk.hitPlayer(8, f.x, f.y); else ctx.hit(npc, 14, f.x, f.y);
      ctx.float(f.x, f.y - 56, 'SHARDS', '#cfeff0');
    }
    b.inside = null;
    ctx.flash(b.x, b.y - 40, GLASS_LIT);
  }

  function lift(b: Bell): void {
    b.t?.remove(); b.t = null;
    b.inside = null;
    b.shatterAt = -1;
  }

  const shut = (f: Fighter) => bells.some((b) => b.landed && !b.shatterAt && b.inside === f);

  return {
    update(time) {
      if (!next) next = time + 2600;
      if (!turned && npc.hp < npc.maxHp * 0.5) {
        turned = true;
        ctx.banner('THE WHOLE LAWN UNDER GLASS', '#cfeff0');
        ctx.sfx('boss-phase');
      }
      if (time >= next) {
        if (alive(player) && !shut(player)) drop(player, time);
        if (turned && alive(npc) && !shut(npc)) drop(npc, time);
        next = time + (turned ? 6200 : 6800);
      }
      for (const b of bells) {
        if (!b.landed && time >= b.landAt) land(b, time);
        if (!b.landed || b.shatterAt) continue;
        if (time >= b.liftAt) { lift(b); ctx.sfx('snap-back'); continue; }
        // The glass is a wall both ways.
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const d = dist(f.x, f.y, b.x, b.y) || 1;
          const ux = (f.x - b.x) / d, uy = (f.y - b.y) / d;
          if (f === b.inside && d > R - 22) ctx.nudge(f, -ux * (d - (R - 22)), -uy * (d - (R - 22)));
          else if (f !== b.inside && d < R + 22) ctx.nudge(f, ux * (R + 22 - d), uy * (R + 22 - d));
        }
        for (const s of ctx.shotsNear(b.x, b.y, R + 24)) {
          if (Math.abs(dist(s.x, s.y, b.x, b.y) - R) < 16) s.block();
        }
        // The forcing heat, on its own clock.
        if (b.inside && time >= b.heatAt) {
          b.heatAt = time + HEAT_MS;
          if (b.inside === player) tk.hitPlayer(4, player.x, player.y); else ctx.hit(npc, 6, npc.x, npc.y);
        }
      }
      for (let i = bells.length - 1; i >= 0; i--) {
        const b = bells[i];
        if (b.shatterAt && time - Math.abs(b.shatterAt) > 700) bells.splice(i, 1);
      }
    },

    playerCooldownRate: () => (shut(player) ? 2 : 1),
    npcCooldownRate: () => (shut(npc) ? 2 : 1),

    npcSeek() {
      const mark = bells.find((b) => !b.landed && dist(npc.x, npc.y, b.x, b.y) < R + 40);
      if (mark) {
        const a = Math.atan2(npc.y - mark.y, npc.x - mark.x) || 0.5;
        return { x: tk.clampX(mark.x + Math.cos(a) * (R + 80)), y: tk.clampY(mark.y + Math.sin(a) * (R + 80)) };
      }
      // You are shut in: stand off and let the glass cook you.
      const cooking = bells.find((b) => b.landed && !b.shatterAt && b.inside === player);
      if (cooking) {
        const a = Math.atan2(npc.y - cooking.y, npc.x - cooking.x);
        return { x: tk.clampX(cooking.x + Math.cos(a) * 230), y: tk.clampY(cooking.y + Math.sin(a) * 230) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const b of bells) {
        if (b.landed) { if (!b.shatterAt) drawRim(g, b); continue; }
        const k = clamp((time - b.at) / (b.landAt - b.at), 0, 1);
        shadow(g, b.x, b.y, R * 2 * (0.5 + k * 0.5), R * 0.9 * (0.5 + k * 0.5), 0.15 + k * 0.3);
        g.lineStyle(2, GLASS_EDGE, 0.4 + k * 0.6); g.strokeEllipse(b.x, b.y, R * 2, R * 0.9);
        g.lineStyle(1, GLASS_LIT, 0.5); g.strokeEllipse(b.x, b.y, R * 2 * k, R * 0.9 * k);
      }
    },

    drawAir(g, time) {
      for (const b of bells) {
        if (!b.landed) {
          const k = clamp((time - b.at) / (b.landAt - b.at), 0, 1);
          const y = b.y - (1 - k * k) * 480;
          if (y > top - 60) cloche(g, b.x, y, R, 0.12);
          continue;
        }
        if (b.shatterAt > 0) { drawShards(g, b, time); continue; }
        if (b.shatterAt < 0) continue;
        const heat = clamp((time - (b.liftAt - HOLD_MS)) / HOLD_MS, 0, 1);
        drawForcing(g, b, heat, time);
        cloche(g, b.x, b.y, R, 0.1 + heat * 0.18);
        drawCracks(g, b);
      }
    },

    drawHud(g, time) {
      for (const f of [player, npc]) {
        const b = bells.find((q) => q.landed && !q.shatterAt && q.inside === f);
        if (!b) continue;
        const x = f === player ? W / 2 - 90 : W / 2 + 60, y = top + 6;
        const left = clamp((b.liftAt - time) / HOLD_MS, 0, 1);
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 6, y - 2, 42, 30, 5);
        // A thermometer: the mercury falls as the glass nears its lifting.
        g.fillStyle(0xe8e8e8, 1); g.fillRoundedRect(x, y + 2, 6, 20, 3); g.fillCircle(x + 3, y + 23, 5);
        g.fillStyle(0xd83a2a, 1); g.fillCircle(x + 3, y + 23, 3.5); g.fillRect(x + 1.5, y + 4 + 18 * (1 - left), 3, 18 * left);
        for (let i = 0; i < CRACKS; i++) {
          g.fillStyle(i < b.cracks ? GLASS_LIT : GLASS_EDGE, i < b.cracks ? 1 : 0.4);
          g.fillTriangle(x + 14 + i * 7, y + 22, x + 18 + i * 7, y + 6, x + 20 + i * 7, y + 22);
        }
      }
    },

    destroy() { for (const b of bells) b.t?.remove(); },
  };
}

/** The cloche's foot pressed into the turf: a ring of crushed soil and a terracotta saucer rim. */
function drawRim(g: G, b: Bell): void {
  g.fillStyle(SOIL_DARK, 0.5); g.fillEllipse(b.x, b.y, R * 2 + 14, R * 0.45 + 10);
  g.fillStyle(TERRA_DARK, 1); g.fillEllipse(b.x, b.y, R * 2 + 6, R * 0.45 + 6);
  g.fillStyle(TERRA, 1); g.fillEllipse(b.x, b.y - 1, R * 2, R * 0.45);
  g.fillStyle(0x3a4a2a, 1); g.fillEllipse(b.x, b.y - 1, R * 2 - 10, R * 0.45 - 6);
}

/** Inside the glass: heat shimmer rising and beads of condensation running down the dome. */
function drawForcing(g: G, b: Bell, heat: number, time: number): void {
  glow(g, b.x, b.y - R * 0.6, R * 0.9, 0xffa050, 0.025 + heat * 0.035, 3);
  for (let i = 0; i < 6; i++) {
    const x = b.x - R * 0.6 + i * R * 0.24;
    const ph = ((time / 900 + i * 0.37) % 1);
    const y0 = b.y - 6 - ph * R * 1.3;
    g.lineStyle(1.5, 0xffd0a0, 0.35 * (1 - ph) * (0.4 + heat));
    g.beginPath(); g.moveTo(x, y0);
    for (let k = 1; k <= 4; k++) g.lineTo(x + Math.sin(time / 120 + k + i) * 3, y0 - k * 6);
    g.strokePath();
  }
  const n = 4 + Math.floor(heat * 10);
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const run = ((time / 2400 + i * 0.29) % 1) * heat;
    const x = b.x + Math.cos(a) * R * 0.92, y = b.y - R * 0.93 + Math.abs(Math.sin(a)) * R * 0.2 + run * R * 0.9;
    g.fillStyle(GLASS_LIT, 0.7); g.fillEllipse(x, y, 3, 4.5);
    g.lineStyle(1, GLASS, 0.4); g.lineBetween(x, y - 2, x, y - 2 - run * 16);
  }
}

/** Star-cracks where it was struck. */
function drawCracks(g: G, b: Bell): void {
  for (let c = 0; c < b.cracks; c++) {
    const cx = b.x + (c - 1) * R * 0.5, cy = b.y - R * (0.6 + (c % 2) * 0.35);
    g.lineStyle(1.5, 0xffffff, 0.9);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + c;
      const l = 10 + ((i * 7 + c * 3) % 9);
      g.lineBetween(cx, cy, cx + Math.cos(a) * l, cy + Math.sin(a) * l);
      g.lineBetween(cx + Math.cos(a) * l, cy + Math.sin(a) * l, cx + Math.cos(a + 0.5) * (l + 6), cy + Math.sin(a + 0.5) * (l + 6));
    }
  }
}

/** The cloche bursting: curved panes flying out and falling. */
function drawShards(g: G, b: Bell, time: number): void {
  const k = clamp((time - b.shatterAt) / 700, 0, 1);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = R * (0.4 + k * 1.1);
    const x = b.x + Math.cos(a) * r, y = b.y - R * 0.7 + Math.sin(a) * r * 0.6 + k * k * 60;
    g.fillStyle(i % 2 ? GLASS_LIT : GLASS, 0.85 * (1 - k));
    g.fillTriangle(x, y, x + Math.cos(a + 1) * 10, y + Math.sin(a + 1) * 10, x + Math.cos(a - 0.6) * 7, y + Math.sin(a - 0.6) * 12);
  }
}

export const FALLEN_UNDER_GLASS: GimmickDef = {
  id: ID,
  rules: 'Cloches drop on marked shadows. Shut in: cooldowns twice as fast, but heat ticks and the glass blocks all. Three strikes shatter it.',
  make,
};
