import type { BakeryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import type { G } from '../../../../art/IsleArt';
import { BRASS, BRONZE, SILVER, bell, soundRing } from './art';

/**
 * Carillon Quay's goods: Dorrit Chime's four charms, Abel Fathom's two tackle charms, Tobiah
 * Peal's wrong bell (a quest reward, never sold), two counter foods, and the five meals the
 * Rising Loaf bakes.
 *
 * Every script keeps its own clock (scene `time`, never the frame `dt`), draws what it is doing on
 * the fighter it belongs to, and says so out loud when it fires. They are about how bells behave:
 * a stroke that travels outward, Hours that come round in order, a bell stuffed with wool until it
 * is let ring, an echo that only lands if you are still there, a chime that runs, a drum that
 * counts, and one bell cast in a note the Score does not have.
 */

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

/** A little row of pips over the player's head: `n` of `of` lit. */
function pips(g: G, x: number, y: number, n: number, of: number, on: number, off = 0x3a3a40): void {
  for (let i = 0; i < of; i++) {
    const px = x - ((of - 1) * 9) / 2 + i * 9;
    g.fillStyle(0x000000, 0.4); g.fillCircle(px, y + 1, 3.6);
    g.fillStyle(i < n ? on : off, 1); g.fillCircle(px, y, 3.2);
  }
}

// ── Charm: Bell-Buoy Clapper ────────────────────────────────────────

/**
 * The clapper off a harbour bell-buoy, on a cord. Every 4 s it tolls, and the stroke travels: a
 * ring runs out from you at 380 px/s to 240 px. When the ring's front passes the foe they take 6
 * and are shoved 30 px outward. Close in, it lands at once; at the edge of its reach, a beat late.
 */
const bellBuoy: ItemScriptFactory = (ctx) => {
  const PERIOD = 4000;
  const SPEED = 380;
  const REACH = 240;
  let next = -1;
  let ring: { x: number; y: number; at: number; struck: boolean } | null = null;
  return {
    update(time) {
      if (next < 0) next = time + PERIOD;
      if (time >= next && alive(ctx, 'player')) {
        next = time + PERIOD;
        ring = { x: ctx.player.x, y: ctx.player.y, at: time, struck: false };
        ctx.sfx('crystal-chime');
      }
      if (!ring) return;
      const r = ((time - ring.at) / 1000) * SPEED;
      if (r > REACH) { ring = null; return; }
      if (!ring.struck && alive(ctx, 'npc')) {
        const d = dist(ring.x, ring.y, ctx.npc.x, ctx.npc.y);
        if (d <= r && d <= REACH) {
          ring.struck = true;
          ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y);
          const a = Math.atan2(ctx.npc.y - ring.y, ctx.npc.x - ring.x);
          ctx.nudge(ctx.npc, Math.cos(a) * 30, Math.sin(a) * 30);
          ctx.float(ctx.npc.x, ctx.npc.y - 46, 'CLANG', '#e8c07a');
        }
      }
    },
    drawGround(g, time) {
      if (!ring) return;
      const r = ((time - ring.at) / 1000) * SPEED;
      const q = r / REACH;
      soundRing(g, ring.x, ring.y, r, 0xe8c07a, 0.75 * (1 - q), 0.55);
      soundRing(g, ring.x, ring.y, Math.max(0, r - 14), 0xffe8b0, 0.35 * (1 - q), 0.55);
    },
    drawAir(g, time) {
      const p = ctx.player;
      const left = next < 0 ? 1 : Math.max(0, (next - time) / PERIOD);
      const sw = left < 0.12 ? Math.sin(time / 40) * 4 : Math.sin(time / 500) * 1.5;
      g.lineStyle(1, 0xc8b890, 0.9); g.lineBetween(p.x + 16, p.y - 30, p.x + 18 + sw, p.y - 16);
      g.fillStyle(0x2a2420, 1); g.fillCircle(p.x + 18 + sw, p.y - 14, 3.4);
      g.lineStyle(1.5, 0xe8c07a, 0.5);
      g.beginPath(); g.arc(p.x + 18, p.y - 22, 9, -Math.PI / 2, -Math.PI / 2 + (1 - left) * Math.PI * 2, false); g.strokePath();
    },
  };
};

