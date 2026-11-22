import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { lightShaft, poly } from '../art';
import { BRASS, BRASS_DARK, FLAG, FLAG_DARK, QUARTZ, QUARTZ_DARK, QUARTZ_LIT, SPECTRUM, SUNSHAFT } from '../palette';
import { alive, clamp, dist, segCross, segDist, stepDt } from '../util';

/**
 * Refraction — Lapidary Prism.
 *
 * Noon light falls through the crack in the geode's roof onto the master prism at the head of
 * the floor, which splits it into three coloured beams — red, green, violet — that run out across
 * the room. Wherever a beam meets another prism it is bent along that prism's face. A beam burns
 * whoever stands in it; where two colours cross they recombine into white light, which burns
 * worse. The master prism turns slowly on its own, so the fan sweeps.
 *
 * Strike any prism and it turns a twelfth of a circle, re-routing everything downstream (a
 * re-routed beam runs cold for half a second before it bites — that is the tell). Lapidary Prism
 * turns them to put the light on you. Turn them first and put it on him.
 */

const PRISM_R = 24;
/** How near a prism the bot stands to strike it, and keeps its dark spots clear of. */
const NEAR_R = PRISM_R + 24;
/** A prism turns once per blow, with a beat between so one blast is one turn. */
const TURN_CD = 350;
const BEAM_W = 13;
const TICK_MS = 340;
const COLD_MS = 520;
/** The three colours the master prism splits into (indices into SPECTRUM). */
const SPLIT = [0, 3, 5];

interface Prism { x: number; y: number; a: number; master: boolean; turnedAt: number; spin: number }
interface Beam { pts: Pt[]; color: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const dmg = ctx.hard ? 6 : 5;
  const whiteDmg = ctx.hard ? 10 : 8;
  const sun: Pt = { x: W / 2, y: top - 4 };
  const prisms: Prism[] = [
    { x: W / 2, y: top + 92, a: Math.PI / 2, master: true, turnedAt: -9999, spin: 0 },
    { x: 170, y: top + 200, a: 0.2, master: false, turnedAt: -9999, spin: 0 },
    { x: W - 170, y: top + 200, a: Math.PI - 0.2, master: false, turnedAt: -9999, spin: 0 },
    { x: 290, y: H - 130, a: -0.5, master: false, turnedAt: -9999, spin: 0 },
    { x: W - 290, y: H - 130, a: Math.PI + 0.5, master: false, turnedAt: -9999, spin: 0 },
    { x: W / 2, y: top + 330, a: Math.PI / 2, master: false, turnedAt: -9999, spin: 0 },
  ];
  let beams: Beam[] = [];
  let whites: Pt[] = [];
  /** When the beam layout last changed; beams run cold for COLD_MS after. */
  let coldUntil = 0;
  const nextTick = new Map<Fighter, number>([[player, 0], [npc, 0]]);

  /** Trace one coloured beam out of a prism; bends at further prisms, three bends at most. */
  function trace(x: number, y: number, a: number, from: Prism, color: number, depth: number, out: Beam[], ps: Prism[]): void {
    const dx = Math.cos(a), dy = Math.sin(a);
    // Distance to the arena edge.
    const tx = dx > 0 ? (W - x) / dx : dx < 0 ? -x / dx : Infinity;
    const ty = dy > 0 ? (H - y) / dy : dy < 0 ? (top - y) / dy : Infinity;
    let tEnd = Math.min(tx, ty);
    let hit: Prism | null = null;
    for (const p of ps) {
      if (p === from) continue;
      const t = (p.x - x) * dx + (p.y - y) * dy;
      if (t <= 8 || t >= tEnd) continue;
      const perp = Math.abs((p.x - x) * dy - (p.y - y) * dx);
      if (perp < PRISM_R) { tEnd = t; hit = p; }
    }
    const end = hit ? { x: hit.x, y: hit.y } : { x: x + dx * tEnd, y: y + dy * tEnd };
    out.push({ pts: [{ x, y }, end], color });
    if (hit && depth < 3) trace(hit.x, hit.y, hit.a, hit, color, depth + 1, out, ps);
  }

