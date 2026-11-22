import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { eggSac, spiderling } from './art';
import { DEW, GOLD_THREAD, LAMP_HOT, PLANK, PLANK_DARK, SILK_LIT, SPIDER_GOLD, WEFT_LIT } from './palette';
import { alive, clamp, clock, dist, segCross, segDist, wallToWall } from './util';

/**
 * The Web Court's goods: Bobbin Twill's four charms, Prince Weft's ball of thread, and the silk
 * pool's three fish. Every charm is a spider-trade thing that plays one of the court's own rules on
 * your side — the dash that leaves silk, the trapper's wire, the brood, the puppet's string.
 * Scripts are registered below under their item ids.
 */

const ISLE = 'slime';

export const CHARM_THIMBLE = 'web-charm-spinneret-thimble';
export const CHARM_PEG = 'web-charm-brass-peg';
export const CHARM_LOCKET = 'web-charm-egg-locket';
export const CHARM_CROSS = 'web-charm-crossbar';
export const ART_WEFT = 'art-weft';

export const FISH_SHINER = 'fish-spinner-shiner';
export const FISH_GOBY = 'fish-gossamer-goby';
export const FISH_SILKFIN = 'fish-silkfin';
export const FISHERY = 'web-pool';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Spinneret Thimble ────────────────────────────────────────────────
// Your dashes leave silk: a line from where the dash began to where it ended. The foe crossing one
// is snagged — stunned a moment and cut — and that line is spent.

interface Silk { ax: number; ay: number; bx: number; by: number; at: number; spent: number }

const thimble: ItemScriptFactory = (ctx) => {
  const step = clock();
  const lines: Silk[] = [];
  let px = ctx.player.x, py = ctx.player.y, nx = ctx.npc.x, ny = ctx.npc.y;
  let dashing = false, sx = 0, sy = 0, speed = 0;
  return {
    update(time) {
      const dt = step(time);
      const p = ctx.player, n = ctx.npc;
      if (live(ctx) && dt > 0) {
        const v = Math.hypot(p.x - px, p.y - py) / dt;
        speed = Math.max(v, speed * 0.5);
        if (!dashing && v > 380) { dashing = true; sx = px; sy = py; }
        else if (dashing && speed < 230) {
          dashing = false;
          if (dist(sx, sy, p.x, p.y) > 60) {
            lines.push({ ax: sx, ay: sy, bx: p.x, by: p.y, at: time, spent: 0 });
            if (lines.length > 3) lines.shift();
          }
        }
      }
      if (foeLive(ctx)) {
        for (const l of lines) {
          if (l.spent) continue;
          if (segCross(nx, ny, n.x, n.y, l.ax, l.ay, l.bx, l.by) || segDist(n.x, n.y, l.ax, l.ay, l.bx, l.by) < 10) {
            l.spent = time;
            ctx.stun(n, 450);
            ctx.hit(n, 6, n.x, n.y);
            ctx.float(n.x, n.y - 44, 'SNAGGED', '#f3f4ec');
            ctx.sfx('trap-snap');
          }
        }
      }
      for (let i = lines.length - 1; i >= 0; i--) if (time - lines[i].at > 6000 || (lines[i].spent && time - lines[i].spent > 400)) lines.splice(i, 1);
      px = p.x; py = p.y; nx = n.x; ny = n.y;
    },
    drawGround(g, time) {
      for (const l of lines) {
        const fade = l.spent ? 1 - clamp((time - l.spent) / 400, 0, 1) : clamp((6000 - (time - l.at)) / 800, 0, 1);
        g.lineStyle(2, SILK_LIT, 0.8 * fade); g.lineBetween(l.ax, l.ay, l.bx, l.by);
        g.fillStyle(DEW, 0.8 * fade); g.fillCircle(l.ax, l.ay, 3); g.fillCircle(l.bx, l.by, 3);
      }
    },
  };
};