// ── Charm: Pocket Carillon ──────────────────────────────────────────

/**
 * Three tiny bells on a brass bar, rung in order like the tower: every 12 s the next Hour comes
 * round. Matins wakes you (+35% damage for 2.5 s), Vespers is supper (+8 health), Compline is
 * the night (the next hit within 4 s is halved — up to 20 given back). Plan your fight to the Hour.
 */
const pocketCarillon: ItemScriptFactory = (ctx) => {
  const PERIOD = 12000;
  const NAMES = ['MATINS', 'VESPERS', 'COMPLINE'];
  let next = -1;
  let hour = 0;
  let rungAt = -9999;
  let complineUntil = 0;
  let now = 0;
  return {
    update(time) {
      now = time;
      if (next < 0) next = time + PERIOD;
      if (time < next || !alive(ctx, 'player')) return;
      next = time + PERIOD;
      rungAt = time;
      const p = ctx.player;
      if (hour === 0) ctx.boostDamage(1.35, 2500);
      else if (hour === 1) ctx.heal(p, 8);
      else complineUntil = time + 4000;
      ctx.float(p.x, p.y - 56, NAMES[hour], ['#ffe2a8', '#f0b070', '#a8b8f0'][hour]);
      ctx.sfx(hour === 2 ? 'holy-chord' : 'crystal-chime');
      hour = (hour + 1) % 3;
    },
    onHitTaken(amount) {
      if (now > complineUntil || !alive(ctx, 'player')) return;
      complineUntil = 0;
      const back = Math.min(20, Math.max(1, Math.round(amount / 2)));
      ctx.heal(ctx.player, back);
      ctx.float(ctx.player.x, ctx.player.y - 50, `COMPLINE +${back}`, '#a8b8f0');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const bx = p.x, by = p.y - 40;
      g.fillStyle(0x6a4a20, 1); g.fillRect(bx - 14, by - 12, 28, 2);
      for (let i = 0; i < 3; i++) {
        const ringing = time - rungAt < 700 && (hour + 2) % 3 === i;
        const sw = ringing ? Math.sin(time / 50) * 3 : 0;
        const upNext = hour === i;
        bell(g, bx - 10 + i * 10 + sw, by, 0.2, upNext ? BRASS : i === 2 ? SILVER : BRONZE, { patina: 0 });
      }
      if (time < complineUntil) {
        g.lineStyle(2, 0xa8b8f0, 0.45 + Math.sin(time / 120) * 0.15); g.strokeCircle(p.x, p.y, 30);
      }
      const left = next < 0 ? 1 : (next - time) / PERIOD;
      g.lineStyle(1.5, 0xffe2a8, 0.35);
      g.beginPath(); g.arc(bx, by - 6, 16, Math.PI, Math.PI + (1 - left) * Math.PI, false); g.strokePath();
    },
  };
};

// ── Charm: Woolled Bell ─────────────────────────────────────────────

/**
 * A coat-bell with its mouth stuffed with grey wool so it cannot ring — the way the muted wear
 * them. Blows you take are stuffed into the wool (30% of each, up to 36 held). Cast your ultimate
 * and the wool comes out: the bell rings at last, for everything held, on a foe within 300 px.
 */
