import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import {
  BRAID, BRASS, BRASS_DARK, BRASS_DEEP, BRASS_LIT, BRASS_SHINE, CREAM, NAVY, NAVY_DARK, SCARLET, SCARLET_DARK,
  SILVER, SILVER_DARK, WOOD_DARK,
} from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Mace Aloft — Jessamy Twirl, Mace-Bearer.
 *
 * She leads the Hours parade down the Parade with the court's silver-and-brass mace, and she
 * can throw it higher than the herald towers and catch it without looking. In the star's
 * telling she throws it at people.
 *
 * She plants her feet and the loop is chalked out first: an oval out past you and back to her
 * hand, out on one side and home on the other. The spinning mace clouts whoever it meets on
 * either leg. Strike it in the air and it leaves the loop and flies straight back at her —
 * a clout and a stagger; if it misses her it lies in the grass until she fetches it.
 * Past half she throws two at once, mirrored, in a figure of eight.
 */

const EVERY_MS = 3300;
const HALF_EVERY_MS = 2700;
const WARN_MS = 850;
const FLY_MS = 1650;
const LOOP_W = 170;
const MACE_R = 24;
const DMG = 13;
const TURNED_SPEED = 640;
const TURNED_DMG = 20;
const TURNED_STUN = 600;
const TURNED_LIFE = 1600;

interface Mace {
  ox: number; oy: number; ax: number; L: number; side: number;
  /** When it leaves her hand (after the chalked warning). */
  flyAt: number;
  x: number; y: number; prevX: number; prevY: number;
  leg: number;
  hit: boolean;
  turned: boolean;
  tvx: number; tvy: number; turnedUntil: number;
  target: StrikeTarget | null;
  done: boolean;
}

