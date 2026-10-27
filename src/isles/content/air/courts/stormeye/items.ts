import type Phaser from 'phaser';
import type {
  FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { Clock, S, SCOL, alive, dist, drawBolt, drawHailstone, drawRod, drawWeathercock, jit } from './util';

/**
 * The Stormeye Court's goods: four charms from Brassey's storm chandlery, Prince Squall's artifact,
 * and the three catches of the Great Cistern. Every charm is a piece of storm gear a Stormeye
 * household would actually own — a rod tack, a barometer locket, a thimble of hail, a compass that
 * finds the calm — and the artifact is the weathercock off the top of the Barometer Tower.
 */

// ── Charm: Rod Tack ──────────────────────────────────────────────────

/**
 * A finger-length copper rod with a spike to tack it into the ground — the kind Stormeye children
 * carry to school. Every nine seconds one plants itself at your feet. While you stand within reach
 * of it, the next real blow you take (8 or more) is grounded: half of it comes back to you as
 * health, and the rod throws the charge into the foe if they are near enough. Then it is spent.
 */
const rodTack: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let rod: { x: number; y: number; at: number } | null = null;
  let nextAt = -1;
  let now = 0;
  let arc: { x1: number; y1: number; x2: number; y2: number; at: number } | null = null;
  const REACH = 80, ZAP = 260, LIFE = 9000;
  return {
    update(time: number) {
      clock.tick(time);
      now = time;
      if (nextAt < 0) nextAt = time + 3000;
      if (rod && time - rod.at > LIFE) rod = null;
      if (!rod && time >= nextAt && alive(ctx.player)) {
        rod = { x: ctx.player.x + 18, y: ctx.player.y + 16, at: time };
        nextAt = time + 9000;
        ctx.sfx('trap-set');
      }
    },
    onHitTaken(amount: number) {
      const p = ctx.player;
      if (!rod || amount < 8 || !alive(p) || dist(p.x, p.y, rod.x, rod.y) > REACH) return;
      ctx.heal(p, Math.round(amount * 0.5));
      ctx.float(p.x, p.y - 50, 'GROUNDED', SCOL.violet);
      const n = ctx.npc;
      if (alive(n) && dist(n.x, n.y, rod.x, rod.y) < ZAP) {
        ctx.hit(n, 11, n.x, n.y);
        arc = { x1: rod.x, y1: rod.y - 30, x2: n.x, y2: n.y - 10, at: now };
        ctx.sfx('zap');
      } else ctx.sfx('status-shock');
      rod = null;
    },
    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      if (!rod) return;
      const k = Math.sin(time / 300) * 0.5 + 0.5;
      g.lineStyle(1.5, S.copperLit, 0.25 + k * 0.2); g.strokeEllipse(rod.x, rod.y, REACH * 2, REACH * 1.2);
    },
    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      if (rod) drawRod(g, rod.x, rod.y, 34, 0.3 + Math.sin(time / 120) * 0.2);
      if (arc && time - arc.at < 260) drawBolt(g, arc.x1, arc.y1, arc.x2, arc.y2, arc.at % 97, 1 - (time - arc.at) / 260, 2.5, 16);
    },
  };
};

// ── Charm: Barometer Locket ──────────────────────────────────────────

/**
 * A brass locket with a barometer face, warm from being worn. It reads the fight's pressure: every
 * blow you land pushes the needle up, every blow you take drags it down, and it eases back toward the
 * middle on its own. Up at FAIR, it bursts into a fair spell — quick feet and a little mending. Down
 * at STORMY, the low breaks as a squall from your body that strikes a foe close by.
 */