const woolledBell: ItemScriptFactory = (ctx) => {
  const CAP = 36;
  let held = 0;
  let rangAt = -9999;
  let rangFrom = { x: 0, y: 0 };
  return {
    onHitTaken(amount) {
      if (!alive(ctx, 'player')) return;
      held = Math.min(CAP, held + amount * 0.3);
    },
    onCast(_id, slot) {
      if (slot !== 'q' || held < 4 || !alive(ctx, 'player')) return;
      const n = Math.round(held);
      held = 0;
      rangAt = ctx.scene.time.now;
      rangFrom = { x: ctx.player.x, y: ctx.player.y };
      ctx.sfx('holy-chord');
      if (alive(ctx, 'npc') && dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) <= 300) {
        ctx.hit(ctx.npc, n, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 50, `THE BELL RINGS ${n}`, '#f8f0d8');
      } else {
        ctx.float(ctx.player.x, ctx.player.y - 50, 'RUNG TO NOBODY', '#b8b0a0');
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      const fill = held / CAP;
      bell(g, p.x - 18, p.y - 18, 0.34, BRONZE, { patina: 0.2 });
      // The wool bulging out of the mouth, fuller the more it holds.
      g.fillStyle(0xb8b4ac, 1); g.fillEllipse(p.x - 18, p.y - 17, 10 + fill * 6, 4 + fill * 6);
      g.fillStyle(0xd8d4cc, 1); g.fillEllipse(p.x - 19, p.y - 18, 6 + fill * 4, 2 + fill * 3);
      const q = (time - rangAt) / 900;
      if (q >= 0 && q < 1) {
        soundRing(g, rangFrom.x, rangFrom.y, 30 + q * 270, 0xf8f0d8, 0.8 * (1 - q), 0.6);
        soundRing(g, rangFrom.x, rangFrom.y, 10 + q * 200, 0xffe2a8, 0.5 * (1 - q), 0.6);
      }
    },
  };
};

// ── Charm: Whispering Conch ─────────────────────────────────────────

/**
 * A conch from the Echo Caves' mouth, which never stops whispering what was said into it. Each hit
 * you land (one every 0.7 s) echoes 0.9 s later for 40% of it (2–9) — at the place it landed. If
 * the foe has moved 90 px from that place, the echo strikes empty stone.
 */
const whisperingConch: ItemScriptFactory = (ctx) => {
  let last = -9999;
  let now = 0;
  const echoes: { x: number; y: number; at: number; amount: number }[] = [];
  const misses: { x: number; y: number; at: number }[] = [];
  return {
    update(time) {
      now = time;
      for (let i = echoes.length - 1; i >= 0; i--) {
        const e = echoes[i];
        if (time < e.at) continue;
        echoes.splice(i, 1);
        if (!alive(ctx, 'npc')) continue;
        if (dist(e.x, e.y, ctx.npc.x, ctx.npc.y) <= 90) {
          ctx.hit(ctx.npc, e.amount, e.x, e.y);
          ctx.float(e.x, e.y - 40, `ECHO ${e.amount}`, '#b8d8f0');
        } else {
          misses.push({ x: e.x, y: e.y, at: time });
        }
      }
      while (misses.length && time - misses[0].at > 600) misses.shift();
    },
    onHitDealt(amount) {
      if (now - last < 700 || !alive(ctx, 'npc')) return;
      last = now;
      const n = Math.max(2, Math.min(9, Math.round(amount * 0.4)));
      echoes.push({ x: ctx.npc.x, y: ctx.npc.y, at: now + 900, amount: n });
    },
    drawGround(g, time) {
      for (const e of echoes) {
        const q = 1 - (e.at - time) / 900;
        g.lineStyle(1.5, 0xb8d8f0, 0.25 + q * 0.5); g.strokeCircle(e.x, e.y, 90);
        soundRing(g, e.x, e.y, 90 * (1 - q) + 8, 0xb8d8f0, 0.6, 0.55);
      }
      for (const m of misses) {
        const q = (time - m.at) / 600;
        g.fillStyle(0x8a8a90, 0.5 * (1 - q)); g.fillCircle(m.x, m.y, 10 + q * 16);
      }
    },
  };
};

// ── Charm: Chime Lure ───────────────────────────────────────────────

/**
 * A spinner lure hung with five chimefish scales, which ring louder the faster it is worked. Land
 * hits within 1.8 s of one another and the chime runs: each hit in the run adds +2 more than the
 * last (to +8). A 1.8 s gap and the run falls silent.
 */