// ── Snare's Brass Peg ────────────────────────────────────────────────
// Every 7s you drop a peg at your feet; 1.5s later a second, and a near-invisible wire runs wall
// to wall through both. The foe crossing it is snagged, and bolts fly in along the wire.

const peg: ItemScriptFactory = (ctx) => {
  const step = clock();
  let first: { x: number; y: number; at: number } | null = null;
  let wire: { x0: number; y0: number; x1: number; y1: number; at: number; tripped: number; fired: boolean } | null = null;
  let next = 0;
  let nx = ctx.npc.x, ny = ctx.npc.y;
  return {
    update(time) {
      step(time);
      const p = ctx.player, n = ctx.npc;
      if (next === 0) next = time + 3000;
      if (live(ctx) && !first && time >= next) { first = { x: p.x, y: p.y, at: time }; next = time + 7000; ctx.sfx('trap-set'); }
      if (first && time - first.at >= 1500) {
        let bx = p.x, by = p.y;
        if (dist(first.x, first.y, bx, by) < 60) { const f = ctx.facing(p); bx = first.x + Math.cos(f) * 120; by = first.y + Math.sin(f) * 120; }
        const e = wallToWall(first.x, first.y, bx, by, 20, 100, ctx.W - 20, ctx.H - 12);
        if (e) wire = { x0: e[0], y0: e[1], x1: e[2], y1: e[3], at: time, tripped: 0, fired: false };
        first = null;
      }
      if (wire && !wire.tripped && foeLive(ctx) && time - wire.at > 400 && segCross(nx, ny, n.x, n.y, wire.x0, wire.y0, wire.x1, wire.y1)) {
        wire.tripped = time;
        ctx.stun(n, 320);
        ctx.sfx('trap-snap');
      }
      if (wire && wire.tripped && !wire.fired && time - wire.tripped > 450) {
        wire.fired = true;
        ctx.sfx('musket');
        if (foeLive(ctx) && segDist(n.x, n.y, wire.x0, wire.y0, wire.x1, wire.y1) < 26) { ctx.hit(n, 15, n.x, n.y); ctx.flash(n.x, n.y, LAMP_HOT); }
      }
      if (wire && ((wire.fired && time - wire.tripped > 800) || time - wire.at > 12000)) wire = null;
      nx = n.x; ny = n.y;
    },
    drawGround(g, time) {
      if (first) { g.fillStyle(SPIDER_GOLD, 1); g.fillCircle(first.x, first.y, 4); g.lineStyle(1, SILK_LIT, 0.5); g.lineBetween(first.x, first.y, ctx.player.x, ctx.player.y); }
      if (!wire) return;
      const hot = wire.tripped > 0;
      g.lineStyle(hot ? 2 : 1, hot ? LAMP_HOT : SILK_LIT, hot ? 0.9 : 0.18 + Math.sin(time / 300) * 0.06);
      g.lineBetween(wire.x0, wire.y0, wire.x1, wire.y1);
      if (hot && wire.fired) {
        const k = clamp((time - wire.tripped - 450) / 300, 0, 1);
        const mx = (wire.x0 + wire.x1) / 2, my = (wire.y0 + wire.y1) / 2;
        for (const [x, y] of [[wire.x0, wire.y0], [wire.x1, wire.y1]] as [number, number][]) {
          g.fillStyle(PLANK_DARK, 1 - k); g.fillCircle(x + (mx - x) * k, y + (my - y) * k, 3);
        }
      }
    },
  };
};

// ── Egg-Sac Locket ───────────────────────────────────────────────────
// A hurt shakes a sac loose from the locket (at most every 5s): it lands at your feet and hatches
// 4s later — three spiderlings that run at your foe and bite. The foe treading on it squashes it.

interface LSac { x: number; y: number; at: number; gone: number }
interface LLing { x: number; y: number; a: number; at: number; bites: number; biteAt: number; dead: number }

