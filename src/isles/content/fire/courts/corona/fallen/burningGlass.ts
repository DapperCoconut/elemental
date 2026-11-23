import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, BRASS_DARK, BRASS_LIT, GLASS_DEEP, GLASS_GLINT, GLASS_SHEEN, IRON, SUN, SUN_CORE, SUN_DEEP, SUN_RIM,
} from '../palette';
import { inPlay, segDist } from './geom';

/**
 * The Burning Glass — Lensman Grath's fight (the executioner).
 *
 * In the King's telling the Corona does not send its cold households to the Kiln; it sends
 * them to Grath, who focuses the captive sun on them through the great lens. Here the sun
 * comes into the room as a **beam** through a port in the north wall and is bounced round a
 * lattice of six gimballed **mirrors**, each set at one of two diagonals. The beam's whole
 * path burns whoever stands in it, either fighter.
 *
 * **Strike a mirror** and it turns to the other diagonal; the beam re-routes, showing its new
 * path for half a second before it burns there. Every nine seconds Grath passes **Sentence**:
 * the mirrors are clamped, the beam gathers (a second and a half of glare) and then burns
 * wide and hard down whatever path it holds. Route it through him before the clamps close.
 *
 * Halfway the lens descends: a second port opens in the west wall, and two beams share the
 * lattice.
 */

const ID = fallenId('corona', 'burning-glass');
const HALF_W = 12;
const SENT_HALF = 30;
const TICK_MS = 350;
const TICK_DMG = 9;
const SWING_MS = 500;
const CHARGE_MS = 1500;
const BURN_MS = 900;
const SENT_DMG = 28;

interface Mirror { x: number; y: number; slash: boolean; turnedAt: number; readyAt: number; t: StrikeTarget | null }
interface Port { at: Pt; dir: Pt }