const chimeLure: ItemScriptFactory = (ctx) => {
  const GAP = 1800;
  let run = 0;
  let last = -9999;
  let now = 0;
  return {
    update(time) {
      now = time;
      if (run > 0 && time - last > GAP) run = 0;
    },
    onHitDealt() {
      if (!alive(ctx, 'npc')) return;
      run = now - last <= GAP ? run + 1 : 1;
      last = now;
      const bonus = Math.min(8, (run - 1) * 2);
      if (bonus > 0) {
        ctx.hit(ctx.npc, bonus, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x + 18, ctx.npc.y - 36, `+${bonus}`, '#d8f0f8');
        if (bonus >= 8) ctx.sfx('crystal-chime');
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      const lit = Math.min(5, run);
      const fade = run > 0 ? 1 - Math.min(1, (time - last) / GAP) : 0;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * 0.8 + i * Math.PI * 0.15;
        const x = p.x + Math.cos(a) * 30, y = p.y - 6 + Math.sin(a) * 30;
        g.fillStyle(i < lit ? 0xd8f0f8 : 0x4a5a66, i < lit ? 0.5 + fade * 0.5 : 0.6);
        g.fillEllipse(x, y, 7, 4);
      }
    },
  };
};

// ── Charm: Drumskin Float ───────────────────────────────────────────

/**
 * A float made from a kettle drumfish's bladder, still tight as a skin. Every hit you take beats
 * it once. The fourth beat booms: 9 to a foe within 170 px and a 60 px shove away from you.
 */
const drumskin: ItemScriptFactory = (ctx) => {
  let beats = 0;
  let boomAt = -9999;
  let boomFrom = { x: 0, y: 0 };
  return {
    onHitTaken() {
      if (!alive(ctx, 'player')) return;
      beats++;
      ctx.sfx('drum-hit');
      if (beats < 4) return;
      beats = 0;
      const p = ctx.player;
      boomAt = ctx.scene.time.now;
      boomFrom = { x: p.x, y: p.y };
      ctx.sfx('sonic-pulse');
      if (alive(ctx, 'npc') && dist(p.x, p.y, ctx.npc.x, ctx.npc.y) <= 170) {
        const a = Math.atan2(ctx.npc.y - p.y, ctx.npc.x - p.x);
        ctx.hit(ctx.npc, 9, ctx.npc.x, ctx.npc.y);
        ctx.nudge(ctx.npc, Math.cos(a) * 60, Math.sin(a) * 60);
        ctx.float(ctx.npc.x, ctx.npc.y - 48, 'BOOM', '#f0c890');
      } else {
        ctx.float(p.x, p.y - 48, 'BOOM', '#a89a80');
      }
    },
    drawGround(g, time) {
      const q = (time - boomAt) / 450;
      if (q < 0 || q > 1) return;
      g.fillStyle(0xf0c890, 0.18 * (1 - q)); g.fillCircle(boomFrom.x, boomFrom.y, 170 * q);
      g.lineStyle(3, 0xf0c890, 0.7 * (1 - q)); g.strokeCircle(boomFrom.x, boomFrom.y, 170 * q);
    },
    drawAir(g) {
      const p = ctx.player;
      pips(g, p.x, p.y + 30, beats, 4, 0xf0c890);
    },
  };
};

// ── Quest reward: The Wrong Bell ────────────────────────────────────

/**
 * A handbell Mother Clapperton cast in a note the Score does not have. Every fifth ability you
 * cast rings it: a foe within 320 px is stunned for 0.7 s and takes 6. Nobody on Choirholm has
 * heard that note in forty years; nobody can stand still and not listen.
 */
