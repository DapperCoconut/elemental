import type { BakeryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { DUSK, GLASS_LIT, GOLD, GOLD_DARK, GOLD_LIT, poly, sunburst } from './art';

/**
 * Meridian Quay's goods: Cassius Penhallow's four charms at the Glass Counter, Wren Halloran's two
 * tackle charms, the face-down mirror (a quest reward, never sold), two counter foods, and the five
 * meals the Golden Crust bakes.
 *
 * Every script keeps its own clock (scene `time`, never the frame `dt`), draws what it is doing on
 * the fighter it belongs to, and says so out loud when it fires. Earlier isles' charms were about
 * fire, the sea, gardens and bells; these are about light on an isle that cannot get rid of it — a
 * licensed hour of shade, a mirror that catches an eye, glass that gathers the sun from far off, a
 * person you can see through, and a buoy that has been turned away.
 */

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};
const dist = (ctx: ItemScriptCtx): number => Math.hypot(ctx.player.x - ctx.npc.x, ctx.player.y - ctx.npc.y);

// ── Charm: Dusk Ticket ───────────────────────────────────────────────

/**
 * One licensed hour of shade — or six seconds of it, which is what the hour feels like. Stand still
 * for 0.6s and you take your shade: a dusk-disc gathers round your feet. While you stand in it, 40%
 * of each hit you take comes back (up to 12). The clerk's stopwatch runs only while you are in the
 * shade; six seconds a fight, and then the ticket is punched.
 */
const duskTicket: ItemScriptFactory = (ctx) => {
  const SETTLE = 600, ALLOWANCE = 6000;
  let left = ALLOWANCE;
  let stillSince = -1;
  let lx = NaN, ly = NaN;
  let inShade = false;
  let punchedSaid = false;
  return {
    update(time, dt) {
      const p = ctx.player;
      const moved = Number.isNaN(lx) ? 0 : Math.hypot(p.x - lx, p.y - ly) / Math.max(dt, 0.001);
      lx = p.x; ly = p.y;
      if (moved > 30 || !alive(ctx, 'player')) stillSince = -1;
      else if (stillSince < 0) stillSince = time;
      const was = inShade;
      inShade = left > 0 && stillSince >= 0 && time - stillSince >= SETTLE;
      if (inShade) left = Math.max(0, left - dt * 1000);
      if (inShade && !was) ctx.float(p.x, p.y - 52, 'DUSK', '#b8a8e8');
      if (left <= 0 && !punchedSaid) { punchedSaid = true; ctx.float(p.x, p.y - 52, 'TICKET PUNCHED', '#c8c0d8'); ctx.sfx('clock-tick'); }
    },
    onHitTaken(amount) {
      if (!inShade || !alive(ctx, 'player')) return;
      const back = Math.min(12, Math.max(1, Math.round(amount * 0.4)));
      ctx.heal(ctx.player, back);
      ctx.float(ctx.player.x, ctx.player.y - 40, `IN THE SHADE +${back}`, '#b8a8e8');
      ctx.sfx('hush');
    },
    drawGround(g) {
      if (left <= 0) return;
      const p = ctx.player;
      const r = inShade ? 34 : 14;
      g.fillStyle(DUSK, inShade ? 0.55 : 0.18); g.fillEllipse(p.x, p.y + 14, r * 2, r * 0.8);
      if (inShade) { g.fillStyle(0x141020, 0.5); g.fillEllipse(p.x, p.y + 14, r * 1.3, r * 0.5); }
    },
    drawAir(g) {
      if (left <= 0) return;
      const p = ctx.player;
      // The ticket's stopwatch over your shoulder: the white is your shade left.
      const cx = p.x + 24, cy = p.y - 40, frac = left / ALLOWANCE;
      g.fillStyle(0x7a5a20, 1); g.fillCircle(cx, cy, 6.5);
      g.fillStyle(0xfaf6ea, 1); g.fillCircle(cx, cy, 5.2);
      g.fillStyle(DUSK, 0.9);
      g.slice(cx, cy, 5.2, -Math.PI / 2, -Math.PI / 2 + (1 - frac) * Math.PI * 2, false); g.fillPath();
      g.fillStyle(0x7a5a20, 1); g.fillRect(cx - 1, cy - 9, 2, 3);
    },
  };
};