  function layout(ps: Prism[]): { beams: Beam[]; whites: Pt[] } {
    const m = ps[0];
    const bs: Beam[] = [{ pts: [sun, { x: m.x, y: m.y }], color: SUNSHAFT }];
    SPLIT.forEach((ci, i) => trace(m.x, m.y, m.a + (i - 1) * 0.52, m, SPECTRUM[ci], 0, bs, ps));
    const ws: Pt[] = [];
    for (let i = 1; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        if (bs[i].color === bs[j].color) continue;
        const [a0, a1] = bs[i].pts, [b0, b1] = bs[j].pts;
        const c = segCross(a0.x, a0.y, a1.x, a1.y, b0.x, b0.y, b1.x, b1.y);
        if (c && !ps.some((p) => dist(p.x, p.y, c.x, c.y) < PRISM_R + 6)) ws.push(c);
      }
    }
    return { beams: bs, whites: ws };
  }

  const inBeam = (bs: Beam[], x: number, y: number, pad = 0) =>
    bs.some((b, i) => i > 0 && segDist(x, y, b.pts[0].x, b.pts[0].y, b.pts[1].x, b.pts[1].y) < BEAM_W + pad);

  function turn(p: Prism, time: number, by: Fighter): void {
    p.a += Math.PI / 6;
    p.turnedAt = time;
    p.spin = time;
    coldUntil = time + COLD_MS;
    ctx.sfx('prism');
    ctx.float(p.x, p.y - 44, by === player ? 'TURNED' : 'PRISM TURNS IT', by === player ? '#e8f4ff' : '#ffc8f0');
  }

  const bodies = prisms.map((p) => ctx.target({
    x: p.x, y: p.y - 12, r: PRISM_R,
    onStruck: (by) => {
      const time = ctx.scene.time.now;
      if (time - p.turnedAt >= TURN_CD) turn(p, time, by === 'player' ? player : npc);
    },
  }));

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      // The master prism turns with the sun.
      const m = prisms[0];
      m.a += dt * (ctx.hard ? 0.16 : 0.12) * Math.sin(time / 9000 + 0.6);
      ({ beams, whites } = layout(prisms));
      if (time < coldUntil) return;
      // Burn whoever stands in the light.
      for (const f of [player, npc]) {
        if (!alive(f) || time < (nextTick.get(f) ?? 0)) continue;
        const white = whites.some((w) => dist(w.x, w.y, f.x, f.y) < 30);
        if (white || inBeam(beams, f.x, f.y)) {
          nextTick.set(f, time + TICK_MS);
          ctx.hit(f, white ? whiteDmg : dmg, f.x, f.y);
          if (white) ctx.float(f.x, f.y - 40, 'WHITE LIGHT', '#ffffff');
          ctx.sfx('sizzle');
        }
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // A prism he can turn to put a beam on you: go and strike it.
      for (let i = 0; i < prisms.length; i++) {
        const p = prisms[i];
        if (ctx.scene.time.now - p.turnedAt < TURN_CD * 2) continue;
        const trial = prisms.map((q) => (q === p ? { ...q, a: q.a + Math.PI / 6 } : q));
        const now = layout(prisms), next = layout(trial);
        if (!inBeam(now.beams, player.x, player.y, 6) && inBeam(next.beams, player.x, player.y, 6)) {
          const a = Math.atan2(npc.y - p.y, npc.x - p.x);
          return { x: p.x + Math.cos(a) * (NEAR_R - 10), y: p.y + Math.sin(a) * (NEAR_R - 10) };
        }
      }
      // Otherwise a dark spot at casting range.
      let best: Pt | null = null, bs = -Infinity;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const x = clamp(player.x + Math.cos(a) * 250, 60, W - 60), y = clamp(player.y + Math.sin(a) * 210, top + 50, H - 40);
        let s = -dist(x, y, npc.x, npc.y) * 0.3;
        if (inBeam(beams, x, y, 26)) s -= 400;
        if (whites.some((w) => dist(w.x, w.y, x, y) < 60)) s -= 400;
        if (prisms.some((p) => dist(p.x, p.y, x, y) < NEAR_R + 10)) s -= 120;
        if (s > bs) { bs = s; best = { x, y }; }
      }
      return best;
    },

    destroy() { for (const b of bodies) b.remove(); },

    drawGround(g, time) {
      const cold = time < coldUntil;
      // The light on the floor: each beam a coloured wash with a hot core.
      for (let i = 0; i < beams.length; i++) {
        const b = beams[i];
        const [a, e] = b.pts;
        if (i === 0) { lightShaft(g, a.x, a.y, dist(a.x, a.y, e.x, e.y), 22, Math.atan2(e.y - a.y, e.x - a.x), time / 1000, 0.12); continue; }
        if (cold) {
          for (let d = 0; d < dist(a.x, a.y, e.x, e.y); d += 18) {
            const t = d / Math.max(1, dist(a.x, a.y, e.x, e.y));
            g.fillStyle(b.color, 0.35); g.fillCircle(a.x + (e.x - a.x) * t, a.y + (e.y - a.y) * t, 2.5);
          }
          continue;
        }
        const flick = 0.85 + Math.sin(time / 60 + i) * 0.15;
        g.lineStyle(BEAM_W * 2.4, b.color, 0.12 * flick); g.lineBetween(a.x, a.y, e.x, e.y);
        g.lineStyle(BEAM_W * 1.2, b.color, 0.4 * flick); g.lineBetween(a.x, a.y, e.x, e.y);
        g.lineStyle(3, lit(b.color, 0.7), 0.9); g.lineBetween(a.x, a.y, e.x, e.y);
        // Where it strikes the wall, a splash of colour.
        g.fillStyle(b.color, 0.3); g.fillEllipse(e.x, e.y, 34, 16);
      }
      if (!cold) {
        for (const w of whites) {
          glow(g, w.x, w.y, 34, 0xffffff, 0.08, 3);
          g.fillStyle(0xffffff, 0.75 + Math.sin(time / 50) * 0.2); g.fillCircle(w.x, w.y, 7);
          g.lineStyle(1.5, 0xffffff, 0.6); g.strokeCircle(w.x, w.y, 24 + Math.sin(time / 90) * 3);
        }
      }
      // Prism plinths.
      for (const p of prisms) {
        g.fillStyle(FLAG_DARK, 1); g.fillEllipse(p.x, p.y + 6, 58, 22);
        g.fillStyle(FLAG, 1); g.fillEllipse(p.x, p.y + 3, 52, 18);
      }
    },

    drawAir(g, time) {
      for (const p of prisms) {
        const spin = clamp((time - p.spin) / 300, 0, 1);
        const a = p.a - (1 - spin) * (Math.PI / 6);
        // A triangular prism seen from above, its exit face toward `a`.
        const pts: Pt[] = [0, 1, 2].map((k) => {
          const b = a + Math.PI + (k - 1) * (Math.PI * 2 / 3);
          return { x: p.x + Math.cos(b) * PRISM_R, y: p.y - 18 + Math.sin(b) * PRISM_R * 0.7 };
        });
        g.fillStyle(0x000000, 0.18); g.fillEllipse(p.x + 4, p.y + 4, PRISM_R * 2, PRISM_R * 0.8);
        // Body (a little extruded upward).
        poly(g, pts.map((q) => ({ x: q.x, y: q.y + 12 })), QUARTZ_DARK, 0.85);
        poly(g, pts, p.master ? QUARTZ_LIT : QUARTZ, 0.85);
        g.lineStyle(1.5, QUARTZ_LIT, 0.9); g.strokePoints(pts, true);
        // The exit face glints in the outgoing colour.
        const ex = p.x + Math.cos(a) * PRISM_R * 0.5, ey = p.y - 18 + Math.sin(a) * PRISM_R * 0.35;
        g.fillStyle(p.master ? 0xffffff : SPECTRUM[(prisms.indexOf(p) * 2) % SPECTRUM.length], 0.7); g.fillCircle(ex, ey, 3);
        // A brass collar.
        g.fillStyle(BRASS_DARK, 1); g.fillRect(p.x - 8, p.y - 6, 16, 5);
        g.fillStyle(BRASS, 1); g.fillRect(p.x - 8, p.y - 6, 16, 2);
        if (time - p.turnedAt < 500) {
          const k = (time - p.turnedAt) / 500;
          g.lineStyle(2, 0xffffff, 1 - k); g.strokeCircle(p.x, p.y - 10, 20 + k * 30);
        }
      }
      // The crack the light comes through, under the HUD's edge.
      g.fillStyle(0xffffff, 0.6); g.fillTriangle(sun.x - 22, top, sun.x + 22, top, sun.x, top + 10);
    },

    drawHud(g, time) {
      if (time >= coldUntil) return;
      const k = (coldUntil - time) / COLD_MS;
      g.fillStyle(0x000000, 0.4); g.fillRoundedRect(W / 2 - 60, top + 8, 120, 10, 5);
      g.fillStyle(SUNSHAFT, 0.9); g.fillRoundedRect(W / 2 - 58, top + 10, 116 * k, 6, 3);
    },
  };
}

export const REFRACTION: GimmickDef = {
  id: 'geode-refraction',
  rules: 'Noon light splits through prisms into burning beams; crossed colours burn white. Strike a prism to turn it and re-route the light.',
  make,
};
