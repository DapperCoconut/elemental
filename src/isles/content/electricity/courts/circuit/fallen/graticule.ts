import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow } from '../../../../../art/IsleArt';
import type { G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { segText } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, EPOXY, EPOXY_LIT, FAULT, IRON, IRON_DARK, SILK, SOLDER, SOLDER_DARK } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * The Green Graticule — Scopewright Halvard Lumm, who in the King's telling kept the Tabulator's
 * oscilloscope and watched every household's current on it, so he could point at the screen and
 * say whose line had dipped.
 *
 * The yard *is* the face of his scope: a dark phosphor screen ruled with a graticule. A bright spot
 * sweeps left to right across it and leaves its trace glowing behind it. The spot burns whoever it
 * runs into; the glowing trace scalds and drags anyone who steps across it while it lasts.
 *
 * Where the spot runs is the probe's doing. The probe is clipped to one fighter (its lead runs back
 * to the stand on the west wall), and the spot draws that fighter's height **mirrored** about the
 * centre line: stand high and it runs low. The holder aims it by standing at the mirror of the other
 * one. Strike the probe stand to clip the probe to yourself. At the moment a sweep starts the spot
 * jumps to the holder's mirror; during the sweep it only drifts, slower than a walk.
 *
 * Halfway down, channel two wakes: a second spot sweeps right to left, clipped to whoever does NOT
 * hold the probe. Aiming CH1 at your foe now lines CH2 up on you — time it between their passes.
 * The bot runs for the stand when it lacks the probe, and with it stands at your mirror.
 */

const ID = fallenId('circuit', 'graticule');
const SWEEP = 360;
const RETRACE_MS = 760;
const DRIFT = 70;
const SPOT_R = 13;
const SPOT_DMG = 15;
const TRAIL_MS = 1700;
const TRAIL_DMG = 5;
const TRAIL_TICK_MS = 520;
const STAND_R = 26;
const PHOSPHOR = 0x6aff9a;
const PHOSPHOR_DEEP = 0x0a1c12;