// ── Charm: Pocket Heliograph ─────────────────────────────────────────

/**
 * A signaller's mirror on a swivel, worn on the shoulder. Every 5 seconds it catches the sun. If the
 * foe is looking your way (and within 420px) when it flashes, they are dazzled — stunned for 0.6s.
 * If they are looking away it misses, and tries again 1.5s later. Make them face you.
 */
const pocketHeliograph: ItemScriptFactory = (ctx) => {
  const PERIOD = 5000, RETRY = 1500;
  let next = -1;
  let flashAt = -9999;
  let landed = false;
  const lookingAtMe = (): boolean => {
    const a = ctx.facing(ctx.npc);
    const want = Math.atan2(ctx.player.y - ctx.npc.y, ctx.player.x - ctx.npc.x);
    const d = Math.atan2(Math.sin(a - want), Math.cos(a - want));
    return Math.abs(d) < 0.6 && dist(ctx) < 420;
  };
  return {
    update(time) {
      if (next < 0) next = time + PERIOD;
      if (time < next || !alive(ctx, 'player') || !alive(ctx, 'npc')) return;
      flashAt = time;
      if (lookingAtMe()) {
        landed = true;
        ctx.stun(ctx.npc, 600);
        ctx.flash(ctx.npc.x, ctx.npc.y - 20, 0xffffff);
        ctx.float(ctx.npc.x, ctx.npc.y - 54, 'DAZZLED', '#fff4c0');
        ctx.sfx('prism');
        next = time + PERIOD;
      } else {
        landed = false;
        next = time + RETRY;
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      const mx = p.x - 20, my = p.y - 42;
      const tilt = Math.sin(time / 260) * 0.5 + 0.5;
      g.fillStyle(GOLD_DARK, 1); g.fillRect(mx - 1, my, 2, 10);
      g.fillStyle(GOLD_DARK, 1); g.fillEllipse(mx, my, 4 + tilt * 6, 10);
      g.fillStyle(GLASS_LIT, 1); g.fillEllipse(mx, my, 2.5 + tilt * 5, 8);
      const age = time - flashAt;
      if (age < 260) {
        const q = 1 - age / 260;
        g.fillStyle(0xffffff, 0.6 * q); g.fillCircle(mx, my, 10 + (1 - q) * 10);
        if (landed) {
          g.lineStyle(4 * q + 1, 0xffffff, 0.75 * q); g.lineBetween(mx, my, ctx.npc.x, ctx.npc.y - 24);
          g.fillStyle(0xffffff, 0.5 * q); g.fillCircle(ctx.npc.x, ctx.npc.y - 24, 22);
        }
      }
    },
  };
};

// ── Charm: Burning Glass Shard ───────────────────────────────────────

/**
 * A chip off the Noon Court's great lens, ground to a pocket burning-glass. Hits you land from 260px
 * or further gather a mote of sun in it (three at most; they fade after 6s unused). With three
 * gathered, your next landed hit focuses them into a white spot on the foe: 18 more damage. A hit
 * landed from closer than 140px knocks one mote loose. Keep your distance and let it gather.
 */
const burningShard: ItemScriptFactory = (ctx) => {
  let motes = 0;
  let lastGather = -9999;
  let burnAt = -9999;
  let bx = 0, by = 0;
  return {
    update(time) {
      if (motes > 0 && time - lastGather > 6000) { motes = 0; }
    },
    onHitDealt() {
      if (!alive(ctx, 'npc')) return;
      const now = ctx.scene.time.now, d = dist(ctx);
      if (motes >= 3) {
        motes = 0;
        bx = ctx.npc.x; by = ctx.npc.y; burnAt = now;
        ctx.hit(ctx.npc, 18, bx, by);
        ctx.float(bx, by - 56, 'FOCUSED', '#ffffff');
        ctx.sfx('light-beam');
        return;
      }
      if (d >= 260) { motes++; lastGather = now; if (motes === 3) ctx.float(ctx.player.x, ctx.player.y - 52, 'THE GLASS IS HOT', '#ffe890'); }
      else if (d < 140 && motes > 0) motes--;
    },
    drawAir(g, time) {
      const p = ctx.player;
      // The shard over your head, with its gathered motes circling inside it.
      const cx = p.x, cy = p.y - 50;
      g.fillStyle(0xbfe6ee, 0.5); g.fillEllipse(cx, cy, 16, 9);
      g.lineStyle(1.2, GOLD, 0.9); g.strokeEllipse(cx, cy, 16, 9);
      for (let i = 0; i < motes; i++) {
        const a = time / 300 + (i / 3) * Math.PI * 2;
        g.fillStyle(motes >= 3 ? 0xffffff : GOLD_LIT, 1); g.fillCircle(cx + Math.cos(a) * 4.5, cy + Math.sin(a) * 2.2, 1.8);
      }
      if (motes >= 3) { g.fillStyle(0xffffff, 0.25 + Math.sin(time / 90) * 0.1); g.fillCircle(cx, cy, 11); }
      const age = time - burnAt;
      if (age < 500) {
        const q = 1 - age / 500;
        g.lineStyle(2, 0xffffff, 0.8 * q); g.lineBetween(cx, cy, bx, by - 10);
        g.fillStyle(0xffffff, 0.8 * q); g.fillCircle(bx, by - 10, 6 + (1 - q) * 14);
        g.fillStyle(0xffd070, 0.4 * q); g.fillCircle(bx, by - 10, 16 + (1 - q) * 18);
      }
    },
  };
};

// ── Charm: Clear's Locket ────────────────────────────────────────────

/**
 * A glass locket with nothing inside, the kind the Clears are given to wear. Once a fight, when a hit
 * drops you under 35% health, you go clear for 2 seconds — blows pass through you: every hit taken
 * in that window is given back (40 health back at most, all told).
 */
const clearLocket: ItemScriptFactory = (ctx) => {
  const WINDOW = 2000, CAP = 40;
  let used = false;
  let until = -1;
  let given = 0;
  return {
    onHitTaken(amount) {
      const p = ctx.player, now = ctx.scene.time.now;
      if (!alive(ctx, 'player')) return;
      if (now < until) {
        const back = Math.min(amount, CAP - given);
        if (back > 0) { given += back; ctx.heal(p, back); ctx.float(p.x, p.y - 44, `THROUGH YOU +${back}`, '#e8f4fa'); }
        return;
      }
      if (!used && p.hp < p.maxHp * 0.35) {
        used = true; until = now + WINDOW;
        ctx.float(p.x, p.y - 58, 'CLEAR', '#e8f4fa');
        ctx.sfx('blink');
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (time < until) {
        const q = (until - time) / WINDOW;
        g.lineStyle(1.5, 0xbfe4f4, 0.7 * q); g.strokeCircle(p.x, p.y - 8, 26);
        g.fillStyle(0xe8f4fa, 0.22 * q); g.fillCircle(p.x, p.y - 8, 26);
        for (let k = 0; k < 6; k++) {
          const a = time / 200 + k;
          g.fillStyle(0xffffff, 0.6 * q); g.fillCircle(p.x + Math.cos(a) * 22, p.y - 8 + Math.sin(a) * 22, 1.4);
        }
      } else if (!used) {
        // The empty locket at your throat.
        g.lineStyle(1, GOLD, 0.9); g.strokeCircle(p.x + 6, p.y - 18, 3.2);
        g.fillStyle(0xe8f4fa, 0.6); g.fillCircle(p.x + 6, p.y - 18, 2.4);
      }
    },
  };
};

// ── Charm: Glint Lure ────────────────────────────────────────────────

/**
 * A spinner cut from a mirror mackerel's flank. Three basic attacks (Click) inside 2.2 seconds wind
 * it up and set it spinning; the next E, R, F or Q you cast then comes back 1.5s sooner.
 */
const glintLure: ItemScriptFactory = (ctx) => {
  const clicks: number[] = [];
  let wound = false;
  let firedAt = -9999;
  return {
    onCast(abilityId, slot) {
      const now = ctx.scene.time.now;
      if (slot === 'click') {
        clicks.push(now);
        while (clicks.length && now - clicks[0] > 2200) clicks.shift();
        if (!wound && clicks.length >= 3) { wound = true; clicks.length = 0; ctx.float(ctx.player.x, ctx.player.y - 50, 'SPINNING', '#d8ecf4'); ctx.sfx('whoosh'); }
        return;
      }
      if (!wound) return;
      wound = false; firedAt = now;
      ctx.refund(abilityId, 1500);
      ctx.float(ctx.player.x, ctx.player.y - 50, '-1.5s', '#fff4c0');
      ctx.sfx('sparkle');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const cx = p.x + 18, cy = p.y - 30;
      const spin = wound ? time / 50 : 0;
      const n = wound ? 3 : clicks.length;
      g.lineStyle(0.8, 0x8a9aa0, 0.8); g.lineBetween(cx, cy - 10, cx, cy - 4);
      g.fillStyle(0xd8e4ec, 1); g.fillEllipse(cx, cy, 4 + Math.abs(Math.cos(spin)) * 6, 9);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(cx - 1, cy - 2, 1.2);
      for (let i = 0; i < n; i++) { g.fillStyle(GOLD_LIT, 1); g.fillCircle(cx - 6 + i * 6, cy + 9, 1.4); }
      const age = time - firedAt;
      if (age < 300) { g.fillStyle(0xffffff, 0.5 * (1 - age / 300)); g.fillCircle(cx, cy, 6 + age / 20); }
    },
  };
};

// ── Charm: Halo Float ────────────────────────────────────────────────

/**
 * A cork float in the shape of a halo skate, ringed in pale paint. Every 7 seconds it drops a halo on
 * the spot where you stand; the halo floats there for 4.5s. Each half-second you spend inside it
 * takes 0.2s off every ability you have cast this fight. Fight from the ring.
 */
const haloFloat: ItemScriptFactory = (ctx) => {
  const PERIOD = 7000, LIFE = 4500, R = 46;
  const known = new Set<string>();
  let next = -1;
  let halo: { x: number; y: number; born: number } | null = null;
  let acc = 0;
  return {
    onCast(abilityId) { known.add(abilityId); },
    update(time, dt) {
      const p = ctx.player;
      if (next < 0) next = time + PERIOD;
      if (time >= next) { next = time + PERIOD; halo = { x: p.x, y: p.y, born: time }; ctx.sfx('holy-chord'); }
      if (halo && time - halo.born > LIFE) halo = null;
      if (!halo || !alive(ctx, 'player')) return;
      if (Math.hypot(p.x - halo.x, p.y - halo.y) > R) return;
      acc += dt;
      while (acc >= 0.5) { acc -= 0.5; for (const id of known) ctx.refund(id, 200); }
    },
    drawGround(g, time) {
      if (!halo) return;
      const q = 1 - (time - halo.born) / LIFE;
      const inside = Math.hypot(ctx.player.x - halo.x, ctx.player.y - halo.y) <= R;
      g.lineStyle(5, 0xfff4c0, 0.25 * q); g.strokeEllipse(halo.x, halo.y + 12, R * 2, R * 0.8);
      g.lineStyle(2, inside ? 0xffffff : 0xfff0a0, 0.8 * q); g.strokeEllipse(halo.x, halo.y + 12, R * 2, R * 0.8);
      if (inside) { g.fillStyle(0xfff4c0, 0.1 * q); g.fillEllipse(halo.x, halo.y + 12, R * 2, R * 0.8); }
    },
  };
};

// ── Charm: The Face-Down Mirror ──────────────────────────────────────

/**
 * The first buoy mirror off the end of the Meridian Stair, turned face to its float. Face-down, it
 * stores light: every hit you land puts a glint in it (six at most). Take a hit with six stored and
 * it turns over in the foe's face — stunned for 0.7s and struck for 12 — and starts gathering again.
 */
const faceDownMirror: ItemScriptFactory = (ctx) => {
  let glints = 0;
  let turnAt = -9999;
  return {
    onHitDealt() { if (glints < 6) glints++; },
    onHitTaken() {
      if (glints < 6 || !alive(ctx, 'npc') || !alive(ctx, 'player')) return;
      glints = 0; turnAt = ctx.scene.time.now;
      ctx.stun(ctx.npc, 700);
      ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y);
      ctx.flash(ctx.npc.x, ctx.npc.y - 20, 0xffffff);
      ctx.float(ctx.npc.x, ctx.npc.y - 56, 'FACE UP', '#ffffff');
      ctx.sfx('prism');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const cx = p.x - 22, cy = p.y - 22;
      const age = time - turnAt;
      g.fillStyle(GOLD_DARK, 1); g.fillEllipse(cx, cy, 13, 13);
      g.fillStyle(age < 400 ? 0xffffff : 0x3a3a44, 1); g.fillEllipse(cx, cy, 10, 10);
      for (let i = 0; i < glints; i++) {
        const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
        g.fillStyle(glints >= 6 ? 0xffffff : GOLD_LIT, 1); g.fillCircle(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 1.3);
      }
      if (age < 400) {
        const q = 1 - age / 400;
        g.lineStyle(3 * q + 1, 0xffffff, 0.8 * q); g.lineBetween(cx, cy, ctx.npc.x, ctx.npc.y - 24);
        g.fillStyle(0xffffff, 0.4 * q); g.fillCircle(ctx.npc.x, ctx.npc.y - 24, 26 * (1 - q) + 8);
      }
    },
  };
};

// ── Meals ────────────────────────────────────────────────────────────

/**
 * Queue-Loaf: baked to keep a body standing in line. Every 8 seconds you go without taking a hit, the
 * crust hardens a layer (three at most). The next hit you take breaks one: 6 of it comes back.
 */
const queueLoaf: ItemScriptFactory = (ctx) => {
  let crusts = 0;
  let quiet = -1;
  return {
    update(time) {
      if (quiet < 0) quiet = time;
      if (crusts < 3 && time - quiet >= 8000) { crusts++; quiet = time; }
    },
    onHitTaken(amount) {
      quiet = ctx.scene.time.now;
      if (crusts <= 0 || !alive(ctx, 'player')) return;
      crusts--;
      const back = Math.min(6, amount);
      ctx.heal(ctx.player, back);
      ctx.float(ctx.player.x, ctx.player.y - 44, `CRUST +${back}`, '#e8b860');
    },
    drawAir(g) {
      const p = ctx.player;
      for (let i = 0; i < crusts; i++) { g.fillStyle(0xa86a2a, 1); g.fillEllipse(p.x - 8 + i * 8, p.y + 22, 7, 4); g.fillStyle(0xe8b860, 1); g.fillEllipse(p.x - 8 + i * 8, p.y + 21, 5, 2); }
    },
  };
};

/** Noonfish Sunwheel: the first hit you land in every 5 seconds is gilded for +7. */
const sunwheel: ItemScriptFactory = (ctx) => {
  let ready = -1;
  return {
    update(time) { if (ready < 0) ready = time; },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (ready < 0 || now < ready || !alive(ctx, 'npc')) return;
      ready = now + 5000;
      ctx.hit(ctx.npc, 7, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 50, 'GILDED +7', '#ffe08a');
    },
    drawAir(g, time) {
      if (ready < 0 || time < ready) return;
      sunburst(g, ctx.player.x, ctx.player.y - 46, 3 + Math.sin(time / 160) * 0.5, GOLD, 0.9);
    },
  };
};