const wrongBell: ItemScriptFactory = (ctx) => {
  let casts = 0;
  let rangAt = -9999;
  return {
    onCast() {
      if (!alive(ctx, 'player')) return;
      casts++;
      if (casts < 5) return;
      casts = 0;
      rangAt = ctx.scene.time.now;
      ctx.sfx('crystal-shatter');
      const p = ctx.player;
      if (alive(ctx, 'npc') && dist(p.x, p.y, ctx.npc.x, ctx.npc.y) <= 320) {
        ctx.stun(ctx.npc, 700);
        ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 52, 'THE WRONG NOTE', '#ff9ad0');
      } else {
        ctx.float(p.x, p.y - 50, 'THE WRONG NOTE', '#c890b0');
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      const q = (time - rangAt) / 800;
      const sw = q >= 0 && q < 1 ? Math.sin(time / 35) * 5 * (1 - q) : 0;
      bell(g, p.x + 20 + sw, p.y - 26, 0.3, 0xb87aa0, { patina: 0 });
      pips(g, p.x, p.y + 30, casts, 5, 0xff9ad0);
      if (q >= 0 && q < 1) {
        for (let k = 0; k < 3; k++) soundRing(g, p.x, p.y, 40 + q * 280 - k * 24, 0xff9ad0, 0.6 * (1 - q), 0.6);
      }
    },
  };
};

// ── Meals ───────────────────────────────────────────────────────────

/** Next fight: every third hit you land rings the bap — +4 health. */
const chimeBap: ItemScriptFactory = (ctx) => {
  let n = 0;
  return {
    onHitDealt() {
      if (!alive(ctx, 'player')) return;
      n++;
      if (n % 3 !== 0) return;
      ctx.heal(ctx.player, 4);
      ctx.float(ctx.player.x, ctx.player.y - 44, '+4', '#9ad8a0');
    },
    drawAir(g) { pips(g, ctx.player.x, ctx.player.y + 30, n % 3, 3, 0xd8f0f8); },
  };
};

/** Next fight: the first time you fall under half health, +12 health, and a foe within 260 px is stunned 0.5 s. */
const complinePie: ItemScriptFactory = (ctx) => {
  let done = false;
  let at = -9999;
  return {
    update(time) {
      if (done || !alive(ctx, 'player')) return;
      const p = ctx.player;
      if (p.hp >= p.maxHp * 0.5) return;
      done = true;
      at = time;
      ctx.heal(p, 12);
      ctx.sfx('holy-chord');
      ctx.float(p.x, p.y - 50, 'COMPLINE SUPPER +12', '#a8b8f0');
      if (alive(ctx, 'npc') && dist(p.x, p.y, ctx.npc.x, ctx.npc.y) <= 260) ctx.stun(ctx.npc, 500);
    },
    drawGround(g, time) {
      const q = (time - at) / 700;
      if (q < 0 || q > 1) return;
      soundRing(g, ctx.player.x, ctx.player.y, 30 + q * 230, 0xa8b8f0, 0.7 * (1 - q), 0.6);
    },
  };
};

/** Next fight: the first time you cast each different ability, +5 health. */
const fiddlerTurnover: ItemScriptFactory = (ctx) => {
  const seen = new Set<string>();
  return {
    onCast(id) {
      if (seen.has(id) || !alive(ctx, 'player')) return;
      seen.add(id);
      ctx.heal(ctx.player, 5);
      ctx.float(ctx.player.x, ctx.player.y - 44, `NEW TUNE +5`, '#e8d0a0');
    },
  };
};

/**
 * Next fight: the pasty's drum beats every 2.4 s (a pulse at your feet). A hit you land within
 * 0.45 s after a beat adds +7 (once a beat).
 */
const drumPasty: ItemScriptFactory = (ctx) => {
  const BEAT = 2400;
  const WINDOW = 450;
  let start = -1;
  let now = 0;
  let usedBeat = -1;
  let soundedBeat = 0;
  const beatOf = (t: number): number => Math.floor((t - start) / BEAT);
  return {
    update(time) {
      now = time;
      if (start < 0) start = time;
      const b = beatOf(time);
      if (b > soundedBeat) { soundedBeat = b; ctx.sfx('drum-hit'); }
    },
    onHitDealt() {
      if (start < 0 || !alive(ctx, 'npc')) return;
      const b = beatOf(now);
      if (b < 1 || b === usedBeat || (now - start) % BEAT > WINDOW) return;
      usedBeat = b;
      ctx.hit(ctx.npc, 7, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 44, 'ON THE BEAT +7', '#f0c890');
    },
    drawGround(g, time) {
      if (start < 0) return;
      const ph = ((time - start) % BEAT) / BEAT;
      const p = ctx.player;
      const onBeat = (time - start) % BEAT <= WINDOW && beatOf(time) >= 1;
      g.lineStyle(2, 0xf0c890, onBeat ? 0.75 : 0.2); g.strokeEllipse(p.x, p.y + 16, 40 + (1 - ph) * 20, 12 + (1 - ph) * 6);
    },
  };
};