const barometerLocket: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let pressure = 0;
  let burst: { kind: 'fair' | 'squall'; at: number; x: number; y: number } | null = null;
  const TOP = 30;
  return {
    update(time: number) {
      const dt = clock.tick(time);
      pressure -= Math.sign(pressure) * Math.min(Math.abs(pressure), 2 * dt);
      const p = ctx.player;
      if (pressure >= TOP && alive(p)) {
        pressure = 0;
        ctx.boostSpeed(1.18, 3000);
        ctx.heal(p, 6);
        ctx.float(p.x, p.y - 52, 'FAIR SPELL', SCOL.blue);
        ctx.sfx('status-buff');
        burst = { kind: 'fair', at: time, x: p.x, y: p.y };
      } else if (pressure <= -TOP && alive(p)) {
        pressure = 0;
        const n = ctx.npc;
        if (alive(n) && dist(n.x, n.y, p.x, p.y) < 170) {
          ctx.hit(n, 14, n.x, n.y);
          ctx.float(n.x, n.y - 50, 'SQUALL', SCOL.violet);
        }
        ctx.sfx('gust');
        burst = { kind: 'squall', at: time, x: p.x, y: p.y };
      }
    },
    onHitDealt(amount: number) { pressure = Math.min(TOP, pressure + amount * 0.6); },
    onHitTaken(amount: number) { pressure = Math.max(-TOP, pressure - amount); },
    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      const p = ctx.player;
      if (!alive(p)) return;
      // The little dial over your shoulder.
      const x = p.x + 26, y = p.y - 36;
      g.fillStyle(S.brassDark, 0.9); g.fillCircle(x, y, 8);
      g.fillStyle(0xf0e8d0, 0.95); g.fillCircle(x, y, 6);
      g.lineStyle(2, S.galeLit, 0.9); g.beginPath(); g.arc(x, y, 4.5, Math.PI * 0.8, Math.PI * 1.25, false); g.strokePath();
      g.lineStyle(2, S.eye, 0.9); g.beginPath(); g.arc(x, y, 4.5, Math.PI * 1.75, Math.PI * 2.2, false); g.strokePath();
      const a = Math.PI * 1.5 + (pressure / TOP) * Math.PI * 0.55;
      g.lineStyle(1.5, S.red, 1); g.lineBetween(x, y, x + Math.cos(a) * 5.5, y + Math.sin(a) * 5.5);
      if (burst && time - burst.at < 600) {
        const k = (time - burst.at) / 600;
        if (burst.kind === 'fair') { g.lineStyle(3, S.eyeLit, 1 - k); g.strokeCircle(burst.x, burst.y, 20 + k * 50); }
        else {
          for (let i = 0; i < 10; i++) {
            const an = (i / 10) * Math.PI * 2 + k * 2;
            g.lineStyle(2, S.galeLit, 1 - k); g.lineBetween(burst.x + Math.cos(an) * k * 40, burst.y + Math.sin(an) * k * 40, burst.x + Math.cos(an + 0.4) * k * 170, burst.y + Math.sin(an + 0.4) * k * 170);
          }
        }
      }
    },
  };
};

// ── Charm: Hailstone Thimble ─────────────────────────────────────────

/**
 * A pewter thimble with a hailstone in it that never melts — Grue's yard sells them as curiosities.
 * Every third blow you land, it calls a hailstone down on the spot where your foe stands: a shadow
 * first, then the stone. A foe who keeps still for it gets a cracked crown.
 */
const hailThimble: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let count = 0;
  let now = 0;
  let calls: { x: number; y: number; at: number; landAt: number; done: boolean; seed: number }[] = [];
  const R = 34, WARN = 800;
  return {
    update(time: number) {
      clock.tick(time);
      now = time;
      for (const c of calls) {
        if (c.done || time < c.landAt) continue;
        c.done = true;
        const n = ctx.npc;
        if (alive(n) && dist(n.x, n.y, c.x, c.y) < R + 10) {
          ctx.hit(n, 12, n.x, n.y);
          ctx.float(n.x, n.y - 50, 'HAILSTONE', SCOL.ice);
        }
        ctx.sfx('ice-shatter');
      }
      calls = calls.filter((c) => !c.done || time - c.landAt < 400);
    },
    onHitDealt() {
      count++;
      if (count % 3 !== 0) return;
      const n = ctx.npc;
      if (!alive(n)) return;
      calls.push({ x: n.x, y: n.y + 6, at: now, landAt: now + WARN, done: false, seed: ctx.rng() * 50 });
    },
    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      for (const c of calls) {
        if (c.done) continue;
        const k = Math.min(1, (time - c.at) / WARN);
        g.fillStyle(0x0a0e16, 0.15 + k * 0.3); g.fillEllipse(c.x, c.y, R * 2, R * 1.1);
        g.lineStyle(1.5, S.hail, 0.4 + k * 0.5); g.strokeEllipse(c.x, c.y, R * 2, R * 1.1);
      }
    },
    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      for (const c of calls) {
        if (c.done) {
          const k = (time - c.landAt) / 400;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + jit(c.seed, i);
            g.fillStyle(S.hail, 1 - k); g.fillCircle(c.x + Math.cos(a) * k * 30, c.y + Math.sin(a) * k * 14 - Math.sin(k * Math.PI) * 10, 2.5);
          }
          continue;
        }
        const k = Math.min(1, (time - c.at) / WARN);
        if (k > 0.4) drawHailstone(g, c.x, c.y - (1 - k) * 300, 6, 1);
      }
    },
  };
};

