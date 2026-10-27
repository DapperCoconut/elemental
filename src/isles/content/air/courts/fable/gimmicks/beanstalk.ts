import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_BEANSTALK } from '../encounters';
import {
  BEAN, BEAN_DARK, BEAN_LIT, CLOUD, FOE_C, INK, MINE_C, beanstalk, clamp, cloudPuff, dist, frameClock,
  giantBoot,
} from '../util';

/**
 * Beanstalk — Beanboy Jem plays the beanstalk tale three times a day, and the giant up in the
 * clouds has never once missed his cue. Beans sprout across the yard and shoot up into the cloud;
 * **stand at a grown stalk's root a moment and you climb it**. Up there the leaves hide you — no
 * blow reaches you — and everything you throw rains down on the foe a third harder.
 *
 * The catch is the giant's boot. Every few seconds its shadow spreads on the yard over one stalk —
 * he goes for a stalk with someone on it, first — and then it **stomps**: the stalk is crushed,
 * anyone on it falls (hurt and dazed) and anyone under the sole is flattened.
 *
 * The rule the player can turn: the boot can only chase one stalk at a time. Climb the moment it
 * lifts off Jem's, and come down the moment the shadow starts to spread on yours.
 */

interface Stalk {
  x: number; y: number;
  bornAt: number;
  /** Full height at this time. */
  grownAt: number;
  crushedAt: number;
  seed: number;
}
type Side = 'p' | 'n';
interface Climber { stalk: Stalk | null; since: number; progress: number }
interface Stomp { x: number; y: number; at: number; landAt: number; stalk: Stalk | null; dealt: boolean }

const CLIMB_R = 30;

