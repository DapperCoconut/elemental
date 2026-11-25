import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import type { G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { segText } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, DIODE, FAULT, FILAMENT, FILAMENT_LIT, IRON, IRON_DARK, NIXIE, SILK, SOLDER, VALVE_GLASS } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Kick the Watchdog — Watchkeeper Brisco Haddle, who in the King's telling kept the Tabulator's
 * watchdog: the brass hound on the long chain that is let loose on any clerk whose counter stops
 * ticking, because a machine that has gone quiet has hung, and a hung machine is *reset*.
 *
 * Each fighter has a watchdog timer running down on the panel. Land a blow on the other and you
 * kick yours back to full. Let it run out and the hound comes for you: it crouches, a ring marks
 * where it will land, and it leaps — the ring bites everyone inside it (stun and teeth), so never
 * stand in his ring when it hunts him. Bitten, your timer is reset. Each leap that misses pays out
 * more chain; get beyond its reach from the post, or kick your timer, and it is called back.
 *
 * The post carries the keeper's whistle. Strike it while the hound sits and it is sent at whoever
 * has the *least* time left — keep yours fuller, then whistle him up. Halfway down, the timers run
 * shorter. The bot keeps its own timer fed, keeps out of your ring while you are hunted, and runs
 * to the whistle when you are the lower.
 */

const ID = fallenId('circuit', 'watchdog');
const TIMEOUT_MS = 8500;
const TIMEOUT_LATE_MS = 6500;
const CHAIN0 = 330;
const CHAIN_STEP = 75;
const CHAIN_MAX = 600;
const AIM_MS = 760;
const LEAP_MS = 260;
const REST_MS = 650;
const RING = 62;
const BITE = 14;
const BITE_STUN = 550;
const WHISTLE_R = 26;
const WHISTLE_GAP_MS = 3000;

