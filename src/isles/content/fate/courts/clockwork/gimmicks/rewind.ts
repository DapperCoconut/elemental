import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim } from '../../../../../art/IsleArt';
import { dial } from '../art';
import { BLUED_LIT, BRASS, BRASS_LIT, ENAMEL, GILT, NUMERAL } from '../palette';
import { alive, clamp, dist, otherOf, segDist } from '../util';

/**
 * Rewind — Horologist Reprise.
 *
 * Reprise's floor is one great clock face, and every few seconds it strikes. When it does the
 * room runs backwards: both fighters snap back to where they stood three seconds before (keeping
 * the health they have now), and every shot in the air turns round and flies back at whoever
 * fired it. A brass ghost always walks three seconds behind each of you, showing exactly where
 * the strike will put you down, and the last few ticks are counted out loud.
 *
 * Snapping back is not gentle. You are dragged along the line from where you are to where you
 * were, and if your foe is standing on that line, time runs you through them. So: walk where you
 * want to land, then step to the far side of your foe before the bell. Reprise plays it the
 * same way — and he knows not to fire just before the strike. Do you?
 */

const DELAY_MS = 3000;
const WARN_MS = 1500;
const THROUGH_DMG = 12;
const THROUGH_R = 40;

interface Mark { t: number; x: number; y: number }
interface Streak { ax: number; ay: number; bx: number; by: number; at: number; c: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const every = ctx.hard ? 6600 : 8000;
  const hist = new Map<Fighter, Mark[]>([[player, []], [npc, []]]);
  const streaks: Streak[] = [];
  let next = -1;
  let lastCount = -1;
  let t0 = -1;
  const C: Pt = { x: W / 2, y: (top + H) / 2 + 10 };

  /** Where a fighter stood `DELAY_MS` before `time` (interpolated), or where they are if too new. */
  const pastPos = (f: Fighter, time: number): Pt => {
    const h = hist.get(f) ?? [];
    const want = time - DELAY_MS;
    if (!h.length || h[0].t > want) return { x: h[0]?.x ?? f.x, y: h[0]?.y ?? f.y };
    for (let i = h.length - 1; i > 0; i--) {
      if (h[i - 1].t <= want) {
        const a = h[i - 1], b = h[i];
        const k = b.t > a.t ? (want - a.t) / (b.t - a.t) : 0;
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
      }
    }
    return { x: h[0].x, y: h[0].y };
  };

  function strike(time: number): void {
    ctx.banner('THE CLOCK STRIKES — REWIND', '#f0d58a');
    ctx.sfx('time-warp');
    const moves = [player, npc].filter(alive).map((f) => ({ f, from: { x: f.x, y: f.y }, to: pastPos(f, time) }));
    for (const m of moves) {
      const o = otherOf(m.f, player, npc);
      const om = moves.find((q) => q.f === o);
      streaks.push({ ax: m.from.x, ay: m.from.y, bx: m.to.x, by: m.to.y, at: time, c: m.f === player ? 0x8ad0ff : 0xffb07a });
      if (om && dist(m.from.x, m.from.y, m.to.x, m.to.y) > 30 && segDist(om.from.x, om.from.y, m.from.x, m.from.y, m.to.x, m.to.y) < THROUGH_R) {
        ctx.hit(o, THROUGH_DMG, om.from.x, om.from.y);
        ctx.float(om.from.x, om.from.y - 46, 'RUN THROUGH BY TIME', '#f0d58a');
        ctx.sfx('hit-heavy');
      }
    }
    for (const m of moves) ctx.nudge(m.f, m.to.x - m.f.x, m.to.y - m.f.y);
    // Every shot in flight turns back on its shooter.
    let turned = 0;
    for (const s of ctx.shotsNear(W / 2, H / 2, 1200)) if (s.reflect()) turned++;
    if (turned) ctx.float(C.x, C.y - 40, turned > 1 ? `${turned} SHOTS TURN BACK` : 'A SHOT TURNS BACK', '#8aa4f0');
    // The past starts again from here.
    for (const [f, h] of hist) { h.length = 0; h.push({ t: time, x: f.x, y: f.y }); }
  }