/** Next fight: your ultimate (Q) sings an aria for 3 s — hits you land in it heal you for half (up to 8 each). */
const ariaLoaf: ItemScriptFactory = (ctx) => {
  let until = 0;
  let now = 0;
  return {
    update(time) { now = time; },
    onCast(_id, slot) {
      if (slot !== 'q' || !alive(ctx, 'player')) return;
      until = now + 3000;
      ctx.sfx('holy-chord');
      ctx.float(ctx.player.x, ctx.player.y - 54, 'ARIA', '#b8e0ff');
    },
    onHitDealt(amount) {
      if (now > until || !alive(ctx, 'player')) return;
      const back = Math.min(8, Math.max(1, Math.round(amount / 2)));
      ctx.heal(ctx.player, back);
    },
    drawAir(g, time) {
      if (time > until) return;
      const p = ctx.player;
      for (let k = 0; k < 4; k++) {
        const a = time / 400 + k * Math.PI / 2;
        const x = p.x + Math.cos(a) * 30, y = p.y - 30 + Math.sin(a) * 10 - ((time / 6 + k * 40) % 30);
        g.fillStyle(0xb8e0ff, 0.85); g.fillEllipse(x, y, 6, 4.5);
        g.lineStyle(1.2, 0xb8e0ff, 0.85); g.lineBetween(x + 2.8, y, x + 2.8, y - 11);
      }
    },
  };
};

// ── Definitions ─────────────────────────────────────────────────────