type Hunt = { phase: 'sit' } | { phase: 'aim' | 'rest'; prey: Fighter; at: Pt; from: Pt; until: number };

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const post: Pt = { x: W / 2, y: (top + H) / 2 + 10 };
  let timeout = TIMEOUT_MS;
  const deadline = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let hunt: Hunt = { phase: 'sit' };
  let hound: Pt = { x: post.x + 30, y: post.y + 8 };
  let face = 1;
  let chain = CHAIN0;
  let started = false;
  let late = false;
  let internal = false;
  let whistleAt = -9999;
  let biteAt = -9999;
  let biteSpot: Pt = post;

  const left = (f: Fighter, time: number): number => (deadline.get(f) ?? 0) - time;
  const reach = (p: Pt): Pt => {
    const d = dist(post.x, post.y, p.x, p.y);
    if (d <= chain) return { x: p.x, y: p.y };
    return { x: post.x + ((p.x - post.x) / d) * chain, y: post.y + ((p.y - post.y) / d) * chain };
  };

  function hit(f: Fighter, n: number): void { internal = true; try { ctx.hit(f, n, f.x, f.y); } finally { internal = false; } }

  function kick(f: Fighter): void {
    const time = ctx.scene.time.now;
    deadline.set(f, time + timeout);
    if (hunt.phase !== 'sit' && hunt.prey === f) { hunt = { phase: 'sit' }; chain = CHAIN0; ctx.sfx('snap-back'); }
  }

  function aimAt(prey: Fighter, time: number): void {
    const at = reach({ x: prey.x, y: prey.y });
    hunt = { phase: 'aim', prey, at, from: { x: hound.x, y: hound.y }, until: time + AIM_MS };
    face = at.x >= hound.x ? 1 : -1;
    ctx.sfx('roar');
  }

  ctx.target({
    x: post.x, y: post.y, r: WHISTLE_R, passThrough: true,
    onStruck: (by) => {
      const time = ctx.scene.time.now;
      if (hunt.phase !== 'sit' || time - whistleAt < WHISTLE_GAP_MS) return;
      whistleAt = time;
      const prey = left(player, time) <= left(npc, time) ? player : npc;
      ctx.float(post.x, post.y - 60, prey === player ? 'SENT AT YOU' : 'SENT AT HADDLE', by === 'player' ? '#9af6ff' : '#ffb070');
      ctx.sfx('whoosh');
      aimAt(prey, time);
    },
  });

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; deadline.set(player, time + timeout + 1500); deadline.set(npc, time + timeout + 1500); }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true; timeout = TIMEOUT_LATE_MS;
        for (const f of [player, npc]) deadline.set(f, Math.min(deadline.get(f) ?? 0, time + timeout));
        ctx.banner('The watchdog timers run shorter.', '#ffd080');
        ctx.sfx('clock-tick');
      }
      if (hunt.phase === 'sit') {
        hound = { x: post.x + 30 * face, y: post.y + 8 };
        const due = [player, npc].filter((f) => alive(f) && left(f, time) <= 0).sort((a, b) => left(a, time) - left(b, time));
        if (due.length) aimAt(due[0], time);
        return;
      }
      const h = hunt;
      if (!alive(h.prey)) { hunt = { phase: 'sit' }; return; }
      if (h.phase === 'aim') {
        const k = clamp(1 - (h.until - time) / LEAP_MS, 0, 1);
        hound = { x: h.from.x + (h.at.x - h.from.x) * k, y: h.from.y + (h.at.y - h.from.y) * k - Math.sin(k * Math.PI) * 60 };
        if (time < h.until) return;
        hound = { ...h.at };
        biteAt = time; biteSpot = { ...h.at };
        ctx.sfx('trap-snap');
        let got = false;
        for (const f of [player, npc] as Fighter[]) {
          if (!alive(f) || dist(f.x, f.y, h.at.x, h.at.y) > RING + 18) continue;
          hit(f, BITE);
          ctx.stun(f, BITE_STUN);
          ctx.flash(f.x, f.y, FILAMENT);
          if (f === h.prey) got = true;
        }
        if (got) { deadline.set(h.prey, time + timeout); hunt = { phase: 'sit' }; chain = CHAIN0; return; }
        chain = Math.min(CHAIN_MAX, chain + CHAIN_STEP);
        hunt = { phase: 'rest', prey: h.prey, at: h.at, from: h.at, until: time + REST_MS };
        return;
      }
      if (time >= h.until) {
        // Out of reach of the post even on the longer chain? Then it gives up and goes back.
        if (dist(post.x, post.y, h.prey.x, h.prey.y) > chain + RING + 40 && chain >= CHAIN_MAX) { hunt = { phase: 'sit' }; chain = CHAIN0; deadline.set(h.prey, time + timeout * 0.5); return; }
        aimAt(h.prey, time);
      }
    },

    onNpcHurt() { if (!internal) kick(player); },
    onPlayerHurt() { if (!internal) kick(npc); },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const time = ctx.scene.time.now;
      if (hunt.phase !== 'sit') {
        if (hunt.prey === npc) {
          // Hunted: out of the ring, toward the far side of the post from it.
          const a = Math.atan2(npc.y - hunt.at.y, npc.x - hunt.at.x);
          return { x: clamp(npc.x + Math.cos(a) * 160, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 160, top + 40, H - 40) };
        }
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(player.x + Math.cos(a) * 200, 60, W - 60), y: clamp(player.y + Math.sin(a) * 200, top + 40, H - 40) };
      }
      if (left(npc, time) < 3200) return { x: player.x + (npc.x < player.x ? -150 : 150), y: player.y };
      if (left(player, time) < left(npc, time) - 1000 && time - whistleAt > WHISTLE_GAP_MS) return { x: post.x + 36, y: post.y + 20 };
      return null;
    },

    drawGround(g, time) {
      // The reach: a faint chalk circle round the post at the chain's current length.
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        g.lineStyle(2, SILK, chain > CHAIN0 ? 0.28 : 0.14);
        g.beginPath(); g.arc(post.x, post.y, chain, a, a + 0.07); g.strokePath();
      }
      if (hunt.phase === 'aim') {
        const k = clamp(1 - (hunt.until - time) / AIM_MS, 0, 1);
        g.fillStyle(FAULT, 0.1 + k * 0.2); g.fillCircle(hunt.at.x, hunt.at.y, RING);
        g.lineStyle(3, FAULT, 0.6 + k * 0.4); g.strokeCircle(hunt.at.x, hunt.at.y, RING);
        g.lineStyle(2, FAULT, 0.8); g.beginPath(); g.arc(hunt.at.x, hunt.at.y, RING - 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
        // Paw prints stamped into the ring.
        for (let i = 0; i < 3; i++) paw(g, hunt.at.x - 18 + i * 18, hunt.at.y + (i % 2 ? -10 : 8), 0.5);
      }
      const bk = (time - biteAt) / 400;
      if (bk >= 0 && bk < 1) { g.lineStyle(4 * (1 - bk), 0xffffff, 1 - bk); g.strokeCircle(biteSpot.x, biteSpot.y, RING + bk * 20); }
      drawPost(g, post, time - whistleAt < WHISTLE_GAP_MS, time);
      drawChain(g, post, hound);
    },

    drawAir(g, time) {
      const crouch = hunt.phase === 'aim' && hunt.until - time > LEAP_MS;
      drawHound(g, hound.x, hound.y, face, crouch, hunt.phase !== 'sit', time);
    },

    drawHud(g, time) {
      timerBar(g, W / 2 - 150, top + 6, left(player, time) / timeout, 0x9af6ff, hunt.phase !== 'sit' && hunt.prey === player, time);
      timerBar(g, W / 2 + 10, top + 6, left(npc, time) / timeout, 0xffb070, hunt.phase !== 'sit' && hunt.prey === npc, time);
    },
  };
}