// ── Charm: Calm Compass ──────────────────────────────────────────────

/**
 * A brass compass whose needle points not north but at the nearest calm. Every twelve seconds it
 * finds one under your feet: a circle of clear blue sky opens on the ground for a few seconds.
 * While you stand in it your blows land harder and you mend a little — the calm is yours, not the foe's.
 */
const calmCompass: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let eye: { x: number; y: number; at: number } | null = null;
  let nextAt = -1;
  let boostUntil = 0;
  let healAcc = 0;
  const R = 95, LIFE = 4500;
  return {
    update(time: number) {
      const dt = clock.tick(time);
      if (nextAt < 0) nextAt = time + 5000;
      const p = ctx.player;
      if (!eye && time >= nextAt && alive(p)) {
        eye = { x: p.x, y: p.y + 10, at: time };
        nextAt = time + 12000;
        ctx.sfx('sparkle');
      }
      if (eye && time - eye.at > LIFE) eye = null;
      if (eye && alive(p) && dist(p.x, p.y, eye.x, eye.y) < R) {
        // One window at a time, renewed only as the last runs out, so they never stack.
        if (time >= boostUntil) { ctx.boostDamage(1.2, 300); boostUntil = time + 300; }
        healAcc += dt * 2;
        if (healAcc >= 1) { ctx.heal(p, Math.floor(healAcc)); healAcc -= Math.floor(healAcc); }
      }
    },
    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      if (!eye) return;
      const age = (time - eye.at) / LIFE;
      const k = Math.min(1, (time - eye.at) / 300) * (age > 0.85 ? (1 - age) / 0.15 : 1);
      g.fillStyle(S.eye, 0.16 * k); g.fillEllipse(eye.x, eye.y, R * 2, R * 1.2);
      g.fillStyle(S.eyeLit, 0.1 * k); g.fillEllipse(eye.x - R * 0.3, eye.y - R * 0.15, R * 0.8, R * 0.4);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 - time / 1500;
        g.fillStyle(S.cloudLit, 0.5 * k); g.fillCircle(eye.x + Math.cos(a) * R, eye.y + Math.sin(a) * R * 0.6, 7);
      }
      // A compass needle on the ground pointing at you.
      const p = ctx.player;
      const a = Math.atan2(p.y - eye.y, p.x - eye.x);
      g.lineStyle(3, S.red, 0.7 * k); g.lineBetween(eye.x, eye.y, eye.x + Math.cos(a) * 22, eye.y + Math.sin(a) * 13);
      g.fillStyle(S.brass, k); g.fillCircle(eye.x, eye.y, 4);
    },
  };
};

// ── Artifact: The Weathercock ────────────────────────────────────────

/**
 * The copper weathercock off the Barometer Tower, small enough now to sit on your shoulder. Every
 * fifteen seconds it spins and calls a forecast on the last eight seconds of the fight. Losing them?
 * STORM — three bolts called down on your foe, each marked on the ground first. Winning? FAIR — a
 * mend and quick feet. Even? SQUALL — your blows land a quarter harder for a while.
 */