export const PORT_ITEMS: IsleItemDef[] = [
  // Chime & Sundry
  {
    id: 'charm-carillon-bell-buoy', name: 'Bell-Buoy Clapper', emoji: '🔔', kind: 'charm', price: 420, isle: 'sound',
    flavor: 'The iron clapper off a harbour buoy, on a tarred cord. It has rung every swell for thirty years. It still does.',
    script: 'charm-carillon-bell-buoy',
    scriptText: [
      'Tolls every 4s: a ring runs out from you to 240px. When it passes the foe they take 6',
      'and are shoved 30px outward. Close in it lands at once; far off, a beat late.',
    ],
  },
  {
    id: 'charm-carillon-pocket-carillon', name: 'Pocket Carillon', emoji: '🎐', kind: 'charm', price: 560, isle: 'sound',
    flavor: 'Three tiny bells on a brass bar, a toy of the tower. Children ring the Hours on it. Then they are fined.',
    script: 'charm-carillon-pocket-carillon', effect: { maxHp: 6 },
    scriptText: [
      'Every 12s the next Hour: Matins (+35% damage 2.5s), Vespers (+8 health),',
      'Compline (the next hit within 4s is halved, up to 20 back).',
    ],
  },
  {
    id: 'charm-carillon-woolled-bell', name: 'Woolled Bell', emoji: '🧶', kind: 'charm', price: 760, isle: 'sound',
    flavor: 'A coat-bell stuffed with grey wool, as the muted wear them. Dorrit says it is waiting. She does not say for what.',
    script: 'charm-carillon-woolled-bell',
    scriptText: [
      '30% of every hit you take is stuffed into the wool (36 held at most).',
      'Your ultimate (Q) pulls it out: the bell rings for all of it on a foe within 300px.',
    ],
  },
  {
    id: 'charm-carillon-whispering-conch', name: 'Whispering Conch', emoji: '🐚', kind: 'charm', price: 980, isle: 'sound',
    flavor: 'Picked up at the Echo Caves\' mouth. Hold it to your ear and it is still repeating someone\'s argument.',
    script: 'charm-carillon-whispering-conch', effect: { critChance: 0.02 },
    scriptText: [
      'Each hit you land (one per 0.7s) echoes 0.9s later for 40% (2–9) where it landed.',
      'If the foe has moved 90px from that spot, the echo strikes empty stone.',
    ],
  },
  // The Singing Line
  {
    id: 'charm-carillon-chime-lure', name: 'Chime Lure', emoji: '🪝', kind: 'charm', price: 480, isle: 'sound',
    flavor: 'A spinner hung with chimefish scales. Worked fast, it rings like a shop door. Abel swears the fish come to look.',
    script: 'charm-carillon-chime-lure',
    scriptText: ['Hits landed within 1.8s of each other run a chime: each adds +2 more than the last (to +8).'],
  },
  {
    id: 'charm-carillon-drumskin', name: 'Drumskin Float', emoji: '🥁', kind: 'charm', price: 690, isle: 'sound',
    flavor: 'A float sewn from a drumfish\'s bladder, tight as a skin. Knock on it and the whole quay knocks back.',
    script: 'charm-carillon-drumskin', effect: { shieldHp: 6 },
    scriptText: ['Each hit you take beats the drum. The 4th beat booms: 9 to a foe within 170px and a 60px shove.'],
  },
  // Quest reward
  {
    id: 'charm-carillon-wrong-bell', name: 'The Wrong Bell', emoji: '🛎️', kind: 'charm', isle: 'sound',
    flavor: 'A handbell cast in a note the Score does not have. Strike it and people stop in the street and listen.',
    script: 'charm-carillon-wrong-bell', effect: { critChance: 0.02 },
    scriptText: ['Every 5th ability you cast rings it: a foe within 320px is stunned 0.7s and takes 6.'],
  },
  // Counter food
  {
    id: 'food-carillon-bell-biscuit', name: 'Bell Biscuit', emoji: '🍪', kind: 'food', price: 45, sell: 11, isle: 'sound',
    flavor: 'Ginger biscuit cut bell-shaped and baked hard enough to ring when you tap it. Sailors keep them for luck.',
    effect: { shieldHp: 10 },
  },
  {
    id: 'food-carillon-snow-tea', name: 'Snow-Honey Tea', emoji: '🍵', kind: 'food', price: 60, sell: 15, isle: 'sound',
    flavor: 'Black tea, snowmelt and heather honey. Drunk at the Hours to keep the voice warm. Drink it quietly.',
    effect: { regenPerSecond: 0.25, speedMult: 1.04 },
  },
  // The Rising Loaf's meals
  {
    id: 'meal-carillon-chime-bap', name: 'Chimefish Bap', emoji: '🥪', kind: 'food', sell: 16, isle: 'sound',
    flavor: 'Fried chimefish in a soft bap. They still ring faintly when you bite. You get used to it. Nearly.',
    script: 'meal-carillon-chime-bap', effect: { maxHp: 7 },
    scriptText: ['Next fight: every third hit you land, +4 health.'],
  },
  {
    id: 'meal-carillon-compline-pie', name: 'Compline Pie', emoji: '🥧', kind: 'food', sell: 22, isle: 'sound',
    flavor: 'Chimefish and bellmouth under a lid of crust. Eaten after the last Hour, at a table, in a whisper. Together.',
    script: 'meal-carillon-compline-pie', effect: { regenPerSecond: 0.3 },
    scriptText: ['Next fight: the first time you fall under half health, +12 health and a foe within 260px is stunned 0.5s.'],
  },
  {
    id: 'meal-carillon-fiddler-turnover', name: 'Fiddler Turnover', emoji: '🥟', kind: 'food', sell: 30, isle: 'sound',
    flavor: 'Fiddler flounder and a Brass Court cornet carp folded in pastry, crimped like a scroll of a violin.',
    script: 'meal-carillon-fiddler-turnover', effect: { speedMult: 1.03 },
    scriptText: ['Next fight: the first time you cast each different ability, +5 health.'],
  },
  {
    id: 'meal-carillon-drum-pasty', name: 'Drumfish Pasty', emoji: '🥮', kind: 'food', sell: 34, isle: 'sound',
    flavor: 'Kettle drumfish and a mute mullet from the Hush mere, in a crust you can knock on. It knocks back.',
    script: 'meal-carillon-drum-pasty', effect: { shieldHp: 10 },
    scriptText: ['Next fight: a drum beats every 2.4s. A hit you land within 0.45s after a beat adds +7.'],
  },
  {
    id: 'meal-carillon-aria-loaf', name: 'Aria Loaf', emoji: '🍞', kind: 'food', sell: 60, isle: 'sound',
    flavor: 'Reed ray and aria marlin baked in a tall plaited loaf. Marta only bakes it for weddings and wakes.',
    script: 'meal-carillon-aria-loaf', effect: { damageMult: 1.04 },
    scriptText: ['Next fight: your ultimate (Q) sings an aria for 3s — hits you land in it heal you half (max 8 each).'],
  },
];

