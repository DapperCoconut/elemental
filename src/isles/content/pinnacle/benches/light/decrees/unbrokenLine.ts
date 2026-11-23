import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import type { G } from '../../../../../art/IsleArt';
import { OBS, starGlow } from '../../../../../art/PinnacleArt';
import { NOON, sunShaft } from '../art';
import { Motion, SIDE, WHO, type Who, alive, clamp, dist, fighterOf, onFloor, stepDt } from './util';

/**
 * DECREE OF THE UNBROKEN LINE — Councilor Aurelia Glaze, Seat of Noon (Light).
 *
 * She drafted Clarity: light goes straight, and so must everyone in it. Sunbeams pour down
 * through the cracked ceiling and lie across the floor as long gold lanes — two at a time,
 * three in hard — re-poured at a new angle every ten seconds (each new lane shows first as a
 * flickering thread). The law of a lane:
 *   - RIDE it (move along it, not across it) and you are quickened: +35% speed, cooldowns 35%
 *     faster. Her car lives in them.
 *   - STAND STILL in it and you are SEEN: the glare closes on you and a pillar of noon falls
 *     where you stood (telegraphed) — a rooted Supernova in a lane is a confession.
 *   - Two lanes cross at the MERIDIAN KNOT: ride through it and your next blows land 35% harder
 *     for a few seconds.
 * The trick: she cannot resist a lane. She drives every one of them end to end *at you*, on a
 * line you can see — stand a step off the lane's edge and let the car go by.
 */

interface Lane { x: number; y: number; a: number; born: number; liveAt: number; fadeAt: number }
interface Pillar { x: number; y: number; at: number; who: Who }