const weathercock: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  const dealt: { at: number; n: number }[] = [];
  const taken: { at: number; n: number }[] = [];
  let nextAt = -1;
  let spinAt = -9999;
  let now = 0;
  let bolts: { x: number; y: number; at: number; landAt: number; done: boolean; seed: number }[] = [];
  const sum = (xs: { at: number; n: number }[]) => xs.reduce((a, b) => a + b.n, 0);
  return {
    update(time: number) {
      clock.tick(time);
      now = time;
      if (nextAt < 0) nextAt = time + 8000;
      while (dealt.length && time - dealt[0].at > 8000) dealt.shift();
      while (taken.length && time - taken[0].at > 8000) taken.shift();
      const p = ctx.player, n = ctx.npc;
      if (time >= nextAt && alive(p)) {
        nextAt = time + 15000;
        spinAt = time;
        const d = sum(dealt), t = sum(taken);
        ctx.sfx('wings');
        if (t > d * 1.1 + 4) {
          ctx.float(p.x, p.y - 60, 'FORECAST: STORM', SCOL.violet);
          for (let i = 0; i < 3; i++) {
            const at = time + 300 + i * 500;
            bolts.push({ x: n.x, y: n.y, at, landAt: at + 600, done: false, seed: ctx.rng() * 100 });
          }
        } else if (d > t * 1.1 + 4) {
          ctx.float(p.x, p.y - 60, 'FORECAST: FAIR', SCOL.blue);
          ctx.heal(p, 12);
          ctx.boostSpeed(1.25, 3000);
        } else {
          ctx.float(p.x, p.y - 60, 'FORECAST: SQUALL', SCOL.rain);
          ctx.boostDamage(1.25, 4000);
        }
      }
      for (const b of bolts) {
        // Each bolt is marked where the foe stands as its warning begins.
        if (time >= b.at && time < b.at + 40 && alive(n)) { b.x = n.x; b.y = n.y; }
        if (b.done || time < b.landAt) continue;
        b.done = true;
        if (alive(n) && dist(n.x, n.y, b.x, b.y) < 46) { ctx.hit(n, 10, n.x, n.y); ctx.flash(n.x, n.y, S.bolt); }
        ctx.sfx('thunder');
      }
      bolts = bolts.filter((b) => !b.done || time - b.landAt < 250);
    },
    onHitDealt(amount: number) { dealt.push({ at: now, n: amount }); },
    onHitTaken(amount: number) { taken.push({ at: now, n: amount }); },
    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      for (const b of bolts) {
        if (b.done || time < b.at) continue;
        const k = Math.min(1, (time - b.at) / (b.landAt - b.at));
        g.fillStyle(S.boltGlow, 0.08 + k * 0.2); g.fillCircle(b.x, b.y, 46);
        g.lineStyle(2, S.bolt, 0.5 + k * 0.4); g.strokeCircle(b.x, b.y, 46);
      }
    },
    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      const p = ctx.player;
      if (alive(p)) {
        // The cock on your shoulder: still, until it spins for the forecast.
        const spin = time - spinAt < 1000 ? (time - spinAt) / 1000 : 0;
        const a = spin > 0 ? spin * Math.PI * 8 * (1 - spin * 0.5) : Math.sin(time / 1200) * 0.3;
        drawWeathercock(g, p.x - 22, p.y - 24, 9, a);
      }
      for (const b of bolts) {
        if (b.done && time - b.landAt < 250) drawBolt(g, b.x + 10, b.y - 260, b.x, b.y, b.seed, 1 - (time - b.landAt) / 250, 3.5, 20);
      }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const STORMEYE_ITEMS: IsleItemDef[] = [
  {
    id: 'stormeye-rod-tack', name: 'Rod Tack', emoji: '📍', kind: 'charm', price: 280, isle: 'air',
    flavor: 'A finger-length copper rod with a spike on the end. Stormeye children carry one to school, the way other children carry an apple.',
    effect: { maxHp: 6 },
    script: 'stormeye-rod-tack',
    scriptText: ['Every 9s a small rod plants at your feet (lasts 9s).', 'Within reach of it, the next hit of 8+ you take is grounded: you heal half of it back, and a foe within 260px of the rod takes 11.'],
  },
  {
    id: 'stormeye-barometer-locket', name: 'Barometer Locket', emoji: '🧭', kind: 'charm', price: 420, isle: 'air',
    flavor: 'Brass, warm from being worn. Its needle has never in its life pointed at FAIR — the chandler swears it will, for the right wearer.',
    effect: { dodgeChance: 0.02 },
    script: 'stormeye-barometer-locket',
    scriptText: ['Hits you land raise its pressure; hits you take lower it; it drifts back to the middle.', 'At FAIR: +18% speed for 3s and +6 HP. At STORMY: a squall bursts from you — 14 to a foe within 170px.'],
  },
  {
    id: 'stormeye-hail-thimble', name: 'Hailstone Thimble', emoji: '🧊', kind: 'charm', price: 560, isle: 'air',
    flavor: 'A pewter thimble holding a hailstone that has not melted in thirty years. Grue sells them as curiosities and will not say how.',
    effect: { critChance: 0.02 },
    script: 'stormeye-hail-thimble',
    scriptText: ['Every 3rd hit you land calls a hailstone onto the foe\'s spot: a shadow for 0.8s, then the stone.', 'A foe still standing on the shadow takes 12.'],
  },
  {
    id: 'stormeye-calm-compass', name: 'Calm Compass', emoji: '🌀', kind: 'charm', price: 780, isle: 'air',
    flavor: 'Its needle points not north but at the nearest calm. In Stormeye that has always meant the Barometer Tower. Lately it wanders.',
    effect: { damageTakenMult: 0.97 },
    script: 'stormeye-calm-compass',
    scriptText: ['Every 12s a calm eye opens at your feet for 4.5s.', 'Standing in it: your hits land 20% harder and you mend 2 HP a second.'],
  },
  {
    id: 'art-squall', name: 'The Weathercock', emoji: '🐓', kind: 'artifact', isle: 'air',
    flavor: 'The copper cock off the top of the Barometer Tower. It turned with the Prince\'s every whim for twenty years. It turns for you now.',
    effect: { maxHp: 14, speedMult: 1.04 },
    script: 'art-squall',
    scriptText: ['Every 15s it spins and forecasts the last 8s of the fight.', 'Losing: STORM — 3 marked bolts on the foe (10 each). Winning: FAIR — +12 HP, +25% speed for 3s. Even: SQUALL — +25% damage for 4s.'],
  },
  {
    id: 'fish-squall-shad', name: 'Squall Shad', emoji: '🐟', kind: 'fish', sell: 24, isle: 'air',
    flavor: 'A slim silver fish that rises to the cistern\'s surface whenever it rains, which in Stormeye is always. Flashes like a bolt when it turns.',
    effect: { speedMult: 1.04 },
  },
  {
    id: 'fish-thunderhead-gar', name: 'Thunderhead Gar', emoji: '🐊', kind: 'fish', sell: 58, isle: 'air',
    flavor: 'A long-jawed, armour-scaled gar that lies on the cistern floor and only bites after thunder. Fishers count the seconds and strike on three.',
    effect: { critChance: 0.03 },
  },
  {
    id: 'fish-hailstone-crab', name: 'Hailstone Crab', emoji: '🦀', kind: 'fish', sell: 72, isle: 'air',
    flavor: 'A small white crab that hides among the hail heaped on the cistern bottom, its shell pocked like a hailstone. Sweet, cold and slow.',
    effect: { damageTakenMult: 0.95 },
  },
];