function makeBeanstalk(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const growMs = 1600;
  const sproutEvery = hard ? 2600 : 3200;
  const stompEvery = hard ? 3400 : 4200;
  const stompWarn = hard ? 1150 : 1350;
  const stompR = 66;
  const MAX_STALKS = 3;
  const t0 = ctx.scene.time.now;

  let stalks: Stalk[] = [];
  const climb: Record<Side, Climber> = { p: { stalk: null, since: 0, progress: 0 }, n: { stalk: null, since: 0, progress: 0 } };
  let stomp: Stomp | null = null;
  let nextSprout = t0 + 600;
  let nextStomp = t0 + 4200;
  let seedN = 0;
  const crushed: { x: number; y: number; at: number }[] = [];

  const fighter = (s: Side): Fighter => (s === 'p' ? ctx.player : ctx.npc);
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const grown = (s: Stalk, time: number): boolean => time >= s.grownAt && s.crushedAt < 0;
  const up = (s: Side): boolean => climb[s].stalk !== null;

  const sprout = (time: number): void => {
    for (let i = 0; i < 12; i++) {
      const x = 110 + ctx.rng() * (W - 220), y = top + 120 + ctx.rng() * (H - top - 200);
      if (stalks.some((s) => dist(s.x, s.y, x, y) < 190)) continue;
      if (dist(x, y, ctx.player.x, ctx.player.y) < 60 || dist(x, y, ctx.npc.x, ctx.npc.y) < 60) continue;
      stalks.push({ x, y, bornAt: time, grownAt: time + growMs, crushedAt: -1, seed: seedN++ });
      ctx.sfx('stone-rise');
      return;
    }
  };

  /** The giant picks his stalk: one with a climber (the longer-perched first), else any grown one, else your feet. */
  const pickStomp = (time: number): void => {
    let target: Stalk | null = null;
    const sides: Side[] = ['p', 'n'];
    sides.sort((a, b) => (climb[a].stalk ? climb[a].since : Infinity) - (climb[b].stalk ? climb[b].since : Infinity));
    for (const s of sides) if (climb[s].stalk) { target = climb[s].stalk; break; }
    if (!target) {
      const ready = stalks.filter((s) => grown(s, time));
      if (ready.length) target = ready[Math.floor(ctx.rng() * ready.length)];
    }
    const at = target ? { x: target.x, y: target.y } : { x: clamp(ctx.player.x, 80, W - 80), y: clamp(ctx.player.y, top + 80, H - 60) };
    stomp = { x: at.x, y: at.y, at: time, landAt: time + ctx.tk.warn(stompWarn), stalk: target, dealt: false };
    ctx.sfx('quake');
  };

  const fall = (s: Side): void => {
    const f = fighter(s);
    climb[s].stalk = null; climb[s].progress = 0;
    if (!alive(f)) return;
    ctx.hit(f, hard ? 20 : 17, f.x, f.y);
    ctx.stun(f, 900);
    ctx.float(f.x, f.y - 54, 'FELL!', s === 'p' ? '#ffb27a' : '#9ae8ff');
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;

      if (time >= nextSprout) {
        nextSprout = time + sproutEvery;
        if (stalks.filter((s) => s.crushedAt < 0).length < MAX_STALKS) sprout(time);
      }

      // Climbing: stand at a grown root to go up; step away to come down.
      for (const s of ['p', 'n'] as Side[]) {
        const f = fighter(s), c = climb[s];
        if (!alive(f)) { c.stalk = null; c.progress = 0; continue; }
        if (c.stalk) {
          if (c.stalk.crushedAt >= 0 || dist(f.x, f.y, c.stalk.x, c.stalk.y) > CLIMB_R + 16) { c.stalk = null; c.progress = 0; }
          continue;
        }
        const at = stalks.find((st) => grown(st, time) && dist(f.x, f.y, st.x, st.y) < CLIMB_R && climb[s === 'p' ? 'n' : 'p'].stalk !== st);
        if (at) {
          c.progress += dt / 0.6;
          if (c.progress >= 1) {
            c.stalk = at; c.since = time; c.progress = 0;
            ctx.float(f.x, f.y - 54, 'UP THE STALK', s === 'p' ? '#b8f08a' : '#9ae8ff');
            ctx.sfx('wings');
          }
        } else c.progress = Math.max(0, c.progress - dt * 2);
      }

      // The boot.
      if (!stomp && time >= nextStomp) pickStomp(time);
      if (stomp && !stomp.dealt && time >= stomp.landAt) {
        stomp.dealt = true;
        const st = stomp.stalk;
        if (st && st.crushedAt < 0) { st.crushedAt = time; crushed.push({ x: st.x, y: st.y, at: time }); }
        for (const s of ['p', 'n'] as Side[]) {
          const f = fighter(s);
          if (st && climb[s].stalk === st) { fall(s); continue; }
          if (!up(s) && alive(f) && dist(f.x, f.y, stomp.x, stomp.y) < stompR + 16) {
            ctx.hit(f, hard ? 15 : 13, f.x, f.y);
            const a = Math.atan2(f.y - stomp.y, f.x - stomp.x);
            ctx.nudge(f, Math.cos(a) * 50, Math.sin(a) * 50);
          }
        }
        ctx.sfx('gravity-slam');
        ctx.flash(stomp.x, stomp.y, 0x8a6a4a);
        nextStomp = time + stompEvery;
      }
      if (stomp && time > stomp.landAt + 700) stomp = null;
      stalks = stalks.filter((s) => s.crushedAt < 0 || time - s.crushedAt < 200);
      for (let i = crushed.length - 1; i >= 0; i--) if (time - crushed[i].at > 6000) crushed.splice(i, 1);
    },

    playerTakenMult: () => (up('p') ? 0 : up('n') ? 1.33 : 1),
    npcTakenMult: () => (up('n') ? 0 : up('p') ? 1.33 : 1),

    npcSeek(): Pt | null {
      const n = ctx.npc, now = ctx.scene.time.now;
      // Under the shadow, or up a doomed stalk: get clear.
      const doomed = stomp !== null && stomp.stalk !== null && climb.n.stalk === stomp.stalk;
      if (stomp && !stomp.dealt && (doomed || dist(n.x, n.y, stomp.x, stomp.y) < stompR + 40)) {
        const a = Math.atan2(n.y - stomp.y, n.x - stomp.x) + 0.3;
        return { x: clamp(stomp.x + Math.cos(a) * 170, 60, W - 60), y: clamp(stomp.y + Math.sin(a) * 170, top + 50, H - 50) };
      }
      if (climb.n.stalk) return { x: climb.n.stalk.x, y: climb.n.stalk.y };
      // Otherwise make for the nearest grown stalk the boot is not over.
      let best: Stalk | null = null, bd = Infinity;
      for (const s of stalks) {
        if (!grown(s, now) || climb.p.stalk === s || (stomp && stomp.stalk === s)) continue;
        const d = dist(n.x, n.y, s.x, s.y);
        if (d < bd) { bd = d; best = s; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      // Flattened stalks: a green smear and a boot-print.
      for (const c of crushed) {
        const k = clamp(1 - (time - c.at) / 6000, 0, 1);
        g.fillStyle(BEAN_DARK, 0.5 * k); g.fillEllipse(c.x, c.y, 90, 34);
        g.lineStyle(2, INK, 0.3 * k); g.strokeEllipse(c.x - 10, c.y, 120, 44); g.strokeEllipse(c.x + 56, c.y + 2, 36, 30);
      }
      for (const s of stalks) {
        // Root mound and the climb ring.
        g.fillStyle(0x6a5232, 0.8); g.fillEllipse(s.x, s.y + 4, 56, 20);
        g.lineStyle(2, INK, 0.5); g.strokeEllipse(s.x, s.y + 4, 56, 20);
        if (grown(s, time)) { g.lineStyle(2, BEAN_LIT, 0.55 + 0.25 * Math.sin(time / 200 + s.seed)); g.strokeEllipse(s.x, s.y + 4, CLIMB_R * 2.4, CLIMB_R * 1.1); }
        else { const k = clamp((time - s.bornAt) / growMs, 0, 1); g.lineStyle(2, BEAN_LIT, 0.4); g.beginPath(); g.arc(s.x, s.y + 4, CLIMB_R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath(); }
      }
      // The boot's shadow, spreading as it comes down.
      if (stomp && !stomp.dealt) {
        const k = clamp((time - stomp.at) / (stomp.landAt - stomp.at), 0, 1);
        g.fillStyle(0x000000, 0.12 + k * 0.28); g.fillEllipse(stomp.x, stomp.y, (stompR * 2 + 40) * (0.4 + k * 0.6), (stompR + 10) * (0.4 + k * 0.6));
        g.lineStyle(3, 0xff7a4a, 0.4 + k * 0.5); g.strokeEllipse(stomp.x, stomp.y, stompR * 2 + 32, stompR + 16);
        if (k > 0.8 && Math.floor(time / 70) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.4); g.strokeEllipse(stomp.x, stomp.y, stompR * 2 + 40, stompR + 22); }
      }
      if (stomp && stomp.dealt) {
        const k = (time - stomp.landAt) / 700;
        g.lineStyle(6 * (1 - k), 0x8a6a4a, 0.7 * (1 - k)); g.strokeEllipse(stomp.x, stomp.y, (stompR * 2) * (1 + k), stompR * (1 + k));
      }
    },

    drawAir(g, time) {
      const ts = time / 1000;
      for (const s of stalks) {
        const k = s.crushedAt >= 0 ? 1 - (time - s.crushedAt) / 200 : clamp((time - s.bornAt) / growMs, 0, 1);
        beanstalk(g, s.x, s.y, top - 10, ts + s.seed, k, 1, 1);
        if (k >= 1) for (let i = 0; i < 2; i++) cloudPuff(g, s.x - 30 + i * 60 + Math.sin(ts * 0.6 + i + s.seed) * 10, top + 18, 30, 0.85);
      }
      // Climbers: vines wrapped round them and a leaf canopy over their heads.
      for (const sd of ['p', 'n'] as Side[]) {
        const f = fighter(sd), c = climb[sd];
        if (!alive(f)) continue;
        if (c.stalk) {
          const col = sd === 'p' ? MINE_C : FOE_C;
          g.lineStyle(4, BEAN, 0.9);
          for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(f.x, f.y - 6 + k * 10, 22, Math.PI * 0.1 + k, Math.PI * 1.2 + k, false); g.strokePath(); }
          for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.5; g.fillStyle(BEAN_LIT, 0.9); g.fillCircle(f.x + Math.cos(a) * 26, f.y - 30 + Math.sin(a) * 10, 8); }
          g.fillStyle(col, 0.9); g.fillTriangle(f.x - 6, f.y - 62, f.x + 6, f.y - 62, f.x, f.y - 72);
        } else if (c.progress > 0) {
          g.lineStyle(3, BEAN_LIT, 0.85); g.beginPath(); g.arc(f.x, f.y, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.progress, false); g.strokePath();
        }
      }
      // The boot itself, coming down out of the cloud.
      if (stomp) {
        const total = stomp.landAt - stomp.at;
        const k = clamp((time - stomp.at) / total, 0, 1);
        const lift = stomp.dealt ? clamp((time - stomp.landAt - 250) / 450, 0, 1) * 400 : (1 - k * k) * 420;
        const alpha = stomp.dealt ? 1 - clamp((time - stomp.landAt - 250) / 450, 0, 1) : clamp(k * 2, 0, 1);
        if (alpha > 0.02) giantBoot(g, stomp.x - 10, stomp.y + 6, 0.62, 1, lift, alpha);
        if (!stomp.dealt && k > 0.2) for (let i = 0; i < 3; i++) cloudPuff(g, stomp.x - 50 + i * 50, stomp.y - 6 - lift * 0.9 - 80, 26, 0.6 * alpha, CLOUD);
      }
    },

    drawHud(g, time) {
      // Who is up: two leaf pips, top centre, and the boot's countdown under them.
      const x = W / 2, y = top + 14;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 60, y - 10, 120, 24, 6);
      for (const [sd, dx] of [['p', -30], ['n', 30]] as const) {
        g.fillStyle(sd === 'p' ? MINE_C : FOE_C, 1); g.fillCircle(x + dx, y + 2, 5);
        if (up(sd)) { g.fillStyle(BEAN_LIT, 1); g.fillEllipse(x + dx, y - 6, 14, 6); }
      }
      const k = stomp ? 1 : clamp(1 - (nextStomp - time) / stompEvery, 0, 1);
      g.fillStyle(0x6a4228, 1); g.fillRect(x - 12, y + 6, 24 * k, 4);
      g.lineStyle(1, INK, 0.8); g.strokeRect(x - 12, y + 6, 24, 4);
    },
  };
}

export const BEANSTALK_GIMMICK: GimmickDef = {
  id: GIM_BEANSTALK,
  rules: 'Stand at a grown beanstalk to climb it: up top no blow reaches you and your hits land a third harder. The giant\'s boot stomps one stalk at a time — whoever is up it falls.',
  make: makeBeanstalk,
};