interface Trail { x: number; y: number; at: number }
interface Beam { dir: 1 | -1; x: number; y: number; on: boolean; offAt: number; hit: Set<Fighter>; trail: Trail[]; clip: () => Fighter }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const ym = (top + H) / 2;
  const mirror = (y: number): number => clamp(top + H - y, top + 24, H - 24);
  const stand: Pt = { x: 58, y: ym };
  let holder: Fighter = npc;
  let swapAt = -9999;
  let dual = false;
  const burnAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  let npcDrag = 0;
  const other = (f: Fighter): Fighter => (f === player ? npc : player);

  const mkBeam = (dir: 1 | -1, clip: () => Fighter): Beam => ({ dir, x: 0, y: ym, on: false, offAt: 0, hit: new Set(), trail: [], clip });
  const ch1 = mkBeam(1, () => holder);
  const ch2 = mkBeam(-1, () => other(holder));
  const beams = [ch1];

  ctx.target({
    x: stand.x, y: stand.y, r: STAND_R, passThrough: true,
    onStruck: (by) => {
      const now = ctx.scene.time.now;
      const f = by === 'player' ? player : npc;
      if (f === holder || now - swapAt < 400) return;
      holder = f; swapAt = now;
      ctx.sfx('snap-back');
      ctx.float(stand.x + 30, stand.y - 30, by === 'player' ? 'PROBE: YOU' : 'PROBE: LUMM', by === 'player' ? '#9af6ff' : '#ffb070');
    },
  });

  function trigger(b: Beam): void {
    b.on = true;
    b.x = b.dir > 0 ? 40 : W - 40;
    b.y = mirror(b.clip().y);
    b.hit.clear();
    ctx.sfx('beam-fire');
  }

  function stepBeam(b: Beam, time: number, dt: number): void {
    if (!b.on) { if (time >= b.offAt) trigger(b); return; }
    const want = mirror(b.clip().y);
    b.y += clamp(want - b.y, -DRIFT * dt, DRIFT * dt);
    b.x += b.dir * SWEEP * dt;
    b.trail.push({ x: b.x, y: b.y, at: time });
    for (const f of [player, npc] as Fighter[]) {
      if (!alive(f) || b.hit.has(f)) continue;
      if (dist(b.x, b.y, f.x, f.y) < SPOT_R + 20) {
        b.hit.add(f);
        ctx.hit(f, SPOT_DMG, f.x, f.y);
        ctx.flash(f.x, f.y, PHOSPHOR);
        ctx.sfx('hit-medium');
      }
    }
    if (b.x > W - 40 || b.x < 40) { b.on = false; b.offAt = time + RETRACE_MS; }
  }

  /** Is `f` standing across a live stretch of either trace? */
  function onTrace(f: Fighter, time: number): boolean {
    for (const b of beams) {
      const tr = b.trail;
      for (let i = 1; i < tr.length; i++) {
        if (time - tr[i].at > TRAIL_MS) continue;
        if (segDist(f.x, f.y, tr[i - 1].x, tr[i - 1].y, tr[i].x, tr[i].y) < 22) return true;
      }
    }
    return false;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!ch1.on && ch1.offAt === 0) ch1.offAt = time + 1600;
      if (!dual && npc.hp < npc.maxHp * 0.5) {
        dual = true;
        beams.push(ch2);
        ch2.on = false; ch2.offAt = time + 1200;
        ctx.banner('Channel two: it is clipped to whoever holds no probe.', '#9affc0');
        ctx.sfx('beam-charge');
      }
      for (const b of beams) {
        stepBeam(b, time, dt);
        while (b.trail.length && time - b.trail[0].at > TRAIL_MS) b.trail.shift();
      }
      npcDrag = 0;
      for (const f of [player, npc] as Fighter[]) {
        if (!alive(f) || !onTrace(f, time)) continue;
        if (f === player) ctx.tk.slowPlayer(0.65, 200); else npcDrag = 1;
        if (time - (burnAt.get(f) ?? 0) >= TRAIL_TICK_MS) {
          burnAt.set(f, time);
          ctx.hit(f, TRAIL_DMG, f.x, f.y);
          ctx.sfx('sizzle');
        }
      }
    },

    npcSpeedMult: () => (npcDrag ? 0.65 : 1),

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // A spot coming down my row: step out of it first.
      for (const b of beams) {
        if (!b.on) continue;
        const ahead = (npc.x - b.x) * b.dir;
        if (ahead > -10 && ahead < 320 && Math.abs(b.y - npc.y) < 60) {
          return { x: npc.x, y: clamp(npc.y + (npc.y > b.y ? 110 : -110), top + 40, H - 40) };
        }
      }
      if (holder !== npc) return { x: stand.x + 46, y: stand.y + (player.y < stand.y ? 40 : -40) };
      const side = player.x > W / 2 ? -1 : 1;
      return { x: clamp(player.x + side * 260, 60, W - 60), y: mirror(player.y) };
    },

    drawGround(g, time) {
      // The screen: deep phosphor black-green, a faint bloom at the centre, the graticule over it.
      g.fillStyle(PHOSPHOR_DEEP, 0.92); g.fillRect(0, top, W, H - top);
      glow(g, W / 2, ym, 360, PHOSPHOR, 0.025, 4);
      const dx = (W - 80) / 10, dy = (H - top - 40) / 8;
      for (let i = 0; i <= 10; i++) {
        const x = 40 + i * dx;
        g.lineStyle(i === 5 ? 2 : 1, PHOSPHOR, i === 5 ? 0.22 : 0.1); g.lineBetween(x, top + 20, x, H - 20);
      }
      for (let j = 0; j <= 8; j++) {
        const y = top + 20 + j * dy;
        g.lineStyle(j === 4 ? 2 : 1, PHOSPHOR, j === 4 ? 0.22 : 0.1); g.lineBetween(40, y, W - 40, y);
      }
      // Minor ticks along the centre axes, five to a division.
      for (let x = 40; x <= W - 40; x += dx / 5) { g.lineStyle(1, PHOSPHOR, 0.2); g.lineBetween(x, ym - 4, x, ym + 4); }
      for (let y = top + 20; y <= H - 20; y += dy / 5) { g.lineStyle(1, PHOSPHOR, 0.2); g.lineBetween(W / 2 - 4, y, W / 2 + 4, y); }
      segText(g, W - 150, H - 40, 'DC 50', 10, PHOSPHOR, 0.35);
      // The traces: older parts dimmer, the newest a bright core.
      for (const b of beams) {
        const tr = b.trail;
        for (let i = 1; i < tr.length; i++) {
          const k = 1 - (time - tr[i].at) / TRAIL_MS;
          if (k <= 0) continue;
          g.lineStyle(18, PHOSPHOR, 0.08 * k); g.lineBetween(tr[i - 1].x, tr[i - 1].y, tr[i].x, tr[i].y);
          g.lineStyle(6, PHOSPHOR, 0.35 * k); g.lineBetween(tr[i - 1].x, tr[i - 1].y, tr[i].x, tr[i].y);
          g.lineStyle(2, 0xe8ffee, 0.8 * k * k); g.lineBetween(tr[i - 1].x, tr[i - 1].y, tr[i].x, tr[i].y);
        }
        // Where the next sweep will start: a level marker on the screen's edge.
        const ex = b.dir > 0 ? 34 : W - 34;
        const ly = b.on ? b.y : mirror(b.clip().y);
        const pulse = b.on ? 0.4 : 0.6 + Math.sin(time / 90) * 0.3;
        g.fillStyle(PHOSPHOR, pulse);
        g.fillTriangle(ex, ly, ex - b.dir * 14, ly - 8, ex - b.dir * 14, ly + 8);
        segText(g, ex + (b.dir > 0 ? 8 : -32), ly - 20, b === ch1 ? 'CH1' : 'CH2', 8, PHOSPHOR, 0.6);
        if (!b.on) {
          // The trigger level, dashed across the screen while the beam is blanked for retrace.
          for (let x = 40; x < W - 40; x += 24) { g.lineStyle(1.5, PHOSPHOR, 0.18); g.lineBetween(x, ly, x + 12, ly); }
        }
      }
    },

    drawAir(g, time) {
      // The probe lead: from the stand, in a lazy curve, to the holder's hand.
      if (alive(holder)) drawLead(g, stand, holder, time);
      drawStand(g, stand, holder === player, time - swapAt);
      for (const b of beams) {
        if (!b.on) continue;
        glow(g, b.x, b.y, 44, PHOSPHOR, 0.12, 4);
        g.fillStyle(PHOSPHOR, 0.9); g.fillCircle(b.x, b.y, SPOT_R);
        g.fillStyle(0xf2fff6, 1); g.fillCircle(b.x, b.y, SPOT_R * 0.55);
        g.lineStyle(1.5, PHOSPHOR, 0.5); g.strokeCircle(b.x, b.y, SPOT_R + 5 + Math.sin(time / 30) * 2);
      }
    },

    drawHud(g) {
      // A strip from the scope's front panel: which channel is clipped to whom.
      const x = W / 2 - 110, y = top + 4;
      g.fillStyle(EPOXY, 0.85); g.fillRoundedRect(x, y, 220, 22, 6);
      g.lineStyle(1, PHOSPHOR, 0.4); g.strokeRoundedRect(x, y, 220, 22, 6);
      const mine = holder === player;
      g.fillStyle(mine ? 0x9af6ff : 0xffb070, 1); g.fillCircle(x + 14, y + 11, 5);
      segText(g, x + 26, y + 5, mine ? 'CH1 YOU' : 'CH1 FOE', 11, PHOSPHOR, 0.9);
      if (dual) {
        g.fillStyle(mine ? 0xffb070 : 0x9af6ff, 1); g.fillCircle(x + 124, y + 11, 5);
        segText(g, x + 136, y + 5, mine ? 'CH2 FOE' : 'CH2 YOU', 11, PHOSPHOR, 0.9);
      }
    },
  };
}

