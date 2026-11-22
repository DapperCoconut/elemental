import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { ghostWalker, lanternPole } from '../art';
import { GHOST, GHOST_LIT, LANTERN } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Lost Procession — Ghostwarden Elegy.
 *
 * Every dusk the buried capital's dead walk their old Processional Way, two by two behind a
 * lantern-bearer, carrying what they were buried with. In this yard the procession comes across
 * the ruins in a long column. Step into the column and you are hidden among them — the dead take
 * most of the blows meant for you — but you are carried, walked along at their pace whether you
 * like it or not. Touch the lantern-bearer at its head and you are cursed: slowed, wasting, and
 * struck harder, for a while.
 *
 * Elegy keeps the dead. She rings her handbell, and the bearer turns: the column's new road lights
 * up across the yard, through wherever you stand. The curse knows no favourites — bring the
 * lantern through her, and drag her out of the column she hides in.
 */

const SPACING = 36;
const COUNT = 12;
const HIDE_R = 34;
const BEARER_R = 30;
const CURSE_MS = 6000;
const ROUTE_WARN = 1200;

interface Curse { until: number; lastTick: number; immuneUntil: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const speed = ctx.hard ? 84 : 70;
  /** The route the bearer is walking (waypoints) and the trail it has walked (for the column). */
  let route: Pt[] = [];
  let trail: Pt[] = [];
  let head: Pt = { x: -60, y: H / 2 };
  let walking = false;
  /** The bearer has come onto the yard (so walking off it again ends this procession). */
  let arrived = false;
  let nextEntry = 0;
  let pending: { route: Pt[]; at: number } | null = null;
  const bellEvery = ctx.hard ? 7000 : 9000;
  let nextBell = 0;
  let bellAt = -9999;
  const curses = new Map<Fighter, Curse>([[player, { until: 0, lastTick: 0, immuneUntil: 0 }], [npc, { until: 0, lastTick: 0, immuneUntil: 0 }]]);
  const hiddenNow = new Map<Fighter, boolean>([[player, false], [npc, false]]);
  let started = false;

  const off = (p: Pt) => p.x < -40 || p.x > W + 40 || p.y < top - 40 || p.y > H + 40;

  /** A fresh procession: in from one side, across in a lazy wave, out the far side. */
  function enter(): void {
    const fromLeft = rng() < 0.5;
    const y0 = top + 80 + rng() * (H - top - 160);
    const xs = fromLeft ? [-50, W * 0.3, W * 0.55, W * 0.8, W + 80] : [W + 50, W * 0.7, W * 0.45, W * 0.2, -80];
    route = xs.map((x, i) => ({ x, y: i === 0 ? y0 : clamp(y0 + (i % 2 ? 1 : -1) * (80 + rng() * 120), top + 60, H - 50) }));
    head = { ...route[0] };
    route.shift();
    trail = [{ ...head }];
    walking = true;
    arrived = false;
    ctx.banner('THE LOST PROCESSION COMES', '#d8f0e8');
    ctx.sfx('hush');
  }

