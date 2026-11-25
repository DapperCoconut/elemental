import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit, mixC, stroke, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRASS, BRASS_DARK, BRASS_LIT, IRON, IRON_DARK, IRON_LIT, LIME_DARK, ROUGE, SOOT, STEAM } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';
import { hpRatio, hudPlate, rivet } from './kit';

/**
 * Pinched Line — Hose-Fitter Keturah Spigot, who runs the yard's compressed air.
 *
 * An air receiver hums on the north wall and three rubber hoses snake across the floor from it,
 * each to a blower nozzle on a tripod that blasts a gust of grit down its lane on a cycle (chalked
 * first) — a blow and a shove.
 *
 * Stand on a hose and you **pinch** it: its tool chokes and stops, and the air banks up behind
 * your boot (the hose swells, its gauge climbs). Step off and the banked air goes through all at
 * once: a **surge**, wider and harder the longer you held it, down that tool's lane a beat later.
 * Hold it to the red and the hose **bursts** under whoever is pinching it. So a hose is a shelter
 * from its own tool and a loaded gun aimed down its lane — step off when the foe is in it. Past
 * half the receiver runs hot and the tools cycle faster.
 */

const ID = fallenId('workshop', 'pinch');
const BUILD_S = 2.6;
const PINCH_R = 18;
const HALF = 30;

interface Tool {
  x: number; y: number; aim: number; hose: Pt[];
  next: number; warnAt: number; surge: number; fireAt: number; firedAt: number; firedSurge: boolean;
  pressure: number; pinchers: Set<Fighter>; deadUntil: number; burstAt: number; burstAtPt: Pt | null;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const C: Pt = { x: W / 2, y: top + 34 };
  const mk = (x: number, y: number, aim: number, hose: Pt[], phase: number): Tool => ({
    x, y, aim, hose, next: phase, warnAt: 0, surge: 0, fireAt: 0, firedAt: 0, firedSurge: false,
    pressure: 0, pinchers: new Set(), deadUntil: 0, burstAt: 0, burstAtPt: null,
  });
  const tools: Tool[] = [
    mk(60, H - 170, -0.18, [{ x: C.x - 40, y: C.y + 14 }, { x: 360, y: top + 150 }, { x: 210, y: top + 210 }, { x: 150, y: H - 220 }, { x: 74, y: H - 176 }], 1600),
    mk(W - 60, top + 210, Math.PI - 0.35, [{ x: C.x + 40, y: C.y + 14 }, { x: 620, y: top + 120 }, { x: 760, y: top + 100 }, { x: 860, y: top + 170 }, { x: W - 74, y: top + 206 }], 2700),
    mk(330, H - 28, -1.25, [{ x: C.x, y: C.y + 22 }, { x: 510, y: top + 210 }, { x: 440, y: top + 330 }, { x: 360, y: H - 120 }, { x: 334, y: H - 44 }], 3800),
  ];
  let hot = false;
  let started = false;