/** The coiled probe lead: a black cable with a brass hook-clip at the holder's end. */
function drawLead(g: G, from: Pt, to: Fighter, time: number): void {
  const mx = (from.x + to.x) / 2, my = Math.max(from.y, to.y) + 50 + Math.sin(time / 400) * 6;
  let px = from.x + 16, py = from.y - 18;
  for (let i = 1; i <= 16; i++) {
    const t = i / 16, u = 1 - t;
    const x = u * u * (from.x + 16) + 2 * u * t * mx + t * t * to.x;
    const y = u * u * (from.y - 18) + 2 * u * t * my + t * t * (to.y - 8);
    g.lineStyle(4, 0x0a0a0e, 0.9); g.lineBetween(px, py, x, y);
    g.lineStyle(1, IRON, 0.8); g.lineBetween(px, py - 1, x, y - 1);
    px = x; py = y;
  }
  g.fillStyle(BRASS_DARK, 1); g.fillRect(to.x - 3, to.y - 18, 6, 12);
  g.fillStyle(BRASS_LIT, 1); g.fillRect(to.x - 1, to.y - 26, 2, 9);
  g.lineStyle(1.5, BRASS, 1); g.strokeCircle(to.x, to.y - 27, 3);
}

/** The probe stand: an iron upright with an insulated arm and the scope's input socket in brass. */
function drawStand(g: G, s: Pt, mine: boolean, since: number): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(s.x, s.y + 12, 50, 14);
  g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(s.x - 20, s.y + 2, 40, 12, 3);
  g.fillStyle(IRON, 1); g.fillRect(s.x - 4, s.y - 40, 8, 44);
  g.fillStyle(EPOXY_LIT, 1); g.fillRect(s.x - 4, s.y - 40, 30, 7);
  g.fillStyle(SOLDER_DARK, 1); g.fillCircle(s.x + 18, s.y - 18, 9);
  g.fillStyle(SOLDER, 1); g.fillCircle(s.x + 18, s.y - 18, 7);
  g.fillStyle(BRASS, 1); g.fillCircle(s.x + 18, s.y - 18, 3.5);
  const col = mine ? 0x9af6ff : 0xffb070;
  g.fillStyle(col, 1); g.fillCircle(s.x, s.y - 46, 4);
  if (since < 500) { g.lineStyle(2, col, 1 - since / 500); g.strokeCircle(s.x, s.y - 14, STAND_R + since / 30); }
  g.lineStyle(1, dim(FAULT, 0.2), 0.5); g.strokeCircle(s.x, s.y - 14, STAND_R);
  segText(g, s.x - 12, s.y + 18, 'IN', 8, SILK, 0.5);
}

export const FALLEN_GRATICULE: GimmickDef = {
  id: ID,
  rules: 'The spot runs at the probe-holder\'s mirrored height; it and its trace burn. Strike the stand to take the probe. At half, CH2 aims at the other.',
  make,
};