const HW = 34;
const RIDE_COS = Math.cos((35 * Math.PI) / 180);

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const POUR = ctx.hard ? 8500 : 10000;
  const FADE = 700;
  const PILLAR_DMG = ctx.hard ? 18 : 15;
  const KNOT_MS = 3000;
  const lanes: Lane[] = [];
  const pillars: Pillar[] = [];
  const motion: Record<Who, Motion> = { player: new Motion(), npc: new Motion() };
  const glare: Record<Who, number> = { player: 0, npc: 0 };
  const glareCool: Record<Who, number> = { player: 0, npc: 0 };
  const riding: Record<Who, boolean> = { player: false, npc: false };
  const knotUntil: Record<Who, number> = { player: 0, npc: 0 };
  const knotGate: Record<Who, number> = { player: 0, npc: 0 };
  const trail: Record<Who, { x: number; y: number }[]> = { player: [], npc: [] };
  let knot: { x: number; y: number } | null = null;
  let nextPour = 0;
  let started = false;

  const live = (l: Lane, now: number) => now >= l.liveAt && now < l.fadeAt;
  const perp = (l: Lane, x: number, y: number) => Math.abs(-(x - l.x) * Math.sin(l.a) + (y - l.y) * Math.cos(l.a));
  const laneOf = (x: number, y: number, now: number): Lane | null => {
    let best: Lane | null = null, bd = HW;
    for (const l of lanes) { if (!live(l, now)) continue; const d = perp(l, x, y); if (d < bd) { bd = d; best = l; } }
    return best;
  };

  /** Pour the next set: two lanes through one knot, crossing at a good angle; a third in hard. */
  function pour(now: number): void {
    for (const l of lanes) if (l.fadeAt > now + ctx.tk.warn(1800)) l.fadeAt = now + ctx.tk.warn(1800) + FADE;
    const liveAt = now + ctx.tk.warn(1800);
    const k = { x: W * (0.3 + rng() * 0.4), y: top + (H - top) * (0.3 + rng() * 0.4) };
    const a1 = rng() * Math.PI;
    const a2 = a1 + (Math.PI / 3) + rng() * (Math.PI / 3);
    lanes.push({ x: k.x, y: k.y, a: a1, born: now, liveAt, fadeAt: Infinity });
    lanes.push({ x: k.x, y: k.y, a: a2, born: now, liveAt, fadeAt: Infinity });
    if (ctx.hard) lanes.push({ x: W * (0.2 + rng() * 0.6), y: top + (H - top) * (0.2 + rng() * 0.6), a: a1 + Math.PI / 2, born: now, liveAt, fadeAt: Infinity });
    knot = k;
    ctx.sfx('light-beam');
    ctx.banner('THE LIGHT IS RE-POURED', '#fff2b0');
  }

  function fall(p: Pillar): void {
    ctx.sfx('judgement');
    ctx.flash(p.x, p.y, NOON.starCore);
    for (const w of WHO) {
      const f = fighterOf(ctx, w);
      if (!alive(f) || dist(f.x, f.y, p.x, p.y) > 50) continue;
      ctx.hit(f, PILLAR_DMG, f.x, f.y);
      ctx.float(f.x, f.y - 50, 'SEEN', '#fffbea');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextPour = time + 1600; }
      if (time >= nextPour) { pour(time); nextPour = time + POUR; }
      for (let i = lanes.length - 1; i >= 0; i--) if (time > lanes[i].fadeAt) lanes.splice(i, 1);

      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        const m = motion[w];
        m.sample(f, dt);
        riding[w] = false;
        if (!alive(f)) continue;
        const l = laneOf(f.x, f.y, time);
        if (l) {
          const aligned = Math.abs(Math.cos(m.heading - l.a)) > RIDE_COS && m.speed > 70;
          riding[w] = aligned;
          if (m.speed < 30 && time >= glareCool[w]) glare[w] += dt / 0.9;
          else glare[w] = Math.max(0, glare[w] - dt * 1.6);
        } else glare[w] = Math.max(0, glare[w] - dt * 2.2);
        if (glare[w] >= 1) {
          glare[w] = 0;
          glareCool[w] = time + 1800;
          pillars.push({ x: f.x, y: f.y, at: time + ctx.tk.warn(650), who: w });
          ctx.sfx('beam-charge');
        }
        // Through the knot at a ride: the Meridian.
        if (riding[w] && knot && dist(f.x, f.y, knot.x, knot.y) < 34 && time >= knotGate[w]) {
          knotGate[w] = time + 2500;
          knotUntil[w] = time + KNOT_MS;
          ctx.float(f.x, f.y - 52, 'MERIDIAN', w === 'player' ? '#fff2b0' : '#c9b0ff');
          ctx.sfx('holy-chord');
        }
        const tr = trail[w];
        if (riding[w]) { tr.push({ x: f.x, y: f.y }); if (tr.length > 14) tr.shift(); } else if (tr.length) tr.shift();
      }
      for (let i = pillars.length - 1; i >= 0; i--) if (time >= pillars[i].at) { fall(pillars[i]); pillars.splice(i, 1); }
    },

    playerSpeedMult() { return riding.player ? 1.35 : 1; },
    npcSpeedMult() { return riding.npc ? 1.35 : 1; },
    playerCooldownRate() { return riding.player ? 1.35 : 1; },
    npcCooldownRate() { return riding.npc ? 1.35 : 1; },
    playerTakenMult() { return ctx.scene.time.now < knotUntil.npc ? 1.35 : 1; },
    npcTakenMult() { return ctx.scene.time.now < knotUntil.player ? 1.35 : 1; },

    npcSeek() {
      const now = ctx.scene.time.now;
      const n = ctx.npc, p = ctx.player;
      // Get off a pillar's mark first.
      for (const pl of pillars) if (dist(n.x, n.y, pl.x, pl.y) < 60) return onFloor(ctx, n.x + (n.x - pl.x || 1) * 2, n.y + (n.y - pl.y) * 2);
      let best: Lane | null = null, bd = Infinity;
      for (const l of lanes) { if (!live(l, now)) continue; const d = perp(l, n.x, n.y); if (d < bd) { bd = d; best = l; } }
      if (!best) return null;
      const dx = Math.cos(best.a), dy = Math.sin(best.a);
      // Onto the lane where it is nearest, then down it toward wherever the player stands on it.
      const tn = (n.x - best.x) * dx + (n.y - best.y) * dy;
      const tp = (p.x - best.x) * dx + (p.y - best.y) * dy;
      const dir = tp >= tn ? 1 : -1;
      const ahead = bd < HW * 0.7 ? 240 : 60;
      // Through the knot when it lies on the way.
      if (knot && bd < HW && Math.sign((knot.x - n.x) * dx * dir + (knot.y - n.y) * dy * dir) > 0 && now >= knotGate.npc) return knot;
      return onFloor(ctx, best.x + dx * (tn + dir * ahead), best.y + dy * (tn + dir * ahead));
    },

    drawGround(g, time) {
      const t = time / 1000;
      for (const l of lanes) drawLane(g, l, time, t);
      if (knot && lanes.some((l) => live(l, time))) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 4);
        g.lineStyle(2, NOON.brass, 0.7); g.strokeCircle(knot.x, knot.y, 34);
        g.lineStyle(1, NOON.gold, 0.4 + pulse * 0.4); g.strokeCircle(knot.x, knot.y, 38 + pulse * 4);
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + t * 0.4;
          g.fillStyle(NOON.gold, 0.8);
          g.fillTriangle(knot.x + Math.cos(a) * 44, knot.y + Math.sin(a) * 44, knot.x + Math.cos(a + 0.12) * 30, knot.y + Math.sin(a + 0.12) * 30, knot.x + Math.cos(a - 0.12) * 30, knot.y + Math.sin(a - 0.12) * 30);
        }
      }
      for (const p of pillars) {
        const k = clamp(1 - (p.at - time) / ctx.tk.warn(650), 0, 1);
        g.fillStyle(NOON.starCore, 0.08 + k * 0.22); g.fillCircle(p.x, p.y, 50);
        g.lineStyle(2, NOON.starCore, 0.9); g.strokeCircle(p.x, p.y, 50 - k * 6);
        g.lineStyle(1, NOON.starDeep, 0.8); g.beginPath(); g.arc(p.x, p.y, 56, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // Riders: gold speed-streaks behind them.
      for (const w of WHO) {
        const tr = trail[w];
        for (let i = 1; i < tr.length; i++) {
          g.lineStyle(2 + i * 0.5, SIDE[w], (i / tr.length) * 0.5);
          g.lineBetween(tr[i - 1].x, tr[i - 1].y, tr[i].x, tr[i].y);
        }
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        // Glare closing on whoever stands still in the light: an iris of white tightening.
        if (glare[w] > 0.05) {
          const r = 44 - glare[w] * 26;
          g.lineStyle(2, NOON.starCore, 0.3 + glare[w] * 0.6); g.strokeCircle(f.x, f.y, r);
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + t;
            g.lineStyle(1.5, NOON.gold, glare[w] * 0.8);
            g.lineBetween(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, f.x + Math.cos(a) * (r + 8), f.y + Math.sin(a) * (r + 8));
          }
        }
        if (time < knotUntil[w]) {
          const k = (knotUntil[w] - time) / KNOT_MS;
          starGlow(g, f.x, f.y - 34, 3.5, t, 0.5 + k * 0.5);
        }
      }
      // A falling pillar of noon: a column out of the top of the screen, onto the mark.
      for (const p of pillars) {
        const left = p.at - time;
        if (left > 260) continue;
        const k = 1 - left / 260;
        sunShaft(g, p.x, top - 20, p.x, p.y, 30 * k, 90 * k, 1.4);
      }
    },

    drawHud(g, time) {
      // The pour clock: a sun crossing a little brass meridian toward the next re-pour.
      const cx = ctx.W / 2, cy = top + 18;
      const k = clamp(1 - (nextPour - time) / POUR, 0, 1);
      g.fillStyle(OBS.glass, 0.85); g.fillRoundedRect(cx - 110, cy - 10, 220, 20, 8);
      g.lineStyle(1.5, NOON.brass, 0.9); g.strokeRoundedRect(cx - 110, cy - 10, 220, 20, 8);
      g.lineStyle(1, NOON.brass, 0.6); g.lineBetween(cx - 96, cy, cx + 96, cy);
      for (let i = 0; i <= 6; i++) g.lineBetween(cx - 96 + i * 32, cy - 4, cx - 96 + i * 32, cy + 4);
      const sx = cx - 96 + k * 192;
      g.fillStyle(NOON.gold, 0.3); g.fillCircle(sx, cy, 9);
      g.fillStyle(NOON.starCore, 1); g.fillCircle(sx, cy, 5);
    },
  };

  /** A lane: a band of light across the whole floor; as a thread first, then poured full width. */
  function drawLane(g: G, l: Lane, time: number, t: number): void {
    const dx = Math.cos(l.a), dy = Math.sin(l.a);
    const L = Math.hypot(W, H);
    const x0 = l.x - dx * L, y0 = l.y - dy * L, x1 = l.x + dx * L, y1 = l.y + dy * L;
    const nx = -dy, ny = dx;
    if (time < l.liveAt) {
      // The thread: a thin flicker that widens as the pour comes.
      const k = clamp(1 - (l.liveAt - time) / ctx.tk.warn(1800), 0, 1);
      const flick = Math.floor(time / 90) % 2 ? 0.9 : 0.5;
      g.lineStyle(1 + k * 3, NOON.gold, (0.3 + k * 0.5) * flick); g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(1, NOON.gold, 0.25 * k);
      g.lineBetween(x0 + nx * HW * k, y0 + ny * HW * k, x1 + nx * HW * k, y1 + ny * HW * k);
      g.lineBetween(x0 - nx * HW * k, y0 - ny * HW * k, x1 - nx * HW * k, y1 - ny * HW * k);
      return;
    }
    const fade = l.fadeAt === Infinity ? 1 : clamp((l.fadeAt - time) / FADE, 0, 1);
    for (let i = 3; i >= 0; i--) {
      const w = HW * (1 + i * 0.22);
      g.fillStyle(i === 0 ? NOON.beam : NOON.gold, (i === 0 ? 0.16 : 0.05) * fade);
      g.fillPoints([
        { x: x0 + nx * w, y: y0 + ny * w }, { x: x1 + nx * w, y: y1 + ny * w },
        { x: x1 - nx * w, y: y1 - ny * w }, { x: x0 - nx * w, y: y0 - ny * w },
      ], true);
    }
    g.lineStyle(1.5, NOON.starCore, 0.55 * fade);
    g.lineBetween(x0 + nx * HW, y0 + ny * HW, x1 + nx * HW, y1 + ny * HW);
    g.lineBetween(x0 - nx * HW, y0 - ny * HW, x1 - nx * HW, y1 - ny * HW);
    // Motes riding the beam, one way, so the lane reads as running light.
    for (let i = 0; i < 16; i++) {
      const s = (((t * 120 + i * 97) % (L * 2)) - L) * 0.6;
      const off = Math.sin(i * 2.3) * HW * 0.7;
      const px = l.x + dx * s + nx * off, py = l.y + dy * s + ny * off;
      if (px < 0 || px > W || py < top || py > H) continue;
      g.fillStyle(NOON.starCore, 0.7 * fade); g.fillCircle(px, py, 1.6);
      g.lineStyle(1, NOON.gold, 0.4 * fade); g.lineBetween(px, py, px - dx * 10, py - dy * 10);
    }
    // Chevrons along the edge: which way the light runs (both, it does not care).
    for (let s = -L; s < L; s += 90) {
      const px = l.x + dx * s, py = l.y + dy * s;
      if (px < 0 || px > W || py < top || py > H) continue;
      g.fillStyle(NOON.gold, 0.35 * fade);
      g.fillTriangle(px + nx * (HW - 4), py + ny * (HW - 4), px + nx * (HW - 4) - dx * 10 + nx * -6, py + ny * (HW - 4) - dy * 10 + ny * -6, px + nx * (HW - 4) + dx * 10 + nx * -6, py + ny * (HW - 4) + dy * 10 + ny * -6);
    }
  }
}

export const UNBROKEN_LINE: GimmickDef = {
  id: 'bench-light-unbroken-line',
  rules: 'Light runs straight: who rides a sunbeam is quickened, who stands still in one is seen and struck; who rides through the knot strikes harder.',
  make,
};