export const BURNING_GLASS: GimmickDef = {
  id: ID,
  rules: 'A sunbeam bounces round six mirrors and burns its path. Strike a mirror to turn it. At Sentence the clamps close and it burns wide.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    const cols = [210, W / 2, W - 210];
    const rows = [top + 140, H - 150];
    const mirrors: Mirror[] = [];
    for (const y of rows) for (const x of cols) mirrors.push({ x, y, slash: ctx.rng() < 0.5, turnedAt: -9999, readyAt: 0, t: null });
    const ports: Port[] = [{ at: { x: W / 2, y: top }, dir: { x: 0, y: 1 } }];
    const west: Port = { at: { x: 0, y: rows[1] }, dir: { x: 1, y: 0 } };
    let half = false;
    let liveAt = ctx.scene.time.now + 1200;
    let sentenceAt = ctx.scene.time.now + 7000;
    let burnHit = new Set<Fighter>();
    let cuedFor = 0;
    let burnCued = 0;
    const tickAt = new Map<Fighter, number>();

    /** Where a beam from this port goes, mirror to mirror, given each mirror's diagonal. */
    const trace = (port: Port, flip = -1): Pt[] => {
      const pts: Pt[] = [port.at];
      let p = port.at, d = port.dir;
      const seen = new Set<string>();
      for (let k = 0; k < 10; k++) {
        let best = -1, bestT = Infinity;
        for (let i = 0; i < mirrors.length; i++) {
          const m = mirrors[i];
          const t = d.x !== 0
            ? (Math.abs(m.y - p.y) < 1 ? (m.x - p.x) * d.x : -1)
            : (Math.abs(m.x - p.x) < 1 ? (m.y - p.y) * d.y : -1);
          if (t > 1 && t < bestT) { bestT = t; best = i; }
        }
        if (best < 0) {
          pts.push({ x: d.x > 0 ? W : d.x < 0 ? 0 : p.x, y: d.y > 0 ? H : d.y < 0 ? top : p.y });
          break;
        }
        const m = mirrors[best];
        pts.push({ x: m.x, y: m.y });
        const key = `${best}:${d.x},${d.y}`;
        if (seen.has(key)) break;
        seen.add(key);
        const slash = best === flip ? !m.slash : m.slash;
        d = slash ? { x: -d.y, y: -d.x } : { x: d.y, y: d.x };
        p = m;
      }
      return pts;
    };
    const paths = (flip = -1): Pt[][] => ports.map((p) => trace(p, flip));
    const nearPath = (f: Pt, ps: Pt[][]): number => {
      let best = Infinity;
      for (const path of ps) for (let i = 1; i < path.length; i++) best = Math.min(best, segDist(f.x, f.y, path[i - 1], path[i]));
      return best;
    };

    const charging = (time: number): boolean => time >= sentenceAt - CHARGE_MS && time < sentenceAt;
    const burning = (time: number): boolean => time >= sentenceAt && time < sentenceAt + BURN_MS;

    for (const m of mirrors) {
      m.t = ctx.target({
        x: m.x, y: m.y - 16, r: 18,
        onStruck() {
          const now = ctx.scene.time.now;
          if (charging(now) || burning(now) || now < m.readyAt) { ctx.sfx('clang'); return; }
          m.slash = !m.slash;
          m.turnedAt = now;
          m.readyAt = now + 900;
          liveAt = now + SWING_MS;
          ctx.sfx('prism');
        },
      });
    }

    return {
      update(time) {
        if (!half && ctx.npc.hp < ctx.npc.maxHp * 0.5 && !charging(time) && !burning(time)) {
          half = true;
          ports.push(west);
          liveAt = time + 900;
          ctx.banner('THE LENS DESCENDS — A SECOND PORT OPENS', '#ffd54a');
          ctx.sfx('boss-phase');
        }
        if (time >= sentenceAt + BURN_MS) {
          sentenceAt = time + (half ? 8000 : 9000);
          burnHit = new Set();
        }
        if (charging(time) && cuedFor !== sentenceAt) { cuedFor = sentenceAt; ctx.sfx('beam-charge'); }
        const ps = paths();
        if (burning(time)) {
          if (burnCued !== sentenceAt) { burnCued = sentenceAt; ctx.sfx('judgement'); ctx.flash(W / 2, top + 6, SUN_CORE); }
          for (const f of [ctx.player, ctx.npc]) {
            if (burnHit.has(f) || !inPlay(f) || ctx.isAirborne(f)) continue;
            if (nearPath(f, ps) < SENT_HALF + 14) {
              burnHit.add(f);
              ctx.hit(f, SENT_DMG, f.x, f.y);
              ctx.sfx('status-burn');
            }
          }
          return;
        }
        if (time < liveAt) return;
        for (const f of [ctx.player, ctx.npc]) {
          if (!inPlay(f) || ctx.isAirborne(f) || time < (tickAt.get(f) ?? 0)) continue;
          if (nearPath(f, ps) < HALF_W + 14) {
            tickAt.set(f, time + TICK_MS);
            ctx.hit(f, TICK_DMG, f.x, f.y);
            ctx.sfx('sizzle');
          }
        }
      },

      npcSeek() {
        const now = ctx.scene.time.now;
        const me: Pt = { x: ctx.npc.x, y: ctx.npc.y };
        const ps = paths();
        const danger = charging(now) || burning(now) ? SENT_HALF + 60 : HALF_W + 50;
        if (nearPath(me, ps) < danger) {
          // Step square off the nearest segment, away from it.
          // Every segment is level or plumb, so "away" is just up/down or left/right of its line.
          let near: [Pt, Pt] = [me, me];
          let bd = Infinity;
          for (const path of ps) for (let i = 1; i < path.length; i++) {
            const d = segDist(me.x, me.y, path[i - 1], path[i]);
            if (d < bd) { bd = d; near = [path[i - 1], path[i]]; }
          }
          const [a, b] = near;
          if (Math.abs(b.x - a.x) > Math.abs(b.y - a.y)) return { x: me.x, y: me.y + (me.y >= a.y ? 120 : -120) };
          return { x: me.x + (me.x >= a.x ? 120 : -120), y: me.y };
        }
        if (charging(now)) return null;
        // Grath's trade: turn the mirror that lays the beam across you.
        for (let i = 0; i < mirrors.length; i++) {
          if (now < mirrors[i].readyAt) continue;
          const alt = paths(i);
          if (nearPath(ctx.player, alt) < 40 && nearPath(me, alt) > 80) return { x: mirrors[i].x, y: mirrors[i].y + 40 };
        }
        return null;
      },

      drawGround(g, time) {
        const ps = paths();
        const swinging = time < liveAt;
        const ch = charging(time), bu = burning(time);
        for (const path of ps) {
          for (let i = 1; i < path.length; i++) {
            const a = path[i - 1], b = path[i];
            if (swinging) {
              // The new route, sketched in sparks while the beam swings onto it.
              const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
              g.lineStyle(2, SUN_RIM, 0.7);
              for (let d = (time / 5) % 22; d < len; d += 22) {
                g.lineBetween(a.x + (dx / len) * d, a.y + (dy / len) * d, a.x + (dx / len) * Math.min(len, d + 9), a.y + (dy / len) * Math.min(len, d + 9));
              }
              continue;
            }
            const k = ch ? 1 - (sentenceAt - time) / CHARGE_MS : 0;
            const w = bu ? SENT_HALF * 2 : HALF_W * 2 + k * 30;
            g.lineStyle(w + 14, GLASS_DEEP, 0.35); g.lineBetween(a.x, a.y, b.x, b.y);
            g.lineStyle(w, bu ? SUN_RIM : SUN, bu ? 0.55 : 0.22 + 0.25 * k); g.lineBetween(a.x, a.y, b.x, b.y);
            g.lineStyle(bu ? 12 : 3 + k * 4, SUN_CORE, 0.85 + Math.sin(time / 40 + i) * 0.15); g.lineBetween(a.x, a.y, b.x, b.y);
          }
        }
        // Gimbal footings for the six mirrors.
        for (const m of mirrors) {
          g.fillStyle(0x000000, 0.35); g.fillEllipse(m.x, m.y + 4, 46, 14);
          g.fillStyle(BRASS_DARK, 1); g.fillEllipse(m.x, m.y + 2, 36, 11);
          g.lineStyle(2, BRASS, 0.9); g.strokeEllipse(m.x, m.y + 2, 36, 11);
        }
      },

      drawAir(g, time) {
        const ch = charging(time), bu = burning(time);
        for (const m of mirrors) {
          // The plate turns through 90° over a fifth of a second when struck.
          const target = m.slash ? -Math.PI / 4 : Math.PI / 4;
          const tk = Math.min(1, (time - m.turnedAt) / 200);
          const ang = target + (1 - tk) * (m.slash ? Math.PI / 2 : -Math.PI / 2);
          const cx = m.x, cy = m.y - 16;
          g.lineStyle(3, IRON, 1); g.lineBetween(cx, m.y, cx, cy + 8);
          g.lineStyle(2, BRASS, 1); g.strokeCircle(cx, cy, 16);
          const ux = Math.cos(ang) * 15, uy = Math.sin(ang) * 15;
          g.lineStyle(7, BRASS_DARK, 1); g.lineBetween(cx - ux, cy - uy, cx + ux, cy + uy);
          g.lineStyle(4, GLASS_SHEEN, 1); g.lineBetween(cx - ux, cy - uy, cx + ux, cy + uy);
          g.fillStyle(GLASS_GLINT, 0.9); g.fillCircle(cx - ux * 0.4, cy - uy * 0.4, 2);
          if (ch || bu) {
            // Sentence clamps: two red-hot jaws bite the gimbal ring.
            g.fillStyle(SUN_DEEP, 1); g.fillRect(cx - 20, cy - 3, 6, 6); g.fillRect(cx + 14, cy - 3, 6, 6);
          } else if (time < m.readyAt) {
            g.lineStyle(1.5, SUN_RIM, 0.6); g.strokeCircle(cx, cy, 19);
          }
        }
        // The ports: a brass shutter in the wall, its aperture glaring.
        for (const p of ports) {
          const glare = ch ? 1 - (sentenceAt - time) / CHARGE_MS : bu ? 1 : 0.3;
          const vert = p.dir.y !== 0;
          const x = p.at.x + (vert ? 0 : 8), y = p.at.y + (vert ? 8 : 0);
          g.fillStyle(IRON, 1);
          if (vert) g.fillRect(x - 30, y - 10, 60, 14); else g.fillRect(x - 10, y - 30, 14, 60);
          g.fillStyle(BRASS, 1);
          if (vert) { g.fillRect(x - 26, y - 8, 14, 10); g.fillRect(x + 12, y - 8, 14, 10); } else { g.fillRect(x - 8, y - 26, 10, 14); g.fillRect(x - 8, y + 12, 10, 14); }
          g.fillStyle(SUN, 0.3 + 0.4 * glare); g.fillCircle(x, y, 14 + glare * 14);
          g.fillStyle(SUN_CORE, 1); g.fillCircle(x, y, 6 + glare * 4);
          for (let r = 0; r < 6; r++) {
            const a = r * (Math.PI / 3) + time / 400;
            g.lineStyle(2, SUN_CORE, 0.4 * glare);
            g.lineBetween(x + Math.cos(a) * 12, y + Math.sin(a) * 12, x + Math.cos(a) * (24 + glare * 16), y + Math.sin(a) * (24 + glare * 16));
          }
        }
      },

      drawHud(g, time) {
        // The Sentence clock: a brass bar filling toward the next sentence, red-hot through the glare.
        const x = W / 2 - 150, y = 104, w = 300, h = 10;
        const period = half ? 8000 : 9000;
        const k = burning(time) ? 1 : Math.max(0, Math.min(1, 1 - (sentenceAt - time) / period));
        g.fillStyle(0x000000, 0.55); g.fillRect(x - 3, y - 3, w + 6, h + 6);
        g.fillStyle(charging(time) || burning(time) ? (Math.floor(time / 110) % 2 ? SUN_CORE : SUN_DEEP) : BRASS_LIT, 1);
        g.fillRect(x, y, w * k, h);
        g.fillStyle(SUN_DEEP, 1); g.fillRect(x + w * (1 - CHARGE_MS / period) - 1, y - 4, 2, h + 8);
      },

      destroy() {
        for (const m of mirrors) m.t?.remove();
      },
    };
  },
};