  const laneEnd = (t: Tool): Pt => ({ x: t.x + Math.cos(t.aim) * 1100, y: t.y + Math.sin(t.aim) * 1100 });
  const inLane = (t: Tool, p: Pt, half: number): boolean => { const e = laneEnd(t); return segDist(p.x, p.y, t.x, t.y, e.x, e.y) < half + 14; };
  const onHose = (t: Tool, f: Fighter): boolean => {
    for (let i = 0; i < t.hose.length - 1; i++) if (segDist(f.x, f.y, t.hose[i].x, t.hose[i].y, t.hose[i + 1].x, t.hose[i + 1].y) < PINCH_R) return true;
    return false;
  };
  /** Where along the hose a fighter's boot is, as a point (for the swelling). */
  const pinchPt = (t: Tool, f: Fighter): Pt => {
    let best: Pt = t.hose[0], bd = Infinity;
    for (let i = 0; i < t.hose.length - 1; i++) {
      const a = t.hose[i], b = t.hose[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
      const k = l2 ? clamp(((f.x - a.x) * dx + (f.y - a.y) * dy) / l2, 0, 1) : 0;
      const p = { x: a.x + dx * k, y: a.y + dy * k };
      const d = dist(f.x, f.y, p.x, p.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };

  function blast(t: Tool, time: number): void {
    const half = t.firedSurge ? HALF + 14 : HALF;
    const dmg = t.firedSurge ? Math.round(10 + 18 * t.surge) : 10;
    const push = t.firedSurge ? 110 : 60;
    for (const f of [player, npc]) {
      if (!alive(f) || !inLane(t, f, half)) continue;
      ctx.hit(f, dmg, f.x, f.y);
      ctx.nudge(f, Math.cos(t.aim) * push, Math.sin(t.aim) * push);
    }
    t.firedAt = time;
    ctx.sfx(t.firedSurge ? 'tornado' : 'gust');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!hot && hpRatio(npc) < 0.5) { hot = true; ctx.banner('THE RECEIVER RUNS HOT'); ctx.sfx('engine'); }
      const cycle = hot ? 2400 : 3300;
      const warn = hot ? 650 : 750;
      if (!started) { started = true; for (const t of tools) t.next += time; }
      for (const t of tools) {
        const dead = time < t.deadUntil;
        // Who is standing on the hose?
        t.pinchers.clear();
        if (!dead) for (const f of [player, npc]) if (alive(f) && onHose(t, f)) t.pinchers.add(f);
        // A called gust (or a released surge) goes off on time.
        if (t.fireAt && time >= t.fireAt) {
          blast(t, time);
          t.fireAt = 0; t.warnAt = 0; t.next = time + cycle;
        }
        if (t.pinchers.size) {
          // Choked: a called gust is called off and the air banks up behind the boot.
          if (t.fireAt && !t.firedSurge) { t.fireAt = 0; t.warnAt = 0; }
          t.pressure = Math.min(1, t.pressure + dt / BUILD_S);
          if (t.pressure >= 1) {
            for (const f of t.pinchers) { ctx.hit(f, 14, f.x, f.y); ctx.stun(f, 600); t.burstAtPt = pinchPt(t, f); }
            t.burstAt = time; t.pressure = 0; t.deadUntil = time + 1600; t.next = time + 1600 + cycle;
            ctx.sfx('explosion-small');
          }
          continue;
        }
        // Released with air banked: the surge, a beat after the boot comes off.
        if (t.pressure >= 0.3 && !t.fireAt) {
          t.surge = t.pressure; t.pressure = 0; t.firedSurge = true; t.fireAt = time + 400; t.warnAt = time;
          ctx.sfx('beam-charge');
        } else if (t.pressure > 0 && !t.fireAt) t.pressure = Math.max(0, t.pressure - dt);
        if (dead || t.fireAt) continue;
        // The tool's own cycle, always chalked a full warning ahead.
        if (time >= t.next - warn) { t.warnAt = time; t.firedSurge = false; t.fireAt = Math.max(t.next, time + warn); }
      }
    },

    npcSeek() {
      // On a hose: hold while the stranger is out of the lane, step off when she's in it (or at the red).
      for (const t of tools) {
        if (!t.pinchers.has(npc)) continue;
        const ready = t.pressure >= 0.45 && inLane(t, player, HALF + 14);
        if (t.pressure >= 0.85 || ready) {
          const p = pinchPt(t, npc);
          const a = Math.atan2(npc.y - p.y, npc.x - p.x);
          return { x: clamp(npc.x + Math.cos(a) * 70, 50, W - 50), y: clamp(npc.y + Math.sin(a) * 70, top + 40, H - 40) };
        }
        return { x: npc.x, y: npc.y };
      }
      // Get out of any chalked lane.
      for (const t of tools) {
        if (!t.warnAt || !inLane(t, npc, HALF + (t.firedSurge ? 14 : 0))) continue;
        const side = Math.sin(Math.atan2(npc.y - t.y, npc.x - t.x) - t.aim) >= 0 ? 1 : -1;
        return { x: clamp(npc.x + Math.cos(t.aim + side * Math.PI / 2) * 110, 50, W - 50), y: clamp(npc.y + Math.sin(t.aim + side * Math.PI / 2) * 110, top + 40, H - 40) };
      }
      // Go and pinch the hose whose lane runs nearest the stranger.
      let best: Pt | null = null, bs = Infinity;
      for (const t of tools) {
        if (ctx.scene.time.now < t.deadUntil) continue;
        const e = laneEnd(t);
        const ld = segDist(player.x, player.y, t.x, t.y, e.x, e.y);
        const p = pinchPt(t, npc);
        const s = ld * 1.5 + dist(npc.x, npc.y, p.x, p.y);
        if (s < bs && dist(npc.x, npc.y, p.x, p.y) < 380) { bs = s; best = p; }
      }
      return best;
    },

    drawGround(g, time) {
      // Lanes being called: chalk edges and grit already lifting.
      for (const t of tools) {
        if (!t.warnAt && time - t.firedAt > 300) continue;
        const e = laneEnd(t);
        const half = t.firedSurge ? HALF + 14 : HALF;
        const nx = -Math.sin(t.aim) * half, ny = Math.cos(t.aim) * half;
        if (t.warnAt) {
          const k = clamp((time - t.warnAt) / Math.max(1, t.fireAt - t.warnAt), 0, 1);
          g.fillStyle(t.firedSurge ? ROUGE : 0xffffff, 0.06 + 0.12 * k);
          g.fillPoints([{ x: t.x + nx, y: t.y + ny }, { x: e.x + nx, y: e.y + ny }, { x: e.x - nx, y: e.y - ny }, { x: t.x - nx, y: t.y - ny }], true);
          g.lineStyle(2, t.firedSurge ? ROUGE : LIME_DARK, 0.7);
          g.lineBetween(t.x + nx, t.y + ny, e.x + nx, e.y + ny); g.lineBetween(t.x - nx, t.y - ny, e.x - nx, e.y - ny);
        } else {
          // The gust itself: grit streaks racing down the lane.
          const k = clamp((time - t.firedAt) / 300, 0, 1);
          for (let i = 0; i < 26; i++) {
            const d = ((i * 47) % 900) + k * 200;
            const w = Math.sin(i * 3.1) * half * 0.9;
            const px = t.x + Math.cos(t.aim) * d - Math.sin(t.aim) * w, py = t.y + Math.sin(t.aim) * d + Math.cos(t.aim) * w;
            g.lineStyle(2, STEAM, 0.8 * (1 - k)); g.lineBetween(px, py, px - Math.cos(t.aim) * 26, py - Math.sin(t.aim) * 26);
          }
        }
      }
      drawReceiver(g, C, tools.reduce((m, t) => Math.max(m, t.pressure), 0), time, hot);
      for (const t of tools) drawHose(g, t, time, t.pinchers.size ? [...t.pinchers].map((f) => pinchPt(t, f)) : [], time < t.deadUntil);
      for (const t of tools) drawNozzle(g, t, time);
    },

    drawAir(g, time) {
      for (const t of tools) {
        if (!t.burstAtPt || time - t.burstAt > 700) continue;
        const k = (time - t.burstAt) / 700;
        const p = t.burstAtPt;
        g.fillStyle(STEAM, 0.6 * (1 - k)); g.fillCircle(p.x, p.y - k * 20, 14 + k * 40);
        for (let i = 0; i < 8; i++) {
          const a = i * 0.785 + p.x;
          g.fillStyle(SOOT, 1 - k); g.fillRect(p.x + Math.cos(a) * k * 50, p.y + Math.sin(a) * k * 36 - k * 10, 5, 3);
        }
      }
    },

    drawHud(g) {
      tools.forEach((t, i) => {
        const x = W / 2 - 66 + i * 44, y = top + 6;
        hudPlate(g, x - 18, y - 2, 36, 36);
        gauge(g, x, y + 16, 13, t.pressure, ctx.scene.time.now < t.deadUntil);
      });
    },
  };
}

/** A round pressure gauge: white face, green-to-red arc, brass bezel, a needle. */
function gauge(g: G, x: number, y: number, r: number, p: number, dead: boolean): void {
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, r + 2);
  g.fillStyle(dead ? 0x8a8a8a : 0xf4f0e6, 1); g.fillCircle(x, y, r);
  const a0 = Math.PI * 0.75, span = Math.PI * 1.5;
  g.lineStyle(3, 0x6aa060, 1); g.beginPath(); g.arc(x, y, r - 3, a0, a0 + span * 0.6, false); g.strokePath();
  g.lineStyle(3, ROUGE, 1); g.beginPath(); g.arc(x, y, r - 3, a0 + span * 0.82, a0 + span, false); g.strokePath();
  const a = a0 + span * p;
  g.lineStyle(1.5, SOOT, 1); g.lineBetween(x, y, x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2));
  g.fillStyle(SOOT, 1); g.fillCircle(x, y, 2);
}