const locket: ItemScriptFactory = (ctx) => {
  const step = clock();
  let sac: LSac | null = null;
  const lings: LLing[] = [];
  let readyAt = 0;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || now < readyAt || sac || !live(ctx)) return;
      readyAt = now + 5000;
      sac = { x: ctx.player.x, y: ctx.player.y + 6, at: now, gone: 0 };
    },
    update(time) {
      const dt = step(time);
      const n = ctx.npc;
      if (sac && !sac.gone) {
        if (foeLive(ctx) && dist(n.x, n.y, sac.x, sac.y) < 24) { sac.gone = time; ctx.sfx('slime-splat'); }
        else if (time - sac.at > 4000) {
          sac.gone = time;
          ctx.sfx('status-poison');
          for (let k = 0; k < 3; k++) lings.push({ x: sac.x, y: sac.y, a: k * 2.1, at: time, bites: 0, biteAt: 0, dead: 0 });
        }
      }
      if (sac && sac.gone && time - sac.gone > 500) sac = null;
      for (const l of lings) {
        if (l.dead) continue;
        if (time - l.at > 6000 || !foeLive(ctx)) { l.dead = time; continue; }
        l.a = Math.atan2(n.y - l.y, n.x - l.x) + Math.sin(time / 150 + l.at) * 0.4;
        if (dist(l.x, l.y, n.x, n.y) > 18) { l.x += Math.cos(l.a) * 160 * dt; l.y += Math.sin(l.a) * 160 * dt; }
        else if (time >= l.biteAt) {
          l.biteAt = time + 600;
          l.bites++;
          ctx.hit(n, 4, n.x, n.y);
          if (l.bites >= 2) l.dead = time;
        }
      }
      for (let i = lings.length - 1; i >= 0; i--) if (lings[i].dead && time - lings[i].dead > 300) lings.splice(i, 1);
    },
    drawAir(g, time) {
      if (sac && !sac.gone) eggSac(g, sac.x, sac.y - 10, 9, clamp((time - sac.at) / 4000, 0, 1), time / 1000, 4);
      for (const l of lings) if (!l.dead) spiderling(g, l.x, l.y, l.a, time / 1000, 0x3a2e44);
    },
  };
};

// ── Gepp's Crossbar ──────────────────────────────────────────────────
// Every 12s a thread drops from your crossbar onto the foe: they are walked two jerking steps
// toward you, and for a second while they dangle your blows land 30% harder.

const crossbar: ItemScriptFactory = (ctx) => {
  let next = 0;
  let caught = 0;
  let steps = 0;
  return {
    update(time) {
      if (next === 0) next = time + 6000;
      const n = ctx.npc, p = ctx.player;
      if (!caught && time >= next && foeLive(ctx) && live(ctx) && dist(n.x, n.y, p.x, p.y) < 520) {
        caught = time;
        steps = 0;
        next = time + 12000;
        ctx.boostDamage(1.3, 1100);
        ctx.float(n.x, n.y - 46, 'PUPPET', '#e2c25c');
        ctx.sfx('chain');
      }
      if (caught) {
        const due = Math.floor((time - caught) / 380) + 1;
        if (due > steps && steps < 2 && foeLive(ctx)) {
          steps++;
          const a = Math.atan2(p.y - n.y, p.x - n.x);
          const s = Math.min(42, Math.max(0, dist(n.x, n.y, p.x, p.y) - 70));
          ctx.nudge(n, Math.cos(a) * s, Math.sin(a) * s);
          ctx.stun(n, 300);
          ctx.sfx('drum-hit');
        }
        if (time - caught > 1100) caught = 0;
      }
    },
    drawAir(g, time) {
      if (!caught || !foeLive(ctx)) return;
      const n = ctx.npc;
      const jerk = Math.max(0, 1 - ((time - caught) % 380) / 140);
      const bx = n.x, by = n.y - 110;
      g.lineStyle(5, PLANK, 1); g.lineBetween(bx - 30, by, bx + 30, by); g.lineBetween(bx, by - 10, bx, by + 14);
      for (const [dx, dy] of [[-14, -14], [14, -14], [0, -34]] as [number, number][]) {
        g.lineStyle(1.5, GOLD_THREAD, 0.9); g.lineBetween(bx + dx * 1.6, by, n.x + dx, n.y + dy - jerk * 8);
      }
    },
  };
};