/** The mace itself: a rosewood staff wound with silver chain, a crowned brass orb, a tassel. */
function drawMace(g: G, x: number, y: number, a: number, s: number, glowK: number): void {
  const c = Math.cos(a), sn = Math.sin(a);
  const hx = x + c * 30 * s, hy = y + sn * 30 * s, fx = x - c * 30 * s, fy = y - sn * 30 * s;
  g.lineStyle(6 * s, WOOD_DARK, 1); g.lineBetween(fx, fy, hx, hy);
  g.lineStyle(2 * s, lit(WOOD_DARK, 0.3), 1); g.lineBetween(fx, fy, hx, hy);
  // Silver chain wound round the staff.
  for (let i = -4; i <= 3; i++) {
    const px = x + c * i * 6 * s, py = y + sn * i * 6 * s;
    g.lineStyle(1.6 * s, SILVER, 1); g.lineBetween(px - sn * 3.5 * s, py + c * 3.5 * s, px + c * 3 * s + sn * 3.5 * s, py + sn * 3 * s - c * 3.5 * s);
  }
  g.fillStyle(SILVER_DARK, 1); g.fillCircle(fx, fy, 3.5 * s);
  if (glowK > 0) glow(g, hx, hy, 18 * s, BRASS_SHINE, 0.06 * glowK, 3);
  g.fillStyle(BRASS_DEEP, 1); g.fillCircle(hx, hy, 9.5 * s);
  g.fillStyle(BRASS, 1); g.fillCircle(hx, hy, 8 * s);
  g.fillStyle(BRASS_SHINE, 0.8); g.fillCircle(hx - 2.5 * s, hy - 2.5 * s, 2.6 * s);
  g.lineStyle(1.2 * s, BRASS_DARK, 1); g.strokeCircle(hx, hy, 5 * s);
  // The little crown on the orb.
  const kx = hx + c * 9 * s, ky = hy + sn * 9 * s;
  g.fillStyle(BRASS_LIT, 1);
  for (const k of [-1, 0, 1]) g.fillTriangle(kx - sn * k * 4 * s, ky + c * k * 4 * s, kx - sn * k * 4 * s + c * 6 * s, ky + c * k * 4 * s + sn * 6 * s, kx - sn * (k + 0.6) * 4 * s, ky + c * (k + 0.6) * 4 * s);
  g.fillStyle(SCARLET, 1); g.fillCircle(kx, ky, 1.8 * s);
  // A scarlet-and-cream tassel cord off the neck.
  g.lineStyle(1.5 * s, SCARLET_DARK, 1); g.lineBetween(hx - c * 10 * s, hy - sn * 10 * s, hx - c * 10 * s + sn * 9 * s, hy - sn * 10 * s - c * 9 * s + 6 * s);
  g.fillStyle(BRAID, 1); g.fillCircle(hx - c * 10 * s + sn * 9 * s, hy - sn * 10 * s - c * 9 * s + 7 * s, 2.2 * s);
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const maces: Mace[] = [];
  /** A turned mace that missed her, lying in the grass. */
  let grounded: { x: number; y: number } | null = null;
  let nextThrowAt = ctx.scene.time.now + 2200;
  let twin = false;

  const loopAt = (m: Mace, u: number) => {
    const along = (m.L / 2) * (1 - Math.cos(u * Math.PI * 2));
    const across = m.side * (LOOP_W / 2) * Math.sin(u * Math.PI * 2);
    const c = Math.cos(m.ax), s = Math.sin(m.ax);
    return { x: m.ox + c * along - s * across, y: m.oy + s * along + c * across };
  };

  const throwAt = (time: number, side: number) => {
    const ax = Math.atan2(player.y - npc.y, player.x - npc.x);
    const L = clamp(dist(npc.x, npc.y, player.x, player.y) + 120, 260, 680);
    const m: Mace = {
      ox: npc.x, oy: npc.y, ax, L, side, flyAt: time + WARN_MS, x: npc.x, y: npc.y, prevX: npc.x, prevY: npc.y,
      leg: 0, hit: false, turned: false, tvx: 0, tvy: 0, turnedUntil: 0, target: null, done: false,
    };
    maces.push(m);
  };

  const turn = (m: Mace) => {
    if (m.turned || m.done) return;
    m.turned = true;
    const a = Math.atan2(npc.y - m.y, npc.x - m.x);
    m.tvx = Math.cos(a) * TURNED_SPEED; m.tvy = Math.sin(a) * TURNED_SPEED;
    m.turnedUntil = ctx.scene.time.now + TURNED_LIFE;
    m.target?.remove(); m.target = null;
    ctx.float(m.x, m.y - 30, 'TURNED!', '#9ad0ff');
    ctx.sfx('clang');
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!twin && alive(npc) && npc.hp / npc.maxHp < 0.5) {
        twin = true;
        ctx.banner('She draws the second mace — two loops now, mirrored, in a figure of eight.', '#ffd27a');
        ctx.sfx('whip');
      }
      // A mace in the grass is fetched before anything else is thrown.
      if (grounded && alive(npc) && dist(npc.x, npc.y, grounded.x, grounded.y) < 34) {
        grounded = null; nextThrowAt = time + 900;
        ctx.float(npc.x, npc.y - 50, 'fetched', '#ffe2a8');
      }
      if (!grounded && maces.length === 0 && time >= nextThrowAt && alive(npc) && alive(player)) {
        throwAt(time, 1);
        if (twin) throwAt(time, -1);
        ctx.root(npc, WARN_MS);
        ctx.sfx('trap-set');
      }
      for (const m of maces) {
        m.prevX = m.x; m.prevY = m.y;
        if (time < m.flyAt) continue;
        if (m.turned) {
          // Straight back at her, bending a little after her as she runs.
          const want = Math.atan2(npc.y - m.y, npc.x - m.x), cur = Math.atan2(m.tvy, m.tvx);
          const na = cur + clamp(wrapAngle(want - cur), -2.2 * dt, 2.2 * dt);
          m.tvx = Math.cos(na) * TURNED_SPEED; m.tvy = Math.sin(na) * TURNED_SPEED;
          m.x += m.tvx * dt; m.y += m.tvy * dt;
          if (alive(npc) && dist(m.x, m.y, npc.x, npc.y) < MACE_R + 22) {
            ctx.hit(npc, TURNED_DMG, npc.x, npc.y);
            ctx.stun(npc, TURNED_STUN);
            ctx.float(npc.x, npc.y - 50, 'OWN MACE!', '#9ad0ff');
            ctx.sfx('hit-heavy');
            m.done = true; nextThrowAt = time + 1500;
          } else if (time >= m.turnedUntil || m.x < 40 || m.x > W - 40 || m.y < top + 10 || m.y > H - 30) {
            grounded = { x: clamp(m.x, 50, W - 50), y: clamp(m.y, top + 40, H - 40) };
            ctx.sfx('land');
            m.done = true;
          }
          continue;
        }
        if (!m.target) {
          m.target = ctx.target({ x: m.x, y: m.y, r: MACE_R, onStruck: (by) => { if (by === 'player') turn(m); } });
          ctx.sfx('whoosh');
        }
        const u = (time - m.flyAt) / FLY_MS;
        if (u >= 1) {
          m.done = true; m.target?.remove(); m.target = null;
          nextThrowAt = time + (twin ? HALF_EVERY_MS : EVERY_MS) - WARN_MS;
          continue;
        }
        let p = loopAt(m, u);
        // The last of the loop bends home to her hand, wherever she has got to.
        if (u > 0.85 && alive(npc)) { const k = (u - 0.85) / 0.15; p = { x: p.x + (npc.x - p.x) * k, y: p.y + (npc.y - p.y) * k }; }
        m.x = p.x; m.y = p.y;
        m.target?.moveTo(m.x, m.y);
        const leg = u < 0.5 ? 0 : 1;
        if (leg !== m.leg) { m.leg = leg; m.hit = false; }
        if (!m.hit && alive(player) && dist(m.x, m.y, player.x, player.y) < MACE_R + 20) {
          m.hit = true;
          ctx.hit(player, DMG, player.x, player.y);
          const mv = Math.hypot(m.x - m.prevX, m.y - m.prevY) || 1;
          ctx.nudge(player, ((m.x - m.prevX) / mv) * 60, ((m.y - m.prevY) / mv) * 60);
          ctx.sfx('hit-medium');
        }
      }
      for (let i = maces.length - 1; i >= 0; i--) if (maces[i].done) { maces[i].target?.remove(); maces.splice(i, 1); }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      if (grounded) return grounded;
      const flying = maces.find((m) => m.turned);
      if (flying) {
        const m = Math.hypot(flying.tvx, flying.tvy) || 1;
        const side = (npc.x - flying.x) * (-flying.tvy / m) + (npc.y - flying.y) * (flying.tvx / m) > 0 ? 1 : -1;
        return { x: clamp(npc.x - (flying.tvy / m) * side * 150, 60, W - 60), y: clamp(npc.y + (flying.tvx / m) * side * 150, top + 50, H - 40) };
      }
      // Keep a long throw away, circling slowly.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + 0.35;
      return { x: clamp(player.x + Math.cos(a) * 330, 60, W - 60), y: clamp(player.y + Math.sin(a) * 330, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const m of maces) {
        if (m.turned) {
          // A blue streak along the line it is taking back to her.
          const v = Math.hypot(m.tvx, m.tvy) || 1;
          g.lineStyle(3, 0x9ad0ff, 0.45);
          g.lineBetween(m.x, m.y, m.x + (m.tvx / v) * 90, m.y + (m.tvy / v) * 90);
          shadow(g, m.x, m.y + 26, 34, 10, 0.3);
          continue;
        }
        // The chalked loop, dotted, with chevrons running the way it will fly.
        const warnK = time < m.flyAt ? clamp(1 - (m.flyAt - time) / WARN_MS, 0, 1) : 1;
        const uNow = time < m.flyAt ? 0 : (time - m.flyAt) / FLY_MS;
        for (let i = 0; i < 48; i++) {
          const u = i / 48;
          if (u < uNow - 0.02) continue;
          const p = loopAt(m, u);
          g.fillStyle(i % 6 === 0 ? BRASS_LIT : CREAM, (0.25 + warnK * 0.45) * (i % 2 ? 0.7 : 1));
          g.fillCircle(p.x, p.y, i % 6 === 0 ? 3.2 : 2);
        }
        for (let i = 1; i < 8; i++) {
          const u = i / 8;
          if (u < uNow) continue;
          const p = loopAt(m, u), q = loopAt(m, u + 0.01);
          const a = Math.atan2(q.y - p.y, q.x - p.x);
          g.lineStyle(2.5, SCARLET, 0.35 + warnK * 0.4);
          g.lineBetween(p.x, p.y, p.x - Math.cos(a - 0.6) * 10, p.y - Math.sin(a - 0.6) * 10);
          g.lineBetween(p.x, p.y, p.x - Math.cos(a + 0.6) * 10, p.y - Math.sin(a + 0.6) * 10);
        }
        // Her planted heel-marks while she winds up.
        if (time < m.flyAt) { g.lineStyle(2, BRASS_LIT, 0.5 + warnK * 0.4); g.strokeCircle(m.ox, m.oy + 6, 26 + (1 - warnK) * 16); }
        else shadow(g, m.x, m.y + 26, 36, 10, 0.3);
      }
      if (grounded) {
        shadow(g, grounded.x, grounded.y + 4, 70, 14, 0.3);
        drawMace(g, grounded.x, grounded.y, 0.15, 1, 0);
        g.lineStyle(2, BRASS_LIT, 0.35 + Math.sin(time / 200) * 0.25); g.strokeCircle(grounded.x, grounded.y, 40);
      }
    },

    drawAir(g, time) {
      for (const m of maces) {
        if (time < m.flyAt) {
          // Twirled overhead while she winds up.
          drawMace(g, m.ox, m.oy - 56, time / 70, 0.9, 0.5);
          continue;
        }
        const a = time / (m.turned ? 40 : 55);
        for (let i = 1; i <= 3; i++) {
          g.lineStyle(3, m.turned ? 0x9ad0ff : BRASS_SHINE, 0.25 - i * 0.06);
          g.beginPath(); g.arc(m.x, m.y - 8, 26, a - i * 0.5, a - i * 0.5 + 0.9, false); g.strokePath();
        }
        drawMace(g, m.x, m.y - 8, a, 1, m.turned ? 0.2 : 1);
      }
    },

    drawHud(g) {
      // The baldric: one or two mace sockets, filled while she holds them.
      const x = W / 2, y = top + 18;
      const n = twin ? 2 : 1;
      g.fillStyle(NAVY_DARK, 0.75); g.fillRoundedRect(x - 26 * n - 10, y - 13, 52 * n + 20, 26, 8);
      g.lineStyle(1.5, BRASS, 0.9); g.strokeRoundedRect(x - 26 * n - 10, y - 13, 52 * n + 20, 26, 8);
      const out = maces.length + (grounded ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const cx = x - 26 * (n - 1) + i * 52;
        g.fillStyle(NAVY, 1); g.fillRoundedRect(cx - 22, y - 6, 44, 12, 5);
        if (i >= out) drawMace(g, cx, y, 0, 0.62, 0);
        else { g.lineStyle(1.5, dim(BRASS_DARK, 0.2), 1); g.strokeRoundedRect(cx - 22, y - 6, 44, 12, 5); }
      }
    },

    destroy() { for (const m of maces) m.target?.remove(); maces.length = 0; },
  };
}

export const FALLEN_MACE: GimmickDef = {
  id: fallenId('brass', 'mace'),
  rules: 'Her mace flies a chalked loop out past you and home, clouting on both legs. Strike it in the air and it flies straight back at her. Two past half.',
  make,
};
