import type { BakeryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';

/**
 * Brinehollow's goods: Pernille Barnacle's four charms, Jory Gullet's two tackle charms, the keeper's
 * flame (a quest reward, never sold), two counter foods, and the five meals the Brine Oven bakes.
 *
 * Every script keeps its own clock (scene `time`, never the frame `dt`), draws what it is doing on
 * the fighter it belongs to, and says so out loud when it fires. Brandmark's charms were about fire
 * and timing; these are about the sea's habits — tides that go out, things that grow on you while
 * you are left alone, grit that becomes a pearl, currents you can ride, depth you can sound.
 */

const near = (ax: number, ay: number, bx: number, by: number, r: number): boolean =>
  (ax - bx) * (ax - bx) + (ay - by) * (ay - by) <= r * r;

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

// ── Charm: Tidemark Chalk ────────────────────────────────────────────

/**
 * Pip's trade, in a stick. Every eight seconds the chalk marks where your health stands. If you are
 * below the mark when the next one is due, the tide "goes out": 40% of what you lost since the mark
 * comes back (up to 18). Then the new mark is drawn where you are now. A charm for weathering a bad
 * stretch and climbing back out of it — it never helps a fighter who is not being hurt.
 */
const tidemarkChalk: ItemScriptFactory = (ctx) => {
  const PERIOD = 8000;
  let mark = -1;
  let next = 0;
  let washUntil = 0;
  return {
    update(time) {
      const p = ctx.player;
      if (mark < 0) { mark = p.hp; next = time + PERIOD; return; }
      if (time < next) return;
      next = time + PERIOD;
      if (alive(ctx, 'player') && p.hp < mark) {
        const back = Math.min(18, Math.max(1, Math.round((mark - p.hp) * 0.4)));
        ctx.heal(p, back);
        washUntil = time + 900;
        ctx.sfx('splash');
        ctx.float(p.x, p.y - 46, `THE TIDE GOES OUT +${back}`, '#bfe8f0');
      }
      mark = p.hp;
      ctx.sfx('clock-tick');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x + 28, y0 = p.y + 14, hgt = 40;
      const max = Math.max(1, p.maxHp);
      // A little slate gauge: current health as water, the mark as a chalk line.
      g.fillStyle(0x1e2628, 0.8); g.fillRect(x - 3, y0 - hgt, 6, hgt);
      const lvl = Math.max(0, Math.min(1, p.hp / max));
      g.fillStyle(0x5ab0c0, 0.85); g.fillRect(x - 2, y0 - hgt * lvl, 4, hgt * lvl);
      if (mark >= 0) {
        const my = y0 - hgt * Math.max(0, Math.min(1, mark / max));
        g.lineStyle(2, 0xf4f2ea, 0.95); g.lineBetween(x - 6, my, x + 6, my);
      }
      const fill = next > 0 ? 1 - Math.max(0, next - time) / PERIOD : 0;
      g.fillStyle(0xf4f2ea, 0.7); g.fillRect(x - 3, y0 + 3, 6 * fill, 2);
      if (time < washUntil) {
        const k = (washUntil - time) / 900;
        g.lineStyle(2, 0xbfe8f0, 0.6 * k); g.strokeEllipse(p.x, p.y + 10, 70 + (1 - k) * 50, 20 + (1 - k) * 14);
      }
    },
  };
};

// ── Charm: Barnacle Plate ────────────────────────────────────────────

/**
 * A copper plate off an old hull, crusted thick. Left alone, barnacles grow on you — one every 2.5
 * seconds you go unhurt, up to five. The next hit you take is blunted by 3 a barnacle, and they all
 * shear off at once; any that shear within 170px of the foe fly at them for 3 each. Close-in fighters
 * want a full plate when they step in; kiters will rarely see one shed into the foe.
 */
const barnaclePlate: ItemScriptFactory = (ctx) => {
  const GROW = 2500;
  let count = 0;
  let lastGrow = -1;
  const shards: { x: number; y: number; tx: number; ty: number; born: number }[] = [];
  return {
    update(time) {
      if (lastGrow < 0) lastGrow = time;
      if (count < 5 && time - lastGrow >= GROW) {
        count++;
        lastGrow = time;
        if (count === 5) ctx.float(ctx.player.x, ctx.player.y - 44, 'full plate', '#d8d4c4');
      }
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        if (time - s.born < 260) continue;
        shards.splice(i, 1);
        if (alive(ctx, 'npc') && near(s.tx, s.ty, ctx.npc.x, ctx.npc.y, 60)) ctx.hit(ctx.npc, 3, s.tx, s.ty);
      }
    },
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      lastGrow = now;
      if (count <= 0 || !alive(ctx, 'player')) return;
      const block = Math.min(amount, count * 3);
      if (block > 0) ctx.heal(ctx.player, block);
      const p = ctx.player;
      const close = alive(ctx, 'npc') && near(p.x, p.y, ctx.npc.x, ctx.npc.y, 170);
      if (close) {
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          shards.push({ x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 14, tx: ctx.npc.x, ty: ctx.npc.y, born: now });
        }
        ctx.sfx('crystal-shatter');
        ctx.float(p.x, p.y - 44, 'BARNACLES FLY', '#e8e4d4');
      } else {
        ctx.sfx('shield-break');
        ctx.float(p.x, p.y - 44, `-${block} barnacled`, '#d8d4c4');
      }
      count = 0;
    },
    drawAir(g, time) {
      const p = ctx.player;
      for (let i = 0; i < count; i++) {
        const a = (i / 5) * Math.PI * 2 + time / 3000;
        const x = p.x + Math.cos(a) * 19, y = p.y - 4 + Math.sin(a) * 12;
        g.fillStyle(0x6a6a5e, 1); g.fillCircle(x, y, 4);
        g.fillStyle(0xe4e0d2, 1); g.fillCircle(x, y - 0.5, 3);
        g.fillStyle(0x3a3a34, 1); g.fillCircle(x, y - 0.5, 1);
      }
      for (const s of shards) {
        const k = Math.min(1, (time - s.born) / 260);
        const x = s.x + (s.tx - s.x) * k, y = s.y + (s.ty - s.y) * k - Math.sin(k * Math.PI) * 18;
        g.fillStyle(0xe4e0d2, 1); g.fillTriangle(x - 3, y + 2, x + 3, y + 2, x, y - 3);
      }
    },
  };
};

