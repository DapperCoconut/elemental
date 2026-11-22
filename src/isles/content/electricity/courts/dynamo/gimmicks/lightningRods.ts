import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { bolt, lightningRod, sparks } from '../art';
import { ARC, ARC_VIOLET, BASALT_DARK, COPPER_LIT, OFF_RED, SPARK } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Lightning Rods — Rodsman Ferris.
 *
 * Five lightning rods stand in the yard, and the storm overhead never stops. Every few seconds it
 * picks whoever is standing *farthest from any upright rod*, and a cloud shadow gathers on them —
 * following them, then holding still — before the bolt comes down where it settled.
 *
 * Ferris raises and dresses those rods for a living, and he knows a rod can be bent. Strike a rod
 * and you bend it over toward the other fighter. A bent rod shelters nobody —
 * so the rod you bend is cover you have taken away from them — and every time the storm strikes,
 * every bent rod within reach throws a second arc down its own length at whoever it points at.
 * Bend the rods round your foe, shelter by an upright one yourself, and let the sky do the work.
 */

interface Rod { x: number; y: number; h: number; toward: Fighter | null; until: number; bend: number }
interface Cloud { target: Fighter; x: number; y: number; at: number; lockAt: number; fireAt: number }
interface Flash { x: number; y: number; at: number; fromX: number; fromY: number; rod: boolean }