/** Beacon Pie: under half health you burn like a beacon — the foe within 130px takes 3 every second. */
const beaconPie: ItemScriptFactory = (ctx) => {
  let nextTick = 0;
  const lit_ = (): boolean => alive(ctx, 'player') && ctx.player.hp < ctx.player.maxHp * 0.5;
  return {
    update(time) {
      if (!lit_() || !alive(ctx, 'npc') || time < nextTick) return;
      nextTick = time + 1000;
      if (dist(ctx) <= 130) { ctx.hit(ctx.npc, 3, ctx.npc.x, ctx.npc.y); ctx.sfx('sizzle'); }
    },
    drawGround(g, time) {
      if (!lit_()) return;
      const p = ctx.player, f = 0.5 + 0.5 * Math.sin(time / 140);
      g.fillStyle(0xffc060, 0.08 + 0.05 * f); g.fillEllipse(p.x, p.y + 10, 260, 104);
      g.lineStyle(1.5, 0xffd890, 0.3 + 0.2 * f); g.strokeEllipse(p.x, p.y + 10, 260, 104);
    },
  };
};

/** Halo Parcel: the first time you drop under 25% health, a halo catches you — +22 health and 2s of +25% speed. */
const haloParcel: ItemScriptFactory = (ctx) => {
  let used = false;
  let at = -9999;
  return {
    onHitTaken() {
      const p = ctx.player;
      if (used || !alive(ctx, 'player') || p.hp >= p.maxHp * 0.25) return;
      used = true; at = ctx.scene.time.now;
      ctx.heal(p, 22); ctx.boostSpeed(1.25, 2000);
      ctx.float(p.x, p.y - 56, 'CAUGHT +22', '#fff4c0');
      ctx.sfx('holy-chord');
    },
    drawAir(g, time) {
      const age = time - at;
      if (age > 2000) return;
      const p = ctx.player, q = 1 - age / 2000;
      g.lineStyle(3, 0xfff4c0, 0.8 * q); g.strokeEllipse(p.x, p.y - 46, 26, 8);
      g.lineStyle(1, 0xffffff, 0.9 * q); g.strokeEllipse(p.x, p.y - 46, 22, 6);
    },
  };
};