// ── Charm: Pearl Grit ────────────────────────────────────────────────

/**
 * A grain of grit in a hinged shell. Every point of damage you take lays nacre over it; at sixty, a
 * pearl has formed, and your next landed hit cracks it on the foe for 24 more. The pain becomes the
 * pearl — it rewards trading blows, and it rewards knowing when the pearl is ready.
 */
const pearlGrit: ItemScriptFactory = (ctx) => {
  const NEED = 60;
  let nacre = 0;
  let ready = false;
  let popAt = -9999;
  let guard = false;
  return {
    onHitTaken(amount) {
      if (ready) return;
      nacre += amount;
      if (nacre >= NEED) {
        ready = true;
        ctx.sfx('sparkle');
        ctx.float(ctx.player.x, ctx.player.y - 46, 'A PEARL HAS FORMED', '#f8f4ec');
      }
    },
    onHitDealt() {
      if (!ready || guard || !alive(ctx, 'npc')) return;
      ready = false;
      nacre = 0;
      popAt = ctx.scene.time.now;
      guard = true;
      ctx.hit(ctx.npc, 24, ctx.npc.x, ctx.npc.y);
      guard = false;
      ctx.flash(ctx.npc.x, ctx.npc.y, 0xf8f4ec);
      ctx.sfx('crystal-chime');
      ctx.float(ctx.npc.x, ctx.npc.y - 48, 'PEARL!', '#f8f4ec');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x - 28, y = p.y - 26;
      // The shell, gaping wider as the pearl grows.
      const k = ready ? 1 : Math.min(1, nacre / NEED);
      const gape = 0.25 + k * 0.6;
      g.fillStyle(0x8a7a6a, 1);
      g.slice(x, y, 9, Math.PI, Math.PI * 2, false); g.fillPath();
      g.fillStyle(0xa8988a, 1);
      g.slice(x, y - 1, 9, Math.PI + 0.1, Math.PI * 2 - 0.1, false); g.fillPath();
      g.fillStyle(0x8a7a6a, 1);
      g.slice(x, y + 2 - gape * 4, 9, 0, Math.PI, false); g.fillPath();
      const pr = 1.2 + k * 3.4;
      g.fillStyle(ready ? 0xfffaf2 : 0xd8d0c0, 1); g.fillCircle(x, y + 1, pr);
      if (ready) {
        g.fillStyle(0xfffaf2, 0.18 + Math.sin(time / 120) * 0.08); g.fillCircle(x, y + 1, pr + 7);
        g.fillStyle(0xffffff, 1); g.fillCircle(x - 1, y, 1);
      }
      if (time - popAt < 500 && alive(ctx, 'npc')) {
        const q = (time - popAt) / 500;
        g.lineStyle(2, 0xf8f4ec, 1 - q); g.strokeCircle(ctx.npc.x, ctx.npc.y - 10, 10 + q * 40);
      }
    },
  };
};

// ── Charm: Rip-Tide Compass ──────────────────────────────────────────

/**
 * A sailor's compass that does not point north — it points the way the current is running. The
 * current turns every five seconds (the needle swings ahead of it, so you can see where it is going).
 * Move with it for 0.7s and you ride the rip: +25% speed for two seconds and every ability you have
 * cast this fight sheds 0.6s off its cooldown. Once ridden, it needs four seconds to set again.
 */