/** A watchdog panel: a draining bar of nixie-orange with tick marks, red in its last quarter. */
function timerBar(g: G, x: number, y: number, k: number, col: number, hunted: boolean, time: number): void {
  const v = clamp(k, 0, 1);
  g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x, y, 140, 20, 6);
  g.fillStyle(col, 1); g.fillCircle(x + 10, y + 10, 4);
  g.fillStyle(0x221a18, 1); g.fillRect(x + 20, y + 6, 112, 8);
  g.fillStyle(v < 0.25 ? FAULT : NIXIE, 1); g.fillRect(x + 20, y + 6, 112 * v, 8);
  for (let i = 1; i < 8; i++) { g.fillStyle(0x000000, 0.5); g.fillRect(x + 20 + i * 14, y + 6, 1, 8); }
  if (hunted) { g.lineStyle(2, FAULT, 0.6 + Math.sin(time / 70) * 0.4); g.strokeRoundedRect(x, y, 140, 20, 6); }
}

function paw(g: G, x: number, y: number, a: number): void {
  g.fillStyle(FAULT, a); g.fillEllipse(x, y + 3, 9, 7);
  for (let i = -1; i <= 1; i++) g.fillCircle(x + i * 4, y - 3 - Math.abs(i) * -1, 2);
}

/** The kennel post: an iron bollard with the chain reel and the keeper's brass whistle on a hook. */
function drawPost(g: G, p: Pt, used: boolean, time: number): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(p.x, p.y + 10, 56, 16);
  g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(p.x - 16, p.y - 40, 32, 50, 6);
  g.fillStyle(IRON, 1); g.fillRoundedRect(p.x - 13, p.y - 42, 26, 48, 6);
  g.fillStyle(lit(IRON, 0.25), 1); g.fillRect(p.x - 10, p.y - 40, 4, 42);
  // The reel and its crank.
  g.fillStyle(IRON_DARK, 1); g.fillCircle(p.x, p.y - 18, 11);
  g.lineStyle(3, SOLDER, 1); g.strokeCircle(p.x, p.y - 18, 8);
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(p.x, p.y - 18, p.x - 14, p.y - 28);
  // The whistle on its hook.
  const wx = p.x + 16, wy = p.y - 36;
  g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(p.x + 10, p.y - 44, wx, wy - 4);
  g.fillStyle(used ? BRASS_DARK : BRASS, 1); g.fillRoundedRect(wx - 3, wy - 4, 16, 7, 3);
  g.fillStyle(BRASS_LIT, used ? 0.3 : 1); g.fillRect(wx, wy - 3, 10, 2);
  if (!used) { g.lineStyle(1.5, BRASS_LIT, 0.35 + Math.sin(time / 220) * 0.2); g.strokeCircle(p.x, p.y - 12, WHISTLE_R); }
  segText(g, p.x - 8, p.y - 2, 'HND', 8, SILK, 0.5);
}