export const STORMEYE_SCRIPTS: Record<string, ItemScriptFactory> = {
  'stormeye-rod-tack': rodTack,
  'stormeye-barometer-locket': barometerLocket,
  'stormeye-hail-thimble': hailThimble,
  'stormeye-calm-compass': calmCompass,
  'art-squall': weathercock,
};

export const STORMEYE_SHOPS: ShopDef[] = [
  { id: 'stormeye-shop', name: 'Brassey\'s Storm Chandlery', stock: ['stormeye-rod-tack', 'stormeye-barometer-locket', 'stormeye-hail-thimble', 'stormeye-calm-compass'], buys: true },
];

export const STORMEYE_FISHERIES: FisheryDef[] = [{ id: 'stormeye-cistern', name: 'The Great Cistern', kind: 'pond' }];

export const STORMEYE_FISH: FishDef[] = [
  { id: 'fish-squall-shad', fisheries: ['stormeye-cistern'], weight: 8, fight: 2, size: [18, 38] },
  { id: 'fish-thunderhead-gar', fisheries: ['stormeye-cistern'], weight: 3, fight: 4, size: [60, 140] },
  { id: 'fish-hailstone-crab', fisheries: ['stormeye-cistern'], weight: 4, fight: 3, size: [10, 26] },
];