/** The air receiver on the north wall: a riveted iron tank with a flywheel pump and the main gauge. */
function drawReceiver(g: G, c: Pt, p: number, time: number, hot: boolean): void {
  const { x, y } = c;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 22, 170, 22);
  g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x - 72, y - 22, 144, 40, 18);
  g.fillStyle(hot ? mixC(IRON, ROUGE, 0.25) : IRON, 1); g.fillRoundedRect(x - 70, y - 24, 140, 38, 17);
  g.fillStyle(IRON_LIT, 0.6); g.fillRoundedRect(x - 62, y - 20, 124, 6, 3);
  for (let i = -3; i <= 3; i++) rivet(g, x + i * 18, y + 8, IRON_LIT, 1.8);
  for (const s of [-1, 1]) { g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x + s * 40, y - 24, x + s * 40, y + 14); }
  // Flywheel pump.
  const fa = time / (hot ? 70 : 110);
  g.lineStyle(4, IRON_DARK, 1); g.strokeCircle(x - 96, y - 2, 16);
  g.lineStyle(2, IRON_LIT, 1); g.strokeCircle(x - 96, y - 3, 16);
  for (let i = 0; i < 4; i++) g.lineBetween(x - 96, y - 3, x - 96 + Math.cos(fa + i * 1.57) * 15, y - 3 + Math.sin(fa + i * 1.57) * 15);
  g.lineStyle(3, IRON, 1); g.lineBetween(x - 96 + Math.cos(fa) * 10, y - 3 + Math.sin(fa) * 10, x - 72, y - 6);
  gauge(g, x + 92, y - 6, 14, p, false);
  if (hot) glow(g, x, y, 60, ROUGE, 0.04, 3);
}