/** The chain from the reel to the hound's collar: oval iron links, sagging slightly. */
function drawChain(g: G, p: Pt, h: Pt): void {
  const d = dist(p.x, p.y, h.x, h.y);
  const n = Math.max(2, Math.floor(d / 12));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = p.x + (h.x - p.x) * t, y = p.y - 18 + (h.y - 14 - p.y + 18) * t + Math.sin(t * Math.PI) * Math.min(30, d * 0.06);
    g.lineStyle(2.5, i % 2 ? IRON : dim(SOLDER, 0.25), 1);
    if (i % 2) g.strokeEllipse(x, y, 10, 5); else g.strokeEllipse(x, y, 5, 8);
  }
}

/**
 * The watchdog: a brass automaton hound, its body in riveted plates, a winding key in its back,
 * two valve eyes that glow when it hunts. `face` is ±1; `crouch` lowers it for the spring.
 */
function drawHound(g: G, x: number, y: number, face: number, crouch: boolean, hunting: boolean, time: number): void {
  const f = face, low = crouch ? 6 : 0;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 4, 64, 14);
  // Legs: four jointed struts.
  const step = hunting ? Math.sin(time / 70) * 4 : 0;
  for (const [lx, s] of [[-18, 1], [-10, -1], [12, 1], [20, -1]] as [number, number][]) {
    g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(x + lx * f, y - 16 + low, x + (lx + step * s) * f, y);
    g.fillStyle(IRON_DARK, 1); g.fillCircle(x + (lx + step * s) * f, y, 3);
  }
  // Body: a barrel of brass plates.
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y - 20 + low, 50, 22);
  g.fillStyle(BRASS, 1); g.fillEllipse(x, y - 22 + low, 46, 18);
  for (let i = -16; i <= 16; i += 8) { g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(x + i, y - 30 + low, x + i, y - 14 + low); }
  g.fillStyle(BRASS_LIT, 0.6); g.fillEllipse(x - 4 * f, y - 27 + low, 26, 4);
  // Winding key in its back.
  g.lineStyle(3, IRON, 1); g.lineBetween(x - 6 * f, y - 30 + low, x - 6 * f, y - 38 + low);
  g.fillStyle(IRON, 1); g.fillEllipse(x - 10 * f, y - 40 + low, 9, 6); g.fillEllipse(x - 2 * f, y - 40 + low, 9, 6);
  // Tail: a coiled spring.
  for (let i = 0; i < 4; i++) { g.lineStyle(2, SOLDER, 1); g.strokeCircle(x - (26 + i * 4) * f, y - 26 + low - i * 3, 3); }
  // Head and jaw.
  const hx = x + 26 * f, hy = y - 30 + low;
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(hx - 12, hy - 10, 24, 18, 5);
  g.fillStyle(BRASS, 1); g.fillRoundedRect(hx - 11, hy - 11, 22, 15, 5);
  g.fillStyle(BRASS_DARK, 1); g.fillTriangle(hx - 4 * f, hy - 10, hx - 10 * f, hy - 20, hx + 2 * f, hy - 10);
  g.fillStyle(IRON_DARK, 1); g.fillRect(hx + (f > 0 ? 4 : -18), hy + 1, 14, hunting ? 6 : 3);
  for (let i = 0; i < 3; i++) { g.fillStyle(0xffffff, 0.9); g.fillTriangle(hx + f * (6 + i * 4), hy + 1, hx + f * (8 + i * 4), hy + 1, hx + f * (7 + i * 4), hy + 4); }
  // Valve eyes.
  const ec = hunting ? FILAMENT_LIT : dim(FILAMENT, 0.3);
  if (hunting) glow(g, hx + 3 * f, hy - 5, 12, FILAMENT, 0.12, 2);
  g.fillStyle(VALVE_GLASS, 0.5); g.fillCircle(hx + 3 * f, hy - 5, 4);
  g.fillStyle(ec, 1); g.fillCircle(hx + 3 * f, hy - 5, 2.5);
  // Collar with a diode tag.
  g.lineStyle(3, IRON, 1); g.lineBetween(hx - 10 * f, hy - 8, hx - 10 * f, hy + 6);
  g.fillStyle(hunting ? FAULT : DIODE, 1); g.fillCircle(hx - 10 * f, hy + 8, 2.5);
}

export const FALLEN_WATCHDOG: GimmickDef = {
  id: ID,
  rules: 'Land a blow to kick your watchdog timer; let it run out and the chained hound leaps at you. Strike the post\'s whistle to send it at the lower timer.',
  make,
};