/** Gilt Swordfish Steak: each ultimate (Q) you cast gilds your next 3 hits for +10 each. */
const giltSteak: ItemScriptFactory = (ctx) => {
  let gilt = 0;
  return {
    onCast(_id, slot) {
      if (slot !== 'q') return;
      gilt = 3;
      ctx.float(ctx.player.x, ctx.player.y - 56, 'GILT', '#ffe08a');
      ctx.sfx('jackpot');
    },
    onHitDealt() {
      if (gilt <= 0 || !alive(ctx, 'npc')) return;
      gilt--;
      ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 50, '+10', '#ffe08a');
    },
    drawAir(g, time) {
      const p = ctx.player;
      for (let i = 0; i < gilt; i++) {
        const a = time / 240 + (i / 3) * Math.PI * 2;
        const x = p.x + Math.cos(a) * 20, y = p.y - 10 + Math.sin(a) * 8;
        poly(g, [[x, y - 4], [x + 2.5, y], [x, y + 4], [x - 2.5, y]], GOLD_LIT, 1);
      }
    },
  };
};

// ── Item defs ───────────────────────────────────────────────────────

export const PORT_ITEMS: IsleItemDef[] = [
  // The Glass Counter
  {
    id: 'charm-meridian-dusk-ticket', name: 'Dusk Ticket', emoji: '🎫', kind: 'charm', price: 420, isle: 'light',
    flavor: 'One licensed hour of shade, punched by the clerk. Somebody sold theirs for bread. It still smells of the dark.',
    script: 'charm-meridian-dusk-ticket',
    scriptText: [
      'Stand still 0.6s to take your shade: while you stay in it, 40% of each hit comes back (max 12).',
      'The ticket holds 6s of shade a fight; the stopwatch only runs while you stand in it.',
    ],
  },
  {
    id: 'charm-meridian-pocket-heliograph', name: 'Pocket Heliograph', emoji: '🪞', kind: 'charm', price: 560, isle: 'light',
    flavor: 'A signaller\'s shoulder-mirror, off a man who will not be needing it. It is very good at catching an eye.',
    script: 'charm-meridian-pocket-heliograph',
    scriptText: [
      'Every 5s it flashes: if the foe is facing you (within 420px), they are dazzled — stunned 0.6s.',
      'If they are looking away it misses and tries again 1.5s later.',
    ],
  },
  {
    id: 'charm-meridian-burning-shard', name: 'Burning Glass Shard', emoji: '🔆', kind: 'charm', price: 780, isle: 'light',
    flavor: 'A chip off the Noon Court\'s great lens, ground to fit a pocket. It burns holes in the pocket. Carry it in tin.',
    script: 'charm-meridian-burning-shard', effect: { maxHp: 6 },
    scriptText: [
      'Hits landed from 260px+ gather a mote of sun (max 3, fade after 6s). At 3, your next hit focuses: +18.',
      'A hit landed from under 140px knocks a mote loose.',
    ],
  },
  {
    id: 'charm-meridian-clear-locket', name: 'Clear\'s Locket', emoji: '🫙', kind: 'charm', price: 1100, isle: 'light',
    flavor: 'A glass locket with nothing in it, the kind the bleached are made to wear. You can see straight through it.',
    script: 'charm-meridian-clear-locket', effect: { damageTakenMult: 0.98 },
    scriptText: [
      'Once a fight, when a hit drops you under 35% health, you go clear for 2s:',
      'every hit taken in that window is given back (40 health at most).',
    ],
  },
  // Halloran's Lines & Lenses
  {
    id: 'charm-meridian-glint-lure', name: 'Glint Lure', emoji: '🪝', kind: 'charm', price: 480, isle: 'light',
    flavor: 'A spinner cut from a mirror mackerel\'s side. Wren ties them by the dozen. The herring cannot resist.',
    script: 'charm-meridian-glint-lure',
    scriptText: ['3 basic attacks (Click) within 2.2s wind the lure: your next E, R, F or Q comes back 1.5s sooner.'],
  },
  {
    id: 'charm-meridian-halo-float', name: 'Halo Float', emoji: '⭕', kind: 'charm', price: 690, isle: 'light',
    flavor: 'A cork float carved like a halo skate, its ring painted on in white lead. It sits on the water like a blessing.',
    script: 'charm-meridian-halo-float', effect: { cooldownMult: 0.99 },
    scriptText: [
      'Every 7s a halo drops where you stand and floats there 4.5s.',
      'Each half-second inside it takes 0.2s off every ability you have cast this fight.',
    ],
  },
  // Quest reward
  {
    id: 'charm-meridian-face-down-mirror', name: 'The Face-Down Mirror', emoji: '🪞', kind: 'charm', isle: 'light',
    flavor: 'The first buoy mirror off the end of the Meridian Stair, turned to its float. It has stopped watching. Mostly.',
    script: 'charm-meridian-face-down-mirror', effect: { critChance: 0.02 },
    scriptText: [
      'Each hit you land stores a glint (max 6). Take a hit with 6 stored and it turns face-up in the foe\'s face:',
      'they are stunned 0.7s and struck for 12.',
    ],
  },
  // Counter food
  {
    id: 'food-meridian-sun-fig', name: 'Sun-Dried Fig', emoji: '🫐', kind: 'food', price: 45, sell: 11, isle: 'light',
    flavor: 'Everything on Solmara is sun-dried, whether you meant it to be or not. The figs, at least, are improved.',
    effect: { shieldHp: 10 },
  },
  {
    id: 'food-meridian-shade-tea', name: 'Shade Tea', emoji: '🍵', kind: 'food', price: 65, sell: 16, isle: 'light',
    flavor: 'Cold tea, steeped an hour in the Dusk-house by a clerk who sells it out the back. It tastes of the dark.',
    effect: { regenPerSecond: 0.3, cooldownMult: 0.98 },
  },
  // The Golden Crust's meals
  {
    id: 'meal-meridian-queue-loaf', name: 'Queue-Loaf', emoji: '🍞', kind: 'food', sell: 16, isle: 'light',
    flavor: 'Herring and mackerel in a hard brown crust, baked to be eaten standing up in a line that never moves.',
    script: 'meal-meridian-queue-loaf', effect: { maxHp: 8 },
    scriptText: ['Next fight: every 8s without being hit hardens a crust (max 3); each one gives back 6 of a hit.'],
  },
  {
    id: 'meal-meridian-sunwheel', name: 'Noonfish Sunwheel', emoji: '🥮', kind: 'food', sell: 18, isle: 'light',
    flavor: 'A round pastry stamped with the sunburst, noonfish fanned in it like rays. The Despot\'s own recipe. Probably.',
    script: 'meal-meridian-sunwheel', effect: { critChance: 0.02 },
    scriptText: ['Next fight: the first hit you land in every 5s is gilded for +7.'],
  },
  {
    id: 'meal-meridian-beacon-pie', name: 'Beacon Pie', emoji: '🥧', kind: 'food', sell: 30, isle: 'light',
    flavor: 'Beacon bass and Noon-pool bream under a lattice that glows faintly when you cut it. Eat it warm. It is warm.',
    script: 'meal-meridian-beacon-pie', effect: { maxHp: 10 },
    scriptText: ['Next fight: under 50% health you burn like a beacon — the foe within 130px takes 3 every second.'],
  },
  {
    id: 'meal-meridian-halo-parcel', name: 'Halo Parcel', emoji: '🥟', kind: 'food', sell: 34, isle: 'light',
    flavor: 'Halo skate and a wick loach from the gorge, folded in a pale ring of pastry. Lighter than it ought to be.',
    script: 'meal-meridian-halo-parcel', effect: { shieldHp: 10 },
    scriptText: ['Next fight: the first time you drop under 25% health, a halo catches you: +22 health, 2s of +25% speed.'],
  },
  {
    id: 'meal-meridian-gilt-steak', name: 'Gilt Swordfish Steak', emoji: '🥩', kind: 'food', sell: 44, isle: 'light',
    flavor: 'A slab of solar swordfish glazed in rune-trout butter and real gold leaf. Dorrit says the leaf is optional.',
    script: 'meal-meridian-gilt-steak', effect: { damageMult: 1.03 },
    scriptText: ['Next fight: each ultimate (Q) you cast gilds your next 3 hits for +10 each.'],
  },
];