/** A hose: black rubber with brass couplings, swelling and reddening upstream of every boot on it. */
function drawHose(g: G, t: Tool, time: number, pinches: Pt[], dead: boolean): void {
  const swell = t.pressure;
  const flap = dead ? Math.sin(time / 40) * 3 : 0;
  const pts = t.hose.map((p, i) => ({ x: p.x + (i > 0 && i < t.hose.length - 1 ? flap : 0), y: p.y }));
  stroke(g, pts.map((p) => ({ x: p.x, y: p.y + 3 })), 11, 0x000000, 0.18);
  stroke(g, pts, 10 + swell * 4, mixC(0x2a2624, ROUGE, swell * 0.5), 1);
  stroke(g, pts.map((p) => ({ x: p.x - 1, y: p.y - 2 })), 2, lit(0x2a2624, 0.3), 0.8);
  for (let i = 1; i < t.hose.length - 1; i++) {
    const p = pts[i];
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(p.x, p.y, 7);
    g.fillStyle(BRASS, 1); g.fillCircle(p.x, p.y - 1, 5);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(p.x - 1.5, p.y - 2.5, 1.6);
  }
  // The bulge behind each boot.
  for (const p of pinches) {
    const r = 7 + swell * 9 + Math.sin(time / 70) * 1.2 * swell;
    g.fillStyle(mixC(0x2a2624, ROUGE, swell * 0.7), 1); g.fillEllipse(p.x, p.y, r * 2.2, r * 1.6);
    g.fillStyle(lit(mixC(0x2a2624, ROUGE, swell * 0.7), 0.3), 1); g.fillEllipse(p.x - r * 0.3, p.y - r * 0.4, r * 0.8, r * 0.4);
  }
}

/** A blower nozzle on a tripod, barrel along its lane, a tiny gauge of its own. */
function drawNozzle(g: G, t: Tool, time: number): void {
  const shake = t.warnAt ? Math.sin(time / 25) * (t.firedSurge ? 2.5 : 1.2) : 0;
  const x = t.x + shake, y = t.y;
  g.lineStyle(3, IRON_DARK, 1);
  for (let i = 0; i < 3; i++) { const a = t.aim + Math.PI + (i - 1) * 0.9; g.lineBetween(x, y, x + Math.cos(a) * 18, y + Math.sin(a) * 18 + 8); }
  const bx = x + Math.cos(t.aim) * 26, by = y + Math.sin(t.aim) * 26;
  g.lineStyle(12, BRASS_DARK, 1); g.lineBetween(x, y - 6, bx, by - 6);
  g.lineStyle(9, BRASS, 1); g.lineBetween(x, y - 7, bx, by - 7);
  g.lineStyle(2, BRASS_LIT, 1); g.lineBetween(x, y - 10, bx, by - 10);
  g.fillStyle(SOOT, 1); g.fillCircle(bx, by - 6, 5);
  g.fillStyle(dim(SOOT, 0.5), 1); g.fillCircle(bx, by - 6, 3);
  gauge(g, x - Math.cos(t.aim) * 10, y - 20, 6, t.pressure, false);
}

export const PINCH: GimmickDef = {
  id: ID,
  rules: 'Air tools gust down chalked lanes. Stand on a hose to choke its tool and bank a surge; step off to fire it down the lane. Hold too long: it bursts.',
  make,
};