export const PORT_SCRIPTS: Record<string, ItemScriptFactory> = {
  'charm-carillon-bell-buoy': bellBuoy,
  'charm-carillon-pocket-carillon': pocketCarillon,
  'charm-carillon-woolled-bell': woolledBell,
  'charm-carillon-whispering-conch': whisperingConch,
  'charm-carillon-chime-lure': chimeLure,
  'charm-carillon-drumskin': drumskin,
  'charm-carillon-wrong-bell': wrongBell,
  'meal-carillon-chime-bap': chimeBap,
  'meal-carillon-compline-pie': complinePie,
  'meal-carillon-fiddler-turnover': fiddlerTurnover,
  'meal-carillon-drum-pasty': drumPasty,
  'meal-carillon-aria-loaf': ariaLoaf,
};

export const PORT_SHOPS: ShopDef[] = [
  {
    id: 'carillon-store', name: 'Chime & Sundry', buys: true,
    stock: [
      'charm-carillon-bell-buoy', 'charm-carillon-pocket-carillon', 'charm-carillon-woolled-bell',
      'charm-carillon-whispering-conch', 'food-carillon-bell-biscuit', 'food-carillon-snow-tea',
    ],
  },
  {
    id: 'carillon-tackle', name: 'The Singing Line', buys: true,
    stock: ['rod-tuning', 'rod-iron', 'rod-driftwood', 'charm-carillon-chime-lure', 'charm-carillon-drumskin'],
  },
];

export const PORT_BAKERIES: BakeryDef[] = [
  {
    id: 'carillon-bakery', name: 'The Rising Loaf',
    recipes: [
      {
        id: 'recipe-carillon-chime-bap', name: 'Chimefish Bap', coins: 14, output: 'meal-carillon-chime-bap', makes: 2,
        inputs: [{ item: 'fish-chimefish', count: 3 }],
      },
      {
        id: 'recipe-carillon-compline-pie', name: 'Compline Pie', coins: 18, output: 'meal-carillon-compline-pie',
        inputs: [{ item: 'fish-chimefish', count: 2 }, { item: 'fish-bellmouth', count: 1 }],
      },
      {
        id: 'recipe-carillon-fiddler-turnover', name: 'Fiddler Turnover', coins: 26, output: 'meal-carillon-fiddler-turnover',
        inputs: [{ item: 'fish-fiddler-flounder', count: 1 }, { item: 'fish-cornet-carp', count: 1 }],
      },
      {
        id: 'recipe-carillon-drum-pasty', name: 'Drumfish Pasty', coins: 32, output: 'meal-carillon-drum-pasty',
        inputs: [{ item: 'fish-kettle-drumfish', count: 1 }, { item: 'fish-mute-mullet', count: 1 }],
      },
      {
        id: 'recipe-carillon-aria-loaf', name: 'Aria Loaf', coins: 44, output: 'meal-carillon-aria-loaf',
        inputs: [{ item: 'fish-reed-ray', count: 1 }, { item: 'fish-aria-marlin', count: 1 }],
      },
    ],
  },
];