export const PORT_SCRIPTS: Record<string, ItemScriptFactory> = {
  'charm-meridian-dusk-ticket': duskTicket,
  'charm-meridian-pocket-heliograph': pocketHeliograph,
  'charm-meridian-burning-shard': burningShard,
  'charm-meridian-clear-locket': clearLocket,
  'charm-meridian-glint-lure': glintLure,
  'charm-meridian-halo-float': haloFloat,
  'charm-meridian-face-down-mirror': faceDownMirror,
  'meal-meridian-queue-loaf': queueLoaf,
  'meal-meridian-sunwheel': sunwheel,
  'meal-meridian-beacon-pie': beaconPie,
  'meal-meridian-halo-parcel': haloParcel,
  'meal-meridian-gilt-steak': giltSteak,
};

export const PORT_SHOPS: ShopDef[] = [
  {
    id: 'meridian-store', name: 'The Glass Counter', buys: true,
    stock: [
      'charm-meridian-dusk-ticket', 'charm-meridian-pocket-heliograph', 'charm-meridian-burning-shard', 'charm-meridian-clear-locket',
      'food-meridian-sun-fig', 'food-meridian-shade-tea',
    ],
  },
  {
    id: 'meridian-tackle', name: 'Halloran\'s Lines & Lenses', buys: true,
    stock: ['rod-prism', 'rod-iron', 'rod-driftwood', 'charm-meridian-glint-lure', 'charm-meridian-halo-float'],
  },
];