const ripTideCompass: ItemScriptFactory = (ctx) => {
  const TURN = 5000;
  let heading = 0;
  let target = 0;
  let nextTurn = 0;
  let px = NaN, py = NaN;
  let withFor = 0;
  let last = -1;
  let rideUntil = 0;
  let readyAt = 0;
  const cast = new Set<string>();
  return {
    onCast(id) { cast.add(id); },
    update(time) {
      if (last < 0) { last = time; nextTurn = time + TURN; heading = ctx.rng() * Math.PI * 2; target = heading; }
      const dt = Math.min(0.1, (time - last) / 1000);
      last = time;
      if (time >= nextTurn) { nextTurn = time + TURN; target = heading + (ctx.rng() < 0.5 ? -1 : 1) * (0.8 + ctx.rng() * 1.6); }
      // The current eases toward its new heading over the first second.
      heading += (target - heading) * Math.min(1, dt * 2.2);
      const p = ctx.player;
      if (isNaN(px)) { px = p.x; py = p.y; return; }
      const vx = (p.x - px) / Math.max(dt, 0.001), vy = (p.y - py) / Math.max(dt, 0.001);
      px = p.x; py = p.y;
      const sp = Math.hypot(vx, vy);
      let d = Math.atan2(vy, vx) - heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (sp > 60 && Math.abs(d) < 0.62) withFor += dt; else withFor = Math.max(0, withFor - dt * 2);
      if (withFor >= 0.7 && time >= readyAt && alive(ctx, 'player')) {
        withFor = 0;
        rideUntil = time + 2000;
        readyAt = time + 4000;
        ctx.boostSpeed(1.25, 2000);
        for (const id of cast) ctx.refund(id, 600);
        ctx.sfx('water-jet');
        ctx.float(p.x, p.y - 46, 'RIDING THE RIP', '#7ad8e8');
      }
    },
    drawGround(g, time) {
      const p = ctx.player;
      // Current lines streaming past the player in the direction it runs.
      const ux = Math.cos(heading), uy = Math.sin(heading);
      const riding = time < rideUntil;
      for (let i = 0; i < 6; i++) {
        const ph = ((time / 700) + i / 6) % 1;
        const off = (i - 2.5) * 12;
        const sx = p.x - ux * 60 + ux * ph * 120 - uy * off, sy = p.y + 8 - uy * 60 + uy * ph * 120 + ux * off * 0.6;
        g.lineStyle(riding ? 2.5 : 1.5, 0x7ad8e8, (riding ? 0.55 : 0.22) * Math.sin(ph * Math.PI));
        g.lineBetween(sx, sy, sx + ux * 16, sy + uy * 16);
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x + 26, y = p.y - 34;
      g.fillStyle(0x2a2420, 1); g.fillCircle(x, y, 8);
      g.fillStyle(0xe8e2cc, 1); g.fillCircle(x, y, 6.5);
      // The needle points where the current is heading next.
      const a = target;
      g.lineStyle(2, 0xc84a3a, 1); g.lineBetween(x, y, x + Math.cos(a) * 6, y + Math.sin(a) * 6);
      g.lineStyle(2, 0x2a6a7a, 1); g.lineBetween(x, y, x - Math.cos(a) * 4, y - Math.sin(a) * 4);
      const k = Math.min(1, withFor / 0.7);
      if (time >= readyAt && k > 0) {
        g.lineStyle(2, 0x7ad8e8, 0.8);
        g.beginPath(); g.arc(x, y, 11, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },
  };
};

// ── Charm: Sounding Lead ─────────────────────────────────────────────

/**
 * A lead-line for measuring depth, knotted every fathom. Hits you land from far off are "sounded":
 * past 220px, each hit adds one damage per 36px of distance (up to 10), and the line calls out the
 * fathoms. The kiter's charm — the opposite of anything that wants you close.
 */
const soundingLead: ItemScriptFactory = (ctx) => {
  let guard = false;
  let lastCall = { x: 0, y: 0, t: -9999, n: 0 };
  return {
    onHitDealt() {
      if (guard || !alive(ctx, 'npc')) return;
      const d = Math.hypot(ctx.npc.x - ctx.player.x, ctx.npc.y - ctx.player.y);
      if (d < 220) return;
      const bonus = Math.min(10, Math.floor(d / 36));
      guard = true;
      ctx.hit(ctx.npc, bonus, ctx.npc.x, ctx.npc.y);
      guard = false;
      lastCall = { x: ctx.npc.x, y: ctx.npc.y, t: ctx.scene.time.now, n: Math.round(d / 30) };
      ctx.float(ctx.npc.x + 18, ctx.npc.y - 40, `${lastCall.n} FATHOMS`, '#a8c8d8');
    },
    drawGround(g, time) {
      if (!alive(ctx, 'npc')) return;
      const p = ctx.player, n = ctx.npc;
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      // The line paid out between you: knots every fathom, taut and bright when you are far enough.
      const far = d >= 220;
      const knots = Math.min(14, Math.floor(d / 36));
      for (let k = 1; k <= knots; k++) {
        const u = (k * 36) / d;
        if (u >= 1) break;
        g.fillStyle(far ? 0xa8c8d8 : 0x4a5a64, far ? 0.55 : 0.25);
        g.fillCircle(p.x + (n.x - p.x) * u, p.y + 10 + (n.y - p.y) * u, far ? 2 : 1.4);
      }
      if (time - lastCall.t < 700) {
        const q = (time - lastCall.t) / 700;
        g.lineStyle(2, 0xa8c8d8, 1 - q); g.strokeCircle(lastCall.x, lastCall.y + 8, 12 + q * 30);
      }
    },
    drawAir(g) {
      const p = ctx.player;
      const x = p.x - 24, y = p.y + 4;
      g.lineStyle(1, 0xc8b88a, 1); g.lineBetween(x, y - 14, x, y - 4);
      g.fillStyle(0x5a6268, 1); g.fillTriangle(x - 4, y - 4, x + 4, y - 4, x, y + 6);
    },
  };
};

// ── Charm: Creel Trap ────────────────────────────────────────────────

/**
 * Tobiah's pots, shrunk to a charm. Every nine seconds a creel is set at your feet (two at most).
 * If the foe walks over one it snaps shut: 12 damage, and they take 15% more of your damage for 2.5s.
 * You choose where to stand when it drops — then lead them across it.
 */
const creelTrap: ItemScriptFactory = (ctx) => {
  const EVERY = 9000;
  let next = 0;
  const pots: { x: number; y: number; born: number; snapAt: number }[] = [];
  return {
    update(time) {
      if (next === 0) next = time + 3000;
      if (time >= next) {
        next = time + EVERY;
        if (pots.filter((p) => p.snapAt < 0).length >= 2) pots.splice(pots.findIndex((p) => p.snapAt < 0), 1);
        pots.push({ x: ctx.player.x, y: ctx.player.y + 12, born: time, snapAt: -1 });
        ctx.sfx('trap-set');
      }
      for (const p of pots) {
        if (p.snapAt >= 0 || time - p.born < 600 || !alive(ctx, 'npc')) continue;
        if (near(p.x, p.y, ctx.npc.x, ctx.npc.y + 12, 34)) {
          p.snapAt = time;
          ctx.hit(ctx.npc, 12, p.x, p.y);
          ctx.boostDamage(1.15, 2500);
          ctx.sfx('trap-snap');
          ctx.float(p.x, p.y - 40, 'CREELED!', '#d8b878');
        }
      }
      for (let i = pots.length - 1; i >= 0; i--) if (pots[i].snapAt >= 0 && time - pots[i].snapAt > 700) pots.splice(i, 1);
    },
    drawGround(g, time) {
      for (const p of pots) {
        const s = p.snapAt >= 0 ? 1 - Math.min(1, (time - p.snapAt) / 700) : Math.min(1, (time - p.born) / 300);
        const armed = p.snapAt < 0 && time - p.born >= 600;
        g.fillStyle(0x000000, 0.25 * s); g.fillEllipse(p.x, p.y + 4, 34 * s, 10 * s);
        g.fillStyle(0x4a3c2a, s); g.fillEllipse(p.x, p.y - 4, 26 * s, 16 * s);
        g.fillStyle(0x7a6440, s); g.fillEllipse(p.x, p.y - 5, 22 * s, 12 * s);
        g.lineStyle(1, 0x3a2e1e, s);
        for (let k = -2; k <= 2; k++) g.lineBetween(p.x + k * 4, p.y - 11, p.x + k * 5, p.y + 1);
        if (armed) {
          g.lineStyle(1.5, 0xd8b878, 0.35 + Math.sin(time / 200) * 0.15);
          g.strokeCircle(p.x, p.y, 34);
        }
        if (p.snapAt >= 0) {
          const q = (time - p.snapAt) / 700;
          g.lineStyle(3, 0xd8b878, 1 - q);
          g.lineBetween(p.x - 18, p.y - 12, p.x + 18, p.y + 4); g.lineBetween(p.x + 18, p.y - 12, p.x - 18, p.y + 4);
        }
      }
    },
  };
};

// ── Reward charm: The Keeper's Flame ─────────────────────────────────

/**
 * A wick from the broken lighthouse, still burning in a horn cup. The light shows where the rocks are:
 * any hit you land on a foe within 110px of the arena's edge strikes them on the rocks for 25% more.
 * Drive them to the walls. The rim of the arena glows faintly wherever the rocks are.
 */
const keepersFlame: ItemScriptFactory = (ctx) => {
  const EDGE = 110;
  const TOP = 96;
  let guard = false;
  let lastRock = -9999;
  const onRocks = (): boolean => {
    const n = ctx.npc;
    return n.x < EDGE || n.x > ctx.W - EDGE || n.y < TOP + EDGE || n.y > ctx.H - EDGE;
  };
  return {
    onHitDealt(amount) {
      if (guard || !alive(ctx, 'npc') || !onRocks()) return;
      const extra = Math.max(1, Math.round(amount * 0.25));
      guard = true;
      ctx.hit(ctx.npc, extra, ctx.npc.x, ctx.npc.y);
      guard = false;
      const now = ctx.scene.time.now;
      if (now - lastRock > 900) { ctx.float(ctx.npc.x, ctx.npc.y - 44, 'ON THE ROCKS', '#ffd88a'); ctx.sfx('stone-slam'); }
      lastRock = now;
    },
    drawGround(g, time) {
      const a = 0.05 + Math.sin(time / 400) * 0.02;
      g.fillStyle(0xffd88a, a);
      g.fillRect(0, TOP, EDGE, ctx.H - TOP); g.fillRect(ctx.W - EDGE, TOP, EDGE, ctx.H - TOP);
      g.fillRect(EDGE, TOP, ctx.W - EDGE * 2, EDGE); g.fillRect(EDGE, ctx.H - EDGE, ctx.W - EDGE * 2, EDGE);
      if (alive(ctx, 'npc') && onRocks()) {
        g.lineStyle(2, 0xffd88a, 0.6); g.strokeCircle(ctx.npc.x, ctx.npc.y + 6, 26 + Math.sin(time / 90) * 2);
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x + 22, y = p.y - 40;
      g.fillStyle(0xc8b088, 1); g.fillTriangle(x - 5, y, x + 5, y, x, y + 9);
      const f = 1 + Math.sin(time / 70) * 0.15;
      g.fillStyle(0xffd88a, 0.2); g.fillCircle(x, y - 4, 10 * f);
      g.fillStyle(0xffd88a, 1); g.fillEllipse(x, y - 4, 4 * f, 8 * f);
    },
  };
};

// ── Meals (one fight each) ───────────────────────────────────────────

/**
 * Herring Hardtack — a biscuit you can caulk a hull with. The first time you drop under half health
 * you stop and chew: 14 health comes back over three and a half seconds, bite by bite.
 */
const hardtack: ItemScriptFactory = (ctx) => {
  let bites = -1;
  let nextBite = 0;
  return {
    update(time) {
      const p = ctx.player;
      if (bites < 0 && p.hp > 0 && p.hp < p.maxHp * 0.5) {
        bites = 7;
        nextBite = time + 500;
        ctx.float(p.x, p.y - 44, '*crunch*', '#e8d8b0');
      }
      if (bites > 0 && time >= nextBite && alive(ctx, 'player')) {
        bites--;
        nextBite = time + 500;
        ctx.heal(p, 2);
        if (bites === 0) bites = -2;
      }
    },
    drawAir(g) {
      const p = ctx.player;
      const left = bites === -1 ? 7 : Math.max(0, bites);
      if (left <= 0) return;
      const x = p.x + 24, y = p.y - 30;
      g.fillStyle(0xc8a870, 1); g.fillRoundedRect(x - 8, y - 6, 16, 12, 2);
      g.fillStyle(0x8a6a3a, 1); for (let k = 0; k < 3; k++) for (let r = 0; r < 2; r++) g.fillCircle(x - 5 + k * 5, y - 2 + r * 5, 0.9);
      // Bites taken out of the corner.
      const taken = 7 - left;
      for (let k = 0; k < Math.min(3, taken); k++) { g.fillStyle(0x1a1a1a, 0.6); g.fillCircle(x + 8 - k * 4, y - 6, 2.6); }
    },
  };
};

/**
 * Slack-Water Bun — baked at the still moment between tides. Every ten seconds the water goes slack
 * for two; an ability cast in the slack gets 1.5s of its cooldown back. Watch the ring still, then cast.
 */
const slackWaterBun: ItemScriptFactory = (ctx) => {
  const CYCLE = 10000, SLACK = 2000;
  let start = -1;
  const inSlack = (time: number): boolean => start >= 0 && ((time - start) % CYCLE) > CYCLE - SLACK;
  let lastSlackCall = -1;
  return {
    update(time) {
      if (start < 0) start = time;
      const cyc = Math.floor((time - start) / CYCLE);
      if (inSlack(time) && cyc !== lastSlackCall) {
        lastSlackCall = cyc;
        ctx.sfx('hush');
        ctx.float(ctx.player.x, ctx.player.y - 44, 'slack water', '#c8e8e0');
      }
    },
    onCast(id) {
      const now = ctx.scene.time.now;
      if (!inSlack(now)) return;
      ctx.refund(id, 1500);
      ctx.float(ctx.player.x, ctx.player.y - 56, 'still', '#c8e8e0');
    },
    drawGround(g, time) {
      if (start < 0) return;
      const p = ctx.player;
      const ph = ((time - start) % CYCLE) / CYCLE;
      if (inSlack(time)) {
        g.lineStyle(2, 0xc8e8e0, 0.7); g.strokeEllipse(p.x, p.y + 10, 56, 18);
      } else {
        const r = 24 + Math.sin(time / 160) * 6 * (1 - ph);
        g.lineStyle(1.5, 0x7ab8c0, 0.35); g.strokeEllipse(p.x, p.y + 10, r * 2.2, r * 0.7);
      }
    },
  };
};

/**
 * Stilt-Crab Pasty — eat a crab, walk like one. Moving sideways to the foe (across their line, not
 * toward or away) for half a second gives you +15% damage for a second and a half.
 */
const crabPasty: ItemScriptFactory = (ctx) => {
  let px = NaN, py = NaN, last = -1;
  let side = 0;
  let until = 0;
  let readyAt = 0;
  return {
    update(time) {
      const p = ctx.player, n = ctx.npc;
      if (last < 0 || isNaN(px)) { last = time; px = p.x; py = p.y; return; }
      const dt = Math.min(0.1, (time - last) / 1000);
      last = time;
      const vx = p.x - px, vy = p.y - py;
      px = p.x; py = p.y;
      const sp = Math.hypot(vx, vy) / Math.max(dt, 0.001);
      const tx = n.x - p.x, ty = n.y - p.y;
      const tl = Math.hypot(tx, ty) || 1;
      const along = Math.abs((vx * tx + vy * ty) / (Math.hypot(vx, vy) * tl || 1));
      if (sp > 60 && along < 0.4) side += dt; else side = Math.max(0, side - dt * 1.5);
      if (side >= 0.5 && time >= readyAt && alive(ctx, 'npc')) {
        side = 0;
        until = time + 1500;
        readyAt = time + 2200;
        ctx.boostDamage(1.15, 1500);
        ctx.float(p.x, p.y - 44, 'SIDEWAYS!', '#e8784a');
      }
    },
    drawAir(g, time) {
      if (time > until) return;
      const p = ctx.player;
      for (const s of [-1, 1]) {
        const x = p.x + s * 22, y = p.y - 6;
        const snip = Math.sin(time / 50) * 0.4;
        g.fillStyle(0xe8784a, 0.9);
        g.slice(x, y, 6, s > 0 ? -0.6 - snip : Math.PI - 0.6 + snip, s > 0 ? 0.6 + snip : Math.PI + 0.6 - snip, true);
        g.fillPath();
      }
    },
  };
};

/**
 * Salt-Crust Turbot — baked whole in a shell of salt. Three plates of crust: each hit you take cracks
 * one and gives 5 back. When the last cracks, the salt flies in the foe's eyes if they are within 200px:
 * they take 25% more of your damage for three seconds.
 */
const saltTurbot: ItemScriptFactory = (ctx) => {
  let crust = 3;
  let blindUntil = 0;
  return {
    onHitTaken() {
      if (crust <= 0 || !alive(ctx, 'player')) return;
      crust--;
      ctx.heal(ctx.player, 5);
      ctx.sfx('crystal-shatter');
      if (crust > 0) { ctx.float(ctx.player.x, ctx.player.y - 42, `crust cracks (${crust})`, '#f0ece0'); return; }
      if (alive(ctx, 'npc') && near(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y, 200)) {
        blindUntil = ctx.scene.time.now + 3000;
        ctx.boostDamage(1.25, 3000);
        ctx.float(ctx.npc.x, ctx.npc.y - 46, 'SALT IN THE EYES', '#f0ece0');
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      for (let i = 0; i < crust; i++) {
        const x = p.x - 12 + i * 12, y = p.y + 30;
        g.fillStyle(0xf0ece0, 0.95); g.fillTriangle(x - 5, y + 3, x + 5, y + 3, x, y - 4);
      }
      if (time < blindUntil && alive(ctx, 'npc')) {
        for (let i = 0; i < 8; i++) {
          const a = time / 200 + i;
          g.fillStyle(0xffffff, 0.8); g.fillRect(ctx.npc.x + Math.cos(a) * 14, ctx.npc.y - 30 + Math.sin(a * 1.3) * 5, 2, 2);
        }
      }
    },
  };
};

/**
 * Black Eel Loaf — eel baked into squid-ink bread. Each time you cast your ultimate (Q), the foe is
 * inked: your next three hits on them each add 6.
 */
const eelInkLoaf: ItemScriptFactory = (ctx) => {
  let inked = 0;
  let guard = false;
  return {
    onCast(_id, slot) {
      if (slot !== 'q') return;
      inked = 3;
      ctx.sfx('slime-splat');
      ctx.float(ctx.npc.x, ctx.npc.y - 46, 'INKED', '#8a9aaa');
    },
    onHitDealt() {
      if (inked <= 0 || guard || !alive(ctx, 'npc')) return;
      inked--;
      guard = true;
      ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y);
      guard = false;
    },
    drawAir(g, time) {
      if (inked <= 0 || !alive(ctx, 'npc')) return;
      const n = ctx.npc;
      for (let i = 0; i < inked; i++) {
        const a = time / 300 + (i * Math.PI * 2) / 3;
        g.fillStyle(0x0a0a12, 0.85); g.fillCircle(n.x + Math.cos(a) * 18, n.y - 20 + Math.sin(a) * 8, 4);
        g.fillStyle(0x3a4a6a, 0.7); g.fillCircle(n.x + Math.cos(a) * 18 - 1, n.y - 21 + Math.sin(a) * 8, 1.4);
      }
    },
  };
};

// ── Item defs ────────────────────────────────────────────────────────

export const PORT_ITEMS: IsleItemDef[] = [
  // Barnacle & Daughters
  {
    id: 'charm-brinehollow-tidemark-chalk', name: 'Tidemark Chalk', emoji: '🖍️', kind: 'charm', price: 220, isle: 'water',
    flavor: 'Every Brinehollow wall is chalked with where the water reached. This stick remembers where you did.',
    script: 'charm-brinehollow-tidemark-chalk',
    scriptText: [
      'Every 8s, chalks your health. Below the last mark when the next is due: heal 40% of the drop (max 18).',
    ],
  },
  {
    id: 'charm-brinehollow-barnacle-plate', name: 'Barnacle Plate', emoji: '🐚', kind: 'charm', price: 300, isle: 'water',
    flavor: 'A copper hull-plate from a tithe-cutter, crusted an inch deep. Barnacles take to anything left alone.',
    script: 'charm-brinehollow-barnacle-plate', effect: { maxHp: 6 },
    scriptText: [
      'Grow a barnacle every 2.5s unhurt (max 5). The next hit is blunted by 3 per barnacle.',
      'Shed within 170px of the foe, they fly at them for 3 each.',
    ],
  },
  {
    id: 'charm-brinehollow-pearl-grit', name: 'Pearl Grit', emoji: '🦪', kind: 'charm', price: 380, isle: 'water',
    flavor: 'One grain of grit in a hinged shell. Give it enough trouble and it gives you something back.',
    script: 'charm-brinehollow-pearl-grit',
    scriptText: ['Every 60 damage you take forms a pearl; your next landed hit cracks it on the foe for +24.'],
  },
  {
    id: 'charm-brinehollow-riptide-compass', name: 'Rip-Tide Compass', emoji: '🧭', kind: 'charm', price: 460, isle: 'water',
    flavor: 'Does not point north. Points the way the water wants to go, which in Brinehollow is more useful.',
    script: 'charm-brinehollow-riptide-compass', effect: { speedMult: 1.03 },
    scriptText: [
      'A current runs past you and turns every 5s. Move with it for 0.7s to ride the rip:',
      '+25% speed for 2s and every ability you have cast sheds 0.6s of cooldown (every 4s at most).',
    ],
  },
  // The Gaff & Gullet
  {
    id: 'charm-brinehollow-sounding-lead', name: 'Sounding Lead', emoji: '⚖️', kind: 'charm', price: 260, isle: 'water',
    flavor: 'A lead weight on a knotted line, a knot to the fathom. Pilots swing it off the bow at night.',
    script: 'charm-brinehollow-sounding-lead',
    scriptText: ['Hits you land from more than 220px away add +1 per 36px of distance (max +10).'],
  },
  {
    id: 'charm-brinehollow-creel-trap', name: 'Creel Trap', emoji: '🪤', kind: 'charm', price: 340, isle: 'water',
    flavor: 'A willow crab-pot no bigger than a fist. Tobiah swears it catches bigger things than crabs.',
    script: 'charm-brinehollow-creel-trap',
    scriptText: [
      'Every 9s a creel is set at your feet (2 at most). The foe stepping on one snaps it:',
      '12 damage, and +15% of your damage to them for 2.5s.',
    ],
  },
  // Quest reward
  {
    id: 'charm-brinehollow-keepers-flame', name: "The Keeper's Flame", emoji: '🕯️', kind: 'charm', isle: 'water',
    flavor: 'A wick from the broken light in a cup of whale horn. It has shown ships the rocks for forty years.',
    script: 'charm-brinehollow-keepers-flame', effect: { critChance: 0.02 },
    scriptText: ['Hits on a foe within 110px of the arena edge strike them on the rocks for +25%.'],
  },
  // Counter food
  {
    id: 'food-brinehollow-ship-biscuit', name: "Ship's Biscuit", emoji: '🍪', kind: 'food', price: 30, sell: 8, isle: 'water',
    flavor: 'Baked four times, so the weevils give up. Pernille sells them by the tin to anyone going up a road.',
    effect: { shieldHp: 8 },
  },
  {
    id: 'food-brinehollow-kelp-toffee', name: 'Kelp Toffee', emoji: '🍬', kind: 'food', price: 45, sell: 12, isle: 'water',
    flavor: 'Brown, salty, impossible to chew quickly. The children of the stilt quarter live on it.',
    effect: { speedMult: 1.04, regenPerSecond: 0.2 },
  },
  // The Brine Oven's meals
  {
    id: 'meal-brinehollow-herring-hardtack', name: 'Herring Hardtack', emoji: '🍘', kind: 'food', sell: 12, isle: 'water',
    flavor: 'Herring pounded into ship\'s biscuit and baked hard enough to caulk a hull. It lasts a voyage.',
    script: 'meal-brinehollow-herring-hardtack', effect: { maxHp: 6 },
    scriptText: ['Next fight: the first time you drop under half health, chew — heal 14 over 3.5s.'],
  },
  {
    id: 'meal-brinehollow-slack-water-bun', name: 'Slack-Water Bun', emoji: '🥯', kind: 'food', sell: 16, isle: 'water',
    flavor: 'A sweet bun with a herring baked in its heart, given to babies born between tides. For luck.',
    script: 'meal-brinehollow-slack-water-bun', effect: { regenPerSecond: 0.3 },
    scriptText: ['Next fight: every 10s the water goes slack for 2s. Abilities cast in the slack get 1.5s back.'],
  },
  {
    id: 'meal-brinehollow-crab-pasty', name: 'Stilt-Crab Pasty', emoji: '🥟', kind: 'food', sell: 22, isle: 'water',
    flavor: 'Stilt crab and Tidewater sand dab in a crimped crust. Eaten sideways, by tradition.',
    script: 'meal-brinehollow-crab-pasty', effect: { reflectFraction: 0.03 },
    scriptText: ['Next fight: moving sideways to the foe for 0.5s gives +15% damage for 1.5s.'],
  },
  {
    id: 'meal-brinehollow-salt-turbot', name: 'Salt-Crust Turbot', emoji: '🐡', kind: 'food', sell: 30, isle: 'water',
    flavor: 'A whole turbot baked in a shell of Imma\'s salt, with Rimefast smelt laid on top like a crown.',
    script: 'meal-brinehollow-salt-turbot', effect: { maxHp: 10 },
    scriptText: [
      'Next fight: three salt plates. Each hit you take cracks one and heals 5.',
      'The last one flies in the foe\'s eyes (within 200px): +25% of your damage to them for 3s.',
    ],
  },
  {
    id: 'meal-brinehollow-eel-ink-loaf', name: 'Black Eel Loaf', emoji: '🍞', kind: 'food', sell: 34, isle: 'water',
    flavor: 'Undertow eel baked into bread black with Inkwell squid-ink. Tastes of the bottom of the sea.',
    script: 'meal-brinehollow-eel-ink-loaf', effect: { damageMult: 1.03 },
    scriptText: ['Next fight: each ultimate (Q) you cast inks the foe — your next 3 hits on them add +6 each.'],
  },
];

export const PORT_SCRIPTS: Record<string, ItemScriptFactory> = {
  'charm-brinehollow-tidemark-chalk': tidemarkChalk,
  'charm-brinehollow-barnacle-plate': barnaclePlate,
  'charm-brinehollow-pearl-grit': pearlGrit,
  'charm-brinehollow-riptide-compass': ripTideCompass,
  'charm-brinehollow-sounding-lead': soundingLead,
  'charm-brinehollow-creel-trap': creelTrap,
  'charm-brinehollow-keepers-flame': keepersFlame,
  'meal-brinehollow-herring-hardtack': hardtack,
  'meal-brinehollow-slack-water-bun': slackWaterBun,
  'meal-brinehollow-crab-pasty': crabPasty,
  'meal-brinehollow-salt-turbot': saltTurbot,
  'meal-brinehollow-eel-ink-loaf': eelInkLoaf,
};

export const PORT_SHOPS: ShopDef[] = [
  {
    id: 'brinehollow-store', name: 'Barnacle & Daughters', buys: true,
    stock: [
      'charm-brinehollow-tidemark-chalk', 'charm-brinehollow-barnacle-plate', 'charm-brinehollow-pearl-grit', 'charm-brinehollow-riptide-compass',
      'food-brinehollow-ship-biscuit', 'food-brinehollow-kelp-toffee',
    ],
  },
  {
    id: 'brinehollow-tackle', name: 'The Gaff & Gullet', buys: true,
    stock: ['rod-whalebone', 'rod-iron', 'rod-driftwood', 'charm-brinehollow-sounding-lead', 'charm-brinehollow-creel-trap'],
  },
];

export const PORT_BAKERIES: BakeryDef[] = [
  {
    id: 'brinehollow-bakery', name: 'The Brine Oven',
    recipes: [
      {
        id: 'recipe-brinehollow-herring-hardtack', name: 'Herring Hardtack', coins: 10, output: 'meal-brinehollow-herring-hardtack', makes: 2,
        inputs: [{ item: 'fish-brine-herring', count: 3 }],
      },
      {
        id: 'recipe-brinehollow-slack-water-bun', name: 'Slack-Water Bun', coins: 14, output: 'meal-brinehollow-slack-water-bun',
        inputs: [{ item: 'fish-brine-herring', count: 2 }, { item: 'fish-gullet-cod', count: 1 }],
      },
      {
        id: 'recipe-brinehollow-crab-pasty', name: 'Stilt-Crab Pasty', coins: 20, output: 'meal-brinehollow-crab-pasty',
        inputs: [{ item: 'fish-stilt-crab', count: 1 }, { item: 'fish-sand-dab', count: 1 }],
      },
      {
        id: 'recipe-brinehollow-salt-turbot', name: 'Salt-Crust Turbot', coins: 28, output: 'meal-brinehollow-salt-turbot',
        inputs: [{ item: 'fish-tidal-turbot', count: 1 }, { item: 'fish-icicle-smelt', count: 2 }],
      },
      {
        id: 'recipe-brinehollow-eel-ink-loaf', name: 'Black Eel Loaf', coins: 32, output: 'meal-brinehollow-eel-ink-loaf',
        inputs: [{ item: 'fish-undertow-eel', count: 1 }, { item: 'fish-inkfin-squid', count: 1 }],
      },
    ],
  },
];