  /** Points along the walked trail, `d` px behind the head. */
  function behind(d: number): Pt | null {
    let acc = 0;
    let prev = head;
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      const seg = dist(prev.x, prev.y, p.x, p.y);
      if (acc + seg >= d) {
        const k = seg > 0 ? (d - acc) / seg : 0;
        return { x: prev.x + (p.x - prev.x) * k, y: prev.y + (p.y - prev.y) * k };
      }
      acc += seg;
      prev = p;
    }
    return null;
  }

  function walkers(): { p: Pt; dir: number }[] {
    const out: { p: Pt; dir: number }[] = [];
    for (let i = 1; i <= COUNT; i++) {
      const p = behind(i * SPACING);
      if (!p) break;
      const q = behind(i * SPACING - 6) ?? head;
      out.push({ p, dir: Math.atan2(q.y - p.y, q.x - p.x) });
    }
    return out;
  }

  const nearestWalker = (f: Fighter) => {
    let best: { p: Pt; dir: number } | null = null, bd = Infinity;
    for (const w of walkers()) { const d = dist(w.p.x, w.p.y, f.x, f.y); if (d < bd) { bd = d; best = w; } }
    return best && bd < HIDE_R ? best : null;
  };

  const cursed = (f: Fighter) => ctx.scene.time.now < (curses.get(f)?.until ?? 0);

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextEntry = time + 1200; nextBell = time + 5500; }
      if (!walking && time >= nextEntry) enter();

      // Elegy's handbell: the bearer turns toward wherever you stand.
      if (walking && time >= nextBell && alive(npc) && alive(player)) {
        nextBell = time + bellEvery;
        bellAt = time;
        const a = Math.atan2(player.y - head.y, player.x - head.x);
        const beyond = { x: player.x + Math.cos(a) * 1200, y: player.y + Math.sin(a) * 1200 };
        pending = { route: [{ x: player.x, y: player.y }, beyond], at: time + ROUTE_WARN };
        ctx.banner('ELEGY RINGS THE BELL', '#d8f0e8');
        ctx.sfx('crystal-chime');
      }
      if (pending && time >= pending.at) { route = pending.route; pending = null; }

      if (walking) {
        // The bearer walks the route.
        const tgt = route[0];
        if (tgt) {
          const d = dist(head.x, head.y, tgt.x, tgt.y);
          const step = speed * dt;
          if (d <= step) { head = { ...tgt }; route.shift(); }
          else { head = { x: head.x + ((tgt.x - head.x) / d) * step, y: head.y + ((tgt.y - head.y) / d) * step }; }
        }
        const last = trail[trail.length - 1];
        if (!last || dist(last.x, last.y, head.x, head.y) > 5) trail.push({ ...head });
        if (trail.length > 400) trail.splice(0, trail.length - 400);
        if (!off(head)) arrived = true;
        // All gone off the yard: the next procession comes after a while.
        const tail = behind(COUNT * SPACING);
        if (arrived && (!tgt || off(head)) && (!tail || off(tail)) && walkers().every((w) => off(w.p))) {
          walking = false;
          nextEntry = time + 2600;
        }
      }

      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        // Inside the column: hidden, and carried at the dead's pace.
        const w = walking ? nearestWalker(f) : null;
        hiddenNow.set(f, !!w);
        if (w) ctx.nudge(f, Math.cos(w.dir) * speed * dt * 0.9, Math.sin(w.dir) * speed * dt * 0.9);
        // The lantern-bearer's touch.
        const c = curses.get(f);
        if (!c) continue;
        if (walking && time >= c.immuneUntil && dist(head.x, head.y, f.x, f.y) < BEARER_R + 12) {
          c.until = time + CURSE_MS;
          c.immuneUntil = time + CURSE_MS + 2000;
          ctx.float(f.x, f.y - 46, 'CURSED', '#a8f0d0');
          ctx.sfx('curse-cast');
        }
        if (time < c.until && time - c.lastTick > 500) {
          c.lastTick = time;
          ctx.hit(f, ctx.hard ? 2 : 1.5, f.x, f.y);
        }
      }
    },

    playerSpeedMult() { return cursed(player) ? 0.7 : 1; },
    npcSpeedMult() { return cursed(npc) ? 0.7 : 1; },
    playerTakenMult() { return (hiddenNow.get(player) ? 0.45 : 1) * (cursed(player) ? 1.3 : 1); },
    npcTakenMult() { return (hiddenNow.get(npc) ? 0.45 : 1) * (cursed(npc) ? 1.3 : 1); },

    npcSeek() {
      // Hurt or crowded, she slips into the middle of the column — well clear of the bearer.
      const hurt = npc.hp < npc.maxHp * 0.6 || dist(npc.x, npc.y, player.x, player.y) < 140;
      if (walking && hurt) {
        const mid = behind(SPACING * Math.round(COUNT * 0.6));
        if (mid && !off(mid)) return { x: clamp(mid.x, 60, W - 60), y: clamp(mid.y, top + 50, H - 40) };
      }
      // Otherwise, keep the bearer's road between you and her.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      let x = player.x + Math.cos(a) * 250, y = player.y + Math.sin(a) * 220;
      if (walking && dist(x, y, head.x, head.y) < 110) { x += (x - head.x) * 0.8; y += (y - head.y) * 0.8; }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The dead's road: a faint trodden line of grave-dust behind the column.
      if (walking && trail.length > 1) {
        for (let i = Math.max(1, trail.length - 160); i < trail.length; i += 2) {
          const p = trail[i], q = trail[i - 1];
          g.lineStyle(26, GHOST, 0.04); g.lineBetween(q.x, q.y, p.x, p.y);
        }
      }
      // The bell's new road, lighting up ahead of the bearer.
      if (pending) {
        const k = clamp(1 - (pending.at - time) / ROUTE_WARN, 0, 1);
        const pts = [head, ...pending.route];
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const d = dist(a.x, a.y, b.x, b.y);
          for (let s = 0; s < d; s += 26) {
            const x = a.x + ((b.x - a.x) * s) / d, y = a.y + ((b.y - a.y) * s) / d;
            if (x < 0 || x > W || y < top || y > H) continue;
            g.fillStyle(GHOST_LIT, 0.15 + k * 0.45); g.fillCircle(x, y, 3 + k * 2);
          }
        }
      }
      // The lantern's pool of light on the ground.
      if (walking) glow(g, head.x, head.y, 70, LANTERN, 0.05, 3);
      // A cursed fighter's grave-mould ring.
      for (const f of [player, npc]) {
        if (!alive(f) || !cursed(f)) continue;
        g.lineStyle(2, 0x7ad0a8, 0.4 + Math.sin(time / 120) * 0.2); g.strokeEllipse(f.x, f.y + 8, 52, 20);
      }
      // Elegy's bell: a ring off her.
      if (time - bellAt < 900 && alive(npc)) {
        const k = (time - bellAt) / 900;
        g.lineStyle(2, GHOST_LIT, 0.6 * (1 - k)); g.strokeCircle(npc.x, npc.y - 20, 20 + k * 90);
      }
    },

    drawAir(g, time) {
      if (!walking) {
        // The next procession's lantern glimmering at the yard's edge.
        const k = clamp(1 - (nextEntry - time) / 2600, 0, 1);
        if (k > 0.3) { glow(g, 30, H / 2, 40, LANTERN, 0.04 * k, 3); glow(g, W - 30, H / 2, 40, LANTERN, 0.04 * k, 3); }
        return;
      }
      // The column, tail first so the near walkers overlap.
      const ws = walkers();
      for (let i = ws.length - 1; i >= 0; i--) {
        const w = ws[i];
        const side = (i % 2 ? 1 : -1) * 9;
        const nx = -Math.sin(w.dir) * side, ny = Math.cos(w.dir) * side;
        const fade = 1 - i / (ws.length + 3);
        ghostWalker(g, w.p.x + nx, w.p.y + ny, 0.9, time / 160 + i * 1.7, 0.55 + fade * 0.4, i % 3);
      }
      // The lantern-bearer: taller, hood up, the lantern held out on its pole.
      ghostWalker(g, head.x, head.y, 1.15, time / 160, 1, 0);
      lanternPole(g, head.x + 8, head.y, 1, 0.8 + Math.sin(time / 90) * 0.2, 1);
      g.lineStyle(1.5, LANTERN, 0.3 + Math.sin(time / 150) * 0.15); g.strokeCircle(head.x, head.y - 10, BEARER_R + 8);
      // Hidden fighters: a pale shroud over them.
      for (const f of [player, npc]) {
        if (!alive(f) || !hiddenNow.get(f)) continue;
        g.fillStyle(GHOST, 0.22); g.fillEllipse(f.x, f.y - 18, 40, 52);
      }
    },
  };
}

export const PROCESSION: GimmickDef = {
  id: 'rubble-procession',
  rules: 'A procession of the buried dead crosses the yard. In its column you are hidden but carried. Touch the lantern-bearer and you are cursed. Elegy\'s bell turns them toward you.',
  make,
};