export const PORT_BAKERIES: BakeryDef[] = [
  {
    id: 'meridian-bakery', name: 'The Golden Crust',
    recipes: [
      {
        id: 'recipe-meridian-queue-loaf', name: 'Queue-Loaf', coins: 14, output: 'meal-meridian-queue-loaf',
        inputs: [{ item: 'fish-glint-herring', count: 2 }, { item: 'fish-mirror-mackerel', count: 1 }],
      },
      {
        id: 'recipe-meridian-sunwheel', name: 'Noonfish Sunwheel', coins: 18, output: 'meal-meridian-sunwheel', makes: 2,
        inputs: [{ item: 'fish-noonfish', count: 2 }, { item: 'fish-glint-herring', count: 1 }],
      },
      {
        id: 'recipe-meridian-beacon-pie', name: 'Beacon Pie', coins: 28, output: 'meal-meridian-beacon-pie',
        inputs: [{ item: 'fish-beacon-bass', count: 1 }, { item: 'fish-blaze-bream', count: 1 }],
      },
      {
        id: 'recipe-meridian-halo-parcel', name: 'Halo Parcel', coins: 34, output: 'meal-meridian-halo-parcel',
        inputs: [{ item: 'fish-halo-skate', count: 1 }, { item: 'fish-wick-loach', count: 1 }],
      },
      {
        id: 'recipe-meridian-gilt-steak', name: 'Gilt Swordfish Steak', coins: 42, output: 'meal-meridian-gilt-steak',
        inputs: [{ item: 'fish-solar-swordfish', count: 1 }, { item: 'fish-rune-trout', count: 1 }],
      },
    ],
  },
];