  return {
    update(time) {
      if (t0 < 0) { t0 = time; next = time + every; }
      for (const [f, h] of hist) {
        if (!alive(f)) continue;
        const last = h[h.length - 1];
        if (!last || time - last.t >= 40) h.push({ t: time, x: f.x, y: f.y });
        while (h.length > 2 && h[1].t < time - DELAY_MS - 400) h.shift();
      }
      const left = next - time;
      if (left < WARN_MS) {
        const count = Math.ceil(left / 500);
        if (count !== lastCount && count > 0) { lastCount = count; ctx.sfx('countdown-tick'); ctx.float(C.x, top + 40, `${count}…`, '#f0d58a'); }
      }
      if (time >= next) { strike(time); next = time + every; lastCount = -1; }
      for (let i = streaks.length - 1; i >= 0; i--) if (time - streaks[i].at > 700) streaks.splice(i, 1);
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const time = ctx.scene.time.now;
      const left = next - time;
      // Its landing spot is set once the strike is under three seconds away: line up to be
      // dragged back through the player.
      if (left < DELAY_MS - 300) {
        const L = pastPos(npc, next);
        const d = dist(L.x, L.y, player.x, player.y) || 1;
        return { x: clamp(player.x + ((player.x - L.x) / d) * 90, 60, W - 60), y: clamp(player.y + ((player.y - L.y) / d) * 90, top + 50, H - 50) };
      }
      return null;
    },

    drawGround(g, time) {
      // The floor is a clock face; its hand comes round to the strike.
      const R = Math.min(W, H - top) * 0.42;
      const k = clamp(1 - (next - time) / every, 0, 1);
      g.lineStyle(10, dim(BRASS, 0.4), 0.35); g.strokeCircle(C.x, C.y, R);
      g.lineStyle(3, BRASS, 0.4); g.strokeCircle(C.x, C.y, R - 8);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        g.lineStyle(i % 3 ? 3 : 6, NUMERAL, 0.4);
        g.lineBetween(C.x + Math.cos(a) * (R - 30), C.y + Math.sin(a) * (R - 30), C.x + Math.cos(a) * (R - 12), C.y + Math.sin(a) * (R - 12));
      }
      const ha = k * Math.PI * 2 - Math.PI / 2;
      g.fillStyle(GILT, 0.12);
      g.beginPath(); g.moveTo(C.x, C.y); g.arc(C.x, C.y, R - 14, -Math.PI / 2, ha, false); g.closePath(); g.fillPath();
      g.lineStyle(5, GILT, 0.55); g.lineBetween(C.x, C.y, C.x + Math.cos(ha) * (R - 18), C.y + Math.sin(ha) * (R - 18));
      // Each fighter's last three seconds, drawn as a fading brass trail back to their ghost.
      const warn = clamp(1 - (next - time) / WARN_MS, 0, 1);
      for (const [f, h] of hist) {
        if (!alive(f) || h.length < 2) continue;
        const from = time - DELAY_MS;
        for (let i = 1; i < h.length; i++) {
          if (h[i].t < from) continue;
          const a = clamp((h[i].t - from) / DELAY_MS, 0, 1);
          g.lineStyle(3, f === player ? 0x8ad0ff : 0xffb07a, 0.1 + (1 - a) * 0.25 + warn * 0.2);
          g.lineBetween(h[i - 1].x, h[i - 1].y + 14, h[i].x, h[i].y + 14);
        }
        // The drag line it will travel at the strike.
        if (warn > 0) {
          const p = pastPos(f, next);
          g.lineStyle(2, BRASS_LIT, warn * 0.7);
          const d = dist(f.x, f.y, p.x, p.y);
          for (let s = 0; s < d; s += 16) {
            const x = f.x + ((p.x - f.x) * s) / d, y = f.y + ((p.y - f.y) * s) / d;
            g.lineBetween(x, y, x + ((p.x - f.x) * 8) / d, y + ((p.y - f.y) * 8) / d);
          }
        }
      }
    },

    drawAir(g, time) {
      const warn = clamp(1 - (next - time) / WARN_MS, 0, 1);
      // The ghosts: a brass silhouette with a little dial for a face, where each of you will land.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const p = pastPos(f, time + (warn > 0 ? next - time : 0));
        const a = 0.25 + warn * 0.55;
        const c = f === player ? 0x8ad0ff : 0xffb07a;
        g.fillStyle(c, a * 0.35); g.fillCircle(p.x, p.y, 21);
        g.lineStyle(2, c, a); g.strokeCircle(p.x, p.y, 21);
        g.fillStyle(0x000000, a * 0.25); g.fillEllipse(p.x, p.y + 20, 34, 9);
        if (warn > 0) dial(g, p.x, p.y - 2, 9, time / 300, -time / 120, ENAMEL, BRASS);
      }
      // The strike's streaks: each fighter dragged back along their line.
      for (const s of streaks) {
        const k = (time - s.at) / 700;
        g.lineStyle(14 * (1 - k), s.c, 0.4 * (1 - k)); g.lineBetween(s.ax, s.ay, s.bx, s.by);
        g.lineStyle(3 * (1 - k), BLUED_LIT, 1 - k); g.lineBetween(s.ax, s.ay, s.bx, s.by);
        for (let i = 0; i < 5; i++) {
          const kk = (i / 5 + k) % 1;
          g.fillStyle(BRASS_LIT, 1 - k); g.fillCircle(s.ax + (s.bx - s.ax) * kk, s.ay + (s.by - s.ay) * kk, 3);
        }
      }
      if (streaks.length) {
        const k = (time - streaks[0].at) / 700;
        g.lineStyle(6 * (1 - k), GILT, 0.6 * (1 - k)); g.strokeCircle(C.x, C.y, 40 + k * 400);
      }
    },
  };
}

export const REWIND: GimmickDef = {
  id: 'clockwork-rewind',
  rules: 'The clock strikes: both fighters snap back to where they stood 3s ago and shots in flight turn on their shooters. Get dragged back through your foe to hurt them.',
  make,
};