// ── The Spymaster's Ball of Thread (artifact) ────────────────────────
// Every blow you land ties a thread between you and the foe (up to five). Every 6s you pluck them
// all: each thread strikes for 4, and if they are far from you the threads tug them in. A hurt
// snaps one thread.

const ballOfThread: ItemScriptFactory = (ctx) => {
  let threads = 0;
  let next = 0;
  let pluckFx = 0;
  let lastTie = 0;
  return {
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || now - lastTie < 250) return;
      lastTie = now;
      threads = Math.min(5, threads + 1);
    },
    onHitTaken() { if (threads > 0) threads--; },
    update(time) {
      if (next === 0) next = time + 6000;
      if (time < next) return;
      next = time + 6000;
      if (!threads || !foeLive(ctx) || !live(ctx)) return;
      const n = ctx.npc, p = ctx.player;
      ctx.hit(n, threads * 4, n.x, n.y);
      ctx.float(n.x, n.y - 50, `PLUCK ×${threads}`, '#e2c25c');
      ctx.sfx('zap');
      const d = dist(n.x, n.y, p.x, p.y);
      if (d > 260) { const a = Math.atan2(p.y - n.y, p.x - n.x); ctx.nudge(n, Math.cos(a) * threads * 12, Math.sin(a) * threads * 12); }
      pluckFx = time;
      threads = 0;
    },
    drawAir(g, time) {
      if (!foeLive(ctx) || !live(ctx)) return;
      const n = ctx.npc, p = ctx.player;
      const plucked = time - pluckFx < 300;
      for (let i = 0; i < (plucked ? 5 : threads); i++) {
        const o = (i - 2) * 5;
        const sag = 10 + i * 4;
        const mx = (p.x + n.x) / 2, my = (p.y + n.y) / 2 + sag;
        g.lineStyle(1.2, plucked ? 0xffffff : GOLD_THREAD, plucked ? 1 - (time - pluckFx) / 300 : 0.7);
        g.beginPath(); g.moveTo(p.x, p.y - 10 + o); g.lineTo(mx, my + o); g.lineTo(n.x, n.y - 10 + o); g.strokePath();
      }
      if (threads > 0) {
        const k = 1 - clamp((next - time) / 6000, 0, 1);
        g.lineStyle(1.5, WEFT_LIT, 0.6); g.beginPath(); g.arc(p.x, p.y - 44, 7, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        if (k > 0.85) glow(g, n.x, n.y - 10, 20, GOLD_THREAD, 0.06, 2);
      }
    },
  };
};