const ROD_R = 22;
const STRIKE_R = 66;
const ROD_REACH = 340;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const mid = (top + H) / 2;
  const rods: Rod[] = [
    { x: 180, y: top + 130 }, { x: W - 180, y: top + 130 }, { x: W / 2, y: mid + 30 },
    { x: 180, y: H - 70 }, { x: W - 180, y: H - 70 },
  ].map((p, i) => ({ ...p, h: 90 + (i % 2) * 14, toward: null, until: 0, bend: 0 }));
  const every = ctx.hard ? 3400 : 4200;
  const gather = ctx.hard ? 1300 : 1500;
  const dmg = ctx.hard ? 19 : 16;
  let next = -1;
  let cloud: Cloud | null = null;
  const flashes: Flash[] = [];
  const scorches: { x: number; y: number; at: number }[] = [];

  const other = (f: Fighter) => (f === player ? npc : player);
  const upright = (r: Rod) => r.toward === null;
  const exposure = (f: Fighter) => rods.filter(upright).reduce((m, r) => Math.min(m, dist(r.x, r.y, f.x, f.y)), 9999);
  const tip = (r: Rod): Pt => ({ x: r.x + Math.sin(r.bend) * r.h * 0.5, y: r.y - 16 - r.h * 0.5 - Math.cos(r.bend) * r.h * 0.5 });

  function hurt(f: Fighter, n: number, x: number, y: number): void {
    if (f === player) tk.hitPlayer(n, x, y);
    else ctx.hit(f, n, x, y);
  }

  function strike(c: Cloud, time: number): void {
    ctx.sfx('thunder');
    ctx.flash(c.x, c.y, ARC);
    flashes.push({ x: c.x, y: c.y, at: time, fromX: c.x + 40, fromY: top - 20, rod: false });
    scorches.push({ x: c.x, y: c.y, at: time });
    for (const f of [player, npc]) {
      if (!alive(f) || dist(f.x, f.y, c.x, c.y) > STRIKE_R + 10) continue;
      hurt(f, dmg, f.x, f.y);
      ctx.stun(f, 300);
    }
    // Every bent rod in reach throws an arc at whoever it points at.
    for (const r of rods) {
      const t = r.toward;
      if (!t || !alive(t) || dist(r.x, r.y, t.x, t.y) > ROD_REACH) continue;
      const p = tip(r);
      flashes.push({ x: t.x, y: t.y - 10, at: time + 120, fromX: p.x, fromY: p.y, rod: true });
      tk.schedule(120, () => {
        if (!alive(t)) return;
        hurt(t, 9, t.x, t.y);
        ctx.float(t.x, t.y - 46, 'ROD ARC', '#d0c0ff');
        ctx.sfx('zap');
      });
    }
  }

  // Each rod is a strike target at its mast: a blow bends it over at the striker's foe.
  for (const r of rods) {
    ctx.target({
      x: r.x, y: r.y - 34, r: ROD_R,
      onStruck(by) {
        const t = by === 'player' ? npc : player;
        if (!alive(t)) return;
        const fresh = r.toward !== t;
        r.toward = t; r.until = tk.now + 9000;
        if (!fresh) return;
        ctx.float(r.x, r.y - r.h - 30, by === 'player' ? 'BENT AT HIM' : 'BENT AT YOU', by === 'player' ? '#bff0ff' : '#ffb0a0');
        ctx.sfx('clang');
      },
    });
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (next < 0) next = time + 2200;
      for (const r of rods) {
        if (r.toward && time >= r.until) { r.toward = null; ctx.sfx('snap-back'); }
        // The mast eases toward whoever it points at.
        const want = r.toward ? clamp(wrapAngle(Math.atan2(r.toward.x - r.x, -(r.toward.y - r.y))), -1.15, 1.15) : 0;
        r.bend += (want - r.bend) * Math.min(1, dt * 6);
      }
      // The storm.
      if (!cloud && time >= next && alive(player) && alive(npc)) {
        const target = exposure(player) >= exposure(npc) ? player : npc;
        cloud = { target, x: target.x, y: target.y, at: time, lockAt: time + gather - 450, fireAt: time + gather };
        ctx.sfx('rain');
      }
      if (cloud) {
        if (time < cloud.lockAt && alive(cloud.target)) {
          const k = Math.min(1, dt * 2.4);
          cloud.x += (cloud.target.x - cloud.x) * k; cloud.y += (cloud.target.y - cloud.y) * k;
        }
        if (time >= cloud.fireAt) { strike(cloud, time); cloud = null; next = time + every; }
      }
      for (let i = flashes.length - 1; i >= 0; i--) if (time - flashes[i].at > 400) flashes.splice(i, 1);
      for (let i = scorches.length - 1; i >= 0; i--) if (time - scorches[i].at > 3500) scorches.splice(i, 1);
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Dodge a gathering cloud first.
      if (cloud && cloud.target === npc) {
        const a = Math.atan2(npc.y - cloud.y, npc.x - cloud.x);
        return { x: clamp(npc.x + Math.cos(a) * 140, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 140, top + 50, H - 40) };
      }
      // A rod pointing at him: strike it back round.
      const atMe = rods.find((r) => r.toward === npc && dist(r.x, r.y, npc.x, npc.y) < 320);
      if (atMe) return { x: atMe.x + 10, y: atMe.y + 12 };
      // Strip the player's shelter: strike the upright rod nearest them, if it is not too far.
      const theirs = rods.filter(upright).sort((a, b) => dist(a.x, a.y, player.x, player.y) - dist(b.x, b.y, player.x, player.y))[0];
      if (theirs && dist(theirs.x, theirs.y, npc.x, npc.y) < 380 && dist(theirs.x, theirs.y, player.x, player.y) < 200) {
        return { x: theirs.x - 10, y: theirs.y + 12 };
      }
      // Otherwise shelter by an upright rod away from the player.
      const mine = rods.filter(upright).sort((a, b) => dist(b.x, b.y, player.x, player.y) - dist(a.x, a.y, player.x, player.y))[0];
      return mine ? { x: mine.x + 50, y: mine.y + 10 } : { x: W - player.x, y: H + top - player.y };
    },

    drawGround(g, time) {
      // Scorch stars where bolts have landed.
      for (const s of scorches) {
        const fade = 1 - clamp((time - s.at) / 3500, 0, 1);
        g.fillStyle(BASALT_DARK, 0.5 * fade); g.fillEllipse(s.x, s.y, 70, 30);
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + s.x;
          g.lineStyle(2, 0x05060a, 0.6 * fade); g.lineBetween(s.x, s.y, s.x + Math.cos(a) * 42, s.y + Math.sin(a) * 18);
        }
        g.fillStyle(0x6cc6a6, 0.5 * fade); g.fillCircle(s.x, s.y, 3);
      }
      // The gathering shadow: a dark disc that fills, with its edge drawn; white when it holds.
      if (cloud) {
        const k = clamp((time - cloud.at) / (cloud.fireAt - cloud.at), 0, 1);
        const locked = time >= cloud.lockAt;
        g.fillStyle(0x000000, 0.18 + k * 0.3); g.fillEllipse(cloud.x, cloud.y, STRIKE_R * 2 * (0.5 + k * 0.5), STRIKE_R * 0.9 * (0.5 + k * 0.5));
        g.lineStyle(2, locked ? 0xffffff : ARC, locked ? 0.9 : 0.4 + k * 0.4); g.strokeEllipse(cloud.x, cloud.y, STRIKE_R * 2, STRIKE_R * 0.9);
        // Rain thickening under the cloud.
        for (let i = 0; i < 12; i++) {
          const ph = ((time / 300) + i * 0.13) % 1;
          const rx = cloud.x + (((i * 37) % 100) / 100 - 0.5) * STRIKE_R * 1.8;
          g.lineStyle(1, ARC, 0.3 * k); g.lineBetween(rx, cloud.y - 60 + ph * 50, rx - 2, cloud.y - 50 + ph * 50);
        }
      }
      // The rods, with a ring at the foot of each in the colour of whoever it points at.
      for (const r of rods) {
        g.lineStyle(1.5, r.toward ? (r.toward === player ? OFF_RED : ARC_VIOLET) : 0x8a8a90, 0.4);
        g.strokeEllipse(r.x, r.y, 60, 22);
        lightningRod(g, r.x, r.y, r.h, r.bend, cloud ? 0.5 : 0.2);
        if (r.toward) {
          const p = tip(r);
          sparks(g, p.x, p.y, 10, time, 3, r.toward === player ? OFF_RED : COPPER_LIT);
          // A faint line showing who the rod is aimed at.
          if (alive(r.toward) && dist(r.x, r.y, r.toward.x, r.toward.y) < ROD_REACH) {
            g.lineStyle(1, r.toward === player ? OFF_RED : ARC_VIOLET, 0.25);
            g.lineBetween(p.x, p.y, r.toward.x, r.toward.y - 10);
          }
        }
      }
    },

    drawAir(g, time) {
      // The cloud itself, overhead.
      if (cloud) {
        const k = clamp((time - cloud.at) / (cloud.fireAt - cloud.at), 0, 1);
        const cy = Math.max(top + 24, cloud.y - 130);
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + time / 1400;
          g.fillStyle(i % 2 ? 0x1a1e28 : 0x2a3040, 0.55 + k * 0.3);
          g.fillCircle(cloud.x + Math.cos(a) * 34, cy + Math.sin(a) * 12, 22 + (i % 3) * 6);
        }
        if (Math.floor(time / 90) % 5 === 0) glow(g, cloud.x, cy, 40, ARC, 0.06 * k, 2);
      }
      // Bolts: sky to ground, and rod arcs.
      for (const f of flashes) {
        if (time < f.at) continue;
        const k = clamp((time - f.at) / 400, 0, 1);
        if (f.rod) bolt(g, f.fromX, f.fromY, f.x, f.y, Math.floor(time / 50), 3 * (1 - k) + 1, ARC_VIOLET, 1 - k, 12);
        else {
          bolt(g, f.fromX, f.fromY, f.x, f.y, Math.floor(time / 45), 7 * (1 - k) + 1, ARC, 1 - k, 30);
          glow(g, f.x, f.y, 90, ARC, 0.1 * (1 - k), 3);
          sparks(g, f.x, f.y, 30, time, 8, SPARK);
        }
      }
      // A storm-flash over the whole yard in the instant of a strike.
      const last = flashes.find((f) => !f.rod && time - f.at < 90);
      if (last) { g.fillStyle(0xe8fbff, 0.12); g.fillRect(0, top, W, H - top); }
    },
  };
}

export const LIGHTNING_RODS: GimmickDef = {
  id: 'dynamo-lightning-rods',
  rules: 'The storm strikes whoever stands farthest from an upright rod. Strike a rod to bend it at your foe: it shelters nobody, and arcs at them each strike.',
  make,
};