export const WEB_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_THIMBLE, name: 'Spinneret Thimble', emoji: '🧵', kind: 'charm', price: 380, isle: ISLE,
    flavor: 'A silver thimble with a spinneret set in its tip. Arachne\'s apprentices wear them. Every flick leaves a thread.',
    script: CHARM_THIMBLE,
    scriptText: [
      'Each dash leaves a silk line from where it began to where it ended (6s, up to 3).',
      'The foe crossing one is snagged: stunned 0.45s and cut for 6. That line is spent.',
    ],
  },
  {
    id: CHARM_PEG, name: 'Snare\'s Brass Peg', emoji: '📌', kind: 'charm', price: 560, isle: ISLE,
    flavor: 'Two brass pegs on a reel of trap-silk you can barely see. Snare sells them to nobody. Bobbin sells them for him.',
    script: CHARM_PEG,
    scriptText: [
      'Every 7s you drop a peg; 1.5s later a near-invisible wire runs wall to wall through it and your new spot.',
      'The foe crossing it is snagged; bolts fly in along the wire and strike them for 15 if still on it.',
    ],
  },
  {
    id: CHARM_LOCKET, name: 'Egg-Sac Locket', emoji: '🥚', kind: 'charm', price: 760, isle: ISLE,
    flavor: 'A wicker locket with a live sac inside. Mab swears it is quite safe. Mab says that about everything.',
    effect: { maxHp: 6 },
    script: CHARM_LOCKET,
    scriptText: [
      'Taking a hit (at most every 5s) drops a sac at your feet; it hatches 4s later into 3 spiderlings.',
      'They run at the foe and bite twice each for 4. The foe treading on the sac first squashes it.',
    ],
  },
  {
    id: CHARM_CROSS, name: 'Gepp\'s Crossbar', emoji: '🎭', kind: 'charm', price: 1020, isle: ISLE,
    flavor: 'A puppeteer\'s control: two crossed sticks and three gold threads that go up into nothing and come down on someone.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_CROSS,
    scriptText: [
      'Every 12s a thread drops onto the foe (within 520px): they are walked two steps toward you, stunned each step.',
      'For 1.1s while they dangle, your blows land 30% harder.',
    ],
  },
  {
    id: ART_WEFT, name: 'The Spymaster\'s Ball of Thread', emoji: '🧶', kind: 'artifact', isle: ISLE,
    flavor: 'A ball of grey-gold thread the size of a fist, unwound from the Loft\'s listening wall. It still hums when people talk.',
    effect: { maxHp: 12 },
    script: ART_WEFT,
    scriptText: [
      'Each blow you land ties a thread between you and the foe (up to 5); taking a hit snaps one.',
      'Every 6s you pluck them all: 4 damage per thread, and a far foe is tugged toward you.',
    ],
  },
  {
    id: FISH_SHINER, name: 'Spinner-Shiner', emoji: '🐟', kind: 'fish', sell: 30, isle: ISLE,
    flavor: 'A little fish that flashes like a spun thread in the light. The spiders adore them. So, it turns out, do you.',
    effect: { speedMult: 1.03 },
  },
  {
    id: FISH_GOBY, name: 'Gossamer Goby', emoji: '🐠', kind: 'fish', sell: 46, isle: ISLE,
    flavor: 'Fins so fine you can see the water through them. It hides under the floating web and nibbles the dew.',
    effect: { dodgeChance: 0.03 },
  },
  {
    id: FISH_SILKFIN, name: 'Silkfin', emoji: '🎐', kind: 'fish', sell: 92, isle: ISLE,
    flavor: 'Long, pale, trailing fins like a bolt of silk unrolled in the water. Bobbin pays well for the fins. Don\'t ask.',
    effect: { regenPerSecond: 0.5, damageTakenMult: 0.98 },
  },
];

export const WEB_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_THIMBLE]: thimble,
  [CHARM_PEG]: peg,
  [CHARM_LOCKET]: locket,
  [CHARM_CROSS]: crossbar,
  [ART_WEFT]: ballOfThread,
};

export const WEB_SHOPS: ShopDef[] = [
  { id: 'web-shop', name: 'Twill & Daughters, Silk-Mercers', stock: [CHARM_THIMBLE, CHARM_PEG, CHARM_LOCKET, CHARM_CROSS], buys: true },
];

export const WEB_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Silk Pool', kind: 'bog' }];

export const WEB_FISH: FishDef[] = [
  { id: FISH_SHINER, fisheries: [FISHERY], weight: 6, fight: 2, size: [6, 16] },
  { id: FISH_GOBY, fisheries: [FISHERY], weight: 3.5, fight: 3, size: [8, 22] },
  { id: FISH_SILKFIN, fisheries: [FISHERY], weight: 1.4, fight: 4, size: [30, 74] },
];

