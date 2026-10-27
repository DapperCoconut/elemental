import type { BakeryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';

/**
 * Windlass's goods: Perpetua Draught's four charms, Fen Halyard's two tackle charms, Ada Bellweather's
 * true meter (a quest reward, never sold), two counter foods, and the five meals the Rising Loaf bakes.
 *
 * Every script keeps its own clock (scene `time`, never the frame `dt`), draws what it is doing on
 * the fighter it belongs to, and says so out loud when it fires. Brandmark's charms were about fire
 * and timing, the Reach's about the sea's habits, Thornwild's about a garden's; these are about the
 * air's — a wind that changes and has a side, a kite on a line, a held breath, the line in the sky
 * above which breathing costs, a float that dips, a shoal that moves as one, and a meter that counts.
 */

const near = (ax: number, ay: number, bx: number, by: number, r: number): boolean =>
  (ax - bx) * (ax - bx) + (ay - by) * (ay - by) <= r * r;

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

/** Distance from point P to the segment AB. */
const segDist = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy;
  const t = L > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
};

// ── Charm: Weathercock Pin ───────────────────────────────────────────

/**
 * A tin weathercock no bigger than a thumb, pinned to the shoulder. Every five seconds the wind
 * shifts to a new quarter, and the cock swings round to show where it is blowing. A hit you land
 * while the foe stands downwind of you (inside a 100° cone of the wind) carries on the wind for +6.
 * Read the vane, step upwind of them, and swing with it.
 */
const weathercock: ItemScriptFactory = (ctx) => {
  const SHIFT = 5000;
  let ang = ctx.rng() * Math.PI * 2;
  let from = ang;
  let shiftAt = -1;
  let guard = false;
  let gustAt = -9999;
  const downwind = (): boolean => {
    if (!alive(ctx, 'npc')) return false;
    const dx = ctx.npc.x - ctx.player.x, dy = ctx.npc.y - ctx.player.y;
    if (Math.hypot(dx, dy) < 10) return false;
    let d = Math.atan2(dy, dx) - ang;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d) < (50 * Math.PI) / 180;
  };
  const shown = (time: number): number => {
    const q = Math.min(1, (time - shiftAt) / 600);
    let d = ang - from;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return from + d * (1 - Math.pow(1 - q, 3));
  };
  return {
    update(time) {
      if (shiftAt < 0) shiftAt = time;
      if (time - shiftAt >= SHIFT) {
        from = ang;
        ang = Math.floor(ctx.rng() * 8) * (Math.PI / 4) + (ctx.rng() - 0.5) * 0.3;
        shiftAt = time;
        ctx.sfx('gust');
      }
    },
    onHitDealt() {
      if (guard || !downwind()) return;
      guard = true;
      ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y);
      guard = false;
      gustAt = ctx.scene.time.now;
      ctx.float(ctx.npc.x, ctx.npc.y - 46, 'WITH THE WIND +6', '#cfeaff');
    },
    drawGround(g, time) {
      const p = ctx.player;
      const a = shown(time);
      const hot = downwind();
      // The downwind cone, faint, with streaks blowing along it.
      g.fillStyle(0xcfeaff, hot ? 0.12 : 0.05);
      g.slice(p.x, p.y + 10, 170, a - 0.87, a + 0.87, false); g.fillPath();
      for (let k = 0; k < 5; k++) {
        const ph = ((time / 700) + k / 5) % 1;
        const off = (k - 2) * 0.28;
        const r0 = 30 + ph * 130;
        g.lineStyle(1.5, 0xe8f6ff, (1 - ph) * (hot ? 0.6 : 0.3));
        g.lineBetween(p.x + Math.cos(a + off) * r0, p.y + 10 + Math.sin(a + off) * r0, p.x + Math.cos(a + off) * (r0 + 18), p.y + 10 + Math.sin(a + off) * (r0 + 18));
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      const a = shown(time);
      const x = p.x + 18, y = p.y - 44;
      // Spindle, arrow and the little cock riding it, swung to point downwind.
      g.lineStyle(1.5, 0x3a3a3a, 1); g.lineBetween(x, y + 12, x, y);
      const ex = Math.cos(a) * 11, ey = Math.sin(a) * 5;
      g.lineStyle(2, 0xc8c0a8, 1); g.lineBetween(x - ex, y - ey, x + ex, y + ey);
      g.fillStyle(0xc8c0a8, 1); g.fillTriangle(x + ex * 1.35, y + ey * 1.35, x + ex - ey * 0.5, y + ey + ex * 0.25, x + ex + ey * 0.5, y + ey - ex * 0.25);
      g.fillStyle(0xd4aa4a, 1); g.fillCircle(x - ex * 0.2, y - ey * 0.2 - 4, 3.2);
      g.fillStyle(0xd84a3a, 1); g.fillTriangle(x - ex * 0.2 - 1, y - ey * 0.2 - 7, x - ex * 0.2 + 2, y - ey * 0.2 - 7, x - ex * 0.2, y - ey * 0.2 - 10);
      // A countdown pip ring for the next shift.
      const left = 1 - Math.min(1, (time - shiftAt) / SHIFT);
      g.lineStyle(1, 0xcfeaff, 0.5); g.beginPath(); g.arc(x, y + 4, 9, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      if (time - gustAt < 450 && alive(ctx, 'npc')) {
        const q = (time - gustAt) / 450;
        g.lineStyle(2, 0xcfeaff, 1 - q);
        g.beginPath(); g.arc(ctx.npc.x, ctx.npc.y - 10, 14 + q * 20, a - 0.8, a + 0.8, false); g.strokePath();
      }
    },
  };
};

// ── Charm: Fighting Kite ─────────────────────────────────────────────

/**
 * A little fighting kite on 110px of glass-dressed line, flown off your belt. It rides the air
 * behind you and drifts up when you stand still. The LINE cuts: whenever the foe is within reach of
 * the line between you and the kite, they take 4 (once every 0.8s). Run circles round them and drag
 * the line through; stand still and it only guards your back.
 */
const fightingKite: ItemScriptFactory = (ctx) => {
  const LEN = 110;
  let kx = NaN, ky = NaN;
  let lastCut = -9999;
  let cutAt = -9999;
  return {
    update(time, dt) {
      const p = ctx.player;
      if (isNaN(kx)) { kx = p.x; ky = p.y - LEN; }
      // The kite climbs and wanders on the wind…
      ky -= 70 * dt;
      kx += Math.sin(time / 650) * 40 * dt;
      // …but the line holds it at length.
      const dx = kx - p.x, dy = ky - (p.y - 20);
      const d = Math.hypot(dx, dy) || 1;
      if (d > LEN) { kx = p.x + (dx / d) * LEN; ky = p.y - 20 + (dy / d) * LEN; }
      kx = Math.max(10, Math.min(ctx.W - 10, kx));
      ky = Math.max(60, Math.min(ctx.H - 10, ky));
      if (!alive(ctx, 'npc') || !alive(ctx, 'player') || time - lastCut < 800) return;
      const n = ctx.npc;
      if (segDist(n.x, n.y - 10, p.x, p.y - 20, kx, ky) < 22) {
        lastCut = time; cutAt = time;
        ctx.hit(n, 4, n.x, n.y);
        ctx.sfx('slash');
        ctx.float(n.x, n.y - 44, 'LINE CUT', '#f0c040');
      }
    },
    drawAir(g, time) {
      if (isNaN(kx)) return;
      const p = ctx.player;
      const live = time - cutAt < 300;
      // The line, glinting with glass.
      g.lineStyle(1.5, live ? 0xfff0a0 : 0xd8d0c0, 0.85);
      g.beginPath();
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        const x = p.x + (kx - p.x) * t, y = p.y - 20 + (ky - (p.y - 20)) * t + Math.sin(t * Math.PI) * 8;
        if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
      for (let k = 1; k < 5; k++) {
        if (Math.sin(time / 120 + k * 1.7) < 0.6) continue;
        const t = k / 5;
        g.fillStyle(0xffffff, 0.9); g.fillCircle(p.x + (kx - p.x) * t, p.y - 20 + (ky - (p.y - 20)) * t + Math.sin(t * Math.PI) * 8, 1.4);
      }
      // The kite: a red-and-cream diamond, nose into the wind, tail flicking.
      const tilt = Math.sin(time / 300) * 0.25;
      const c = Math.cos(tilt), s = Math.sin(tilt);
      const P = (dx: number, dy: number): [number, number] => [kx + dx * c - dy * s, ky + dx * s + dy * c];
      const top = P(0, -12), bot = P(0, 14), l = P(-10, -2), r = P(10, -2), m = P(0, -2);
      g.fillStyle(0xe85a4a, 1); g.fillTriangle(top[0], top[1], r[0], r[1], m[0], m[1]); g.fillTriangle(l[0], l[1], bot[0], bot[1], m[0], m[1]);
      g.fillStyle(0xf4f0e0, 1); g.fillTriangle(top[0], top[1], l[0], l[1], m[0], m[1]); g.fillTriangle(r[0], r[1], bot[0], bot[1], m[0], m[1]);
      g.lineStyle(1, 0x3e2e22, 1); g.lineBetween(top[0], top[1], bot[0], bot[1]); g.lineBetween(l[0], l[1], r[0], r[1]);
      let tx = bot[0], ty = bot[1];
      for (let k = 1; k <= 4; k++) {
        const nx = tx + Math.sin(time / 160 + k) * 4, ny = ty + 7;
        g.lineStyle(1, 0xe85a4a, 0.9); g.lineBetween(tx, ty, nx, ny);
        g.fillStyle(k % 2 ? 0xe85a4a : 0xf4f0e0, 1); g.fillCircle(nx, ny, 1.8);
        tx = nx; ty = ny;
      }
    },
  };
};

// ── Charm: Bottled Breath ────────────────────────────────────────────

/**
 * A corked bottle of your own breath — the one the collectors never got. Hold your breath: after
 * two seconds without casting, the bottle starts to fill, and it is full three seconds later. Your
 * next cast uncorks it. Full: +25% damage for 2.5s and that ability's cooldown is cut by 1.5s.
 * Half full or more: +12% for 1.5s. A hit taken while it fills knocks the wind out of it (−half).
 */
const bottledBreath: ItemScriptFactory = (ctx) => {
  const WAIT = 2000, FILL = 3000;
  let lastCast = -1;
  let fill = 0;
  let popAt = -9999;
  let popFull = false;
  let saidFull = false;
  return {
    update(time, dt) {
      if (lastCast < 0) lastCast = time;
      if (time - lastCast >= WAIT && fill < 1) {
        fill = Math.min(1, fill + (dt * 1000) / FILL);
        if (fill >= 1 && !saidFull) { saidFull = true; ctx.sfx('bubble'); ctx.float(ctx.player.x, ctx.player.y - 48, 'BREATH HELD', '#d8f0ff'); }
      }
    },
    onCast(abilityId) {
      const now = ctx.scene.time.now;
      if (fill >= 1) {
        ctx.boostDamage(1.25, 2500);
        ctx.refund(abilityId, 1500);
        ctx.sfx('whoosh');
        ctx.float(ctx.player.x, ctx.player.y - 48, 'UNCORKED!', '#d8f0ff');
        popAt = now; popFull = true;
      } else if (fill >= 0.5) {
        ctx.boostDamage(1.12, 1500);
        ctx.float(ctx.player.x, ctx.player.y - 46, 'half a breath', '#b8d8f0');
        popAt = now; popFull = false;
      }
      fill = 0;
      saidFull = false;
      lastCast = now;
    },
    onHitTaken() {
      if (fill <= 0) return;
      fill = Math.max(0, fill - 0.5);
      saidFull = false;
      ctx.float(ctx.player.x, ctx.player.y - 44, 'winded', '#8aa8c0');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x - 24, y = p.y - 6;
      // The bottle at your hip: glass, a cork, the breath curling inside as it fills.
      g.fillStyle(0xa8c8d8, 0.5); g.fillRoundedRect(x - 6, y - 18, 12, 18, 4); g.fillRect(x - 2.5, y - 24, 5, 7);
      if (fill > 0) {
        const h = 16 * fill;
        g.fillStyle(0xd8f0ff, 0.9); g.fillRoundedRect(x - 5, y - 1 - h, 10, h, 3);
        g.fillStyle(0xffffff, 0.6); g.fillCircle(x - 1 + Math.sin(time / 200) * 2, y - 1 - h * 0.6, 2);
      }
      g.fillStyle(0x8a6a44, 1); g.fillRect(x - 3, y - 27, 6, 4);
      if (fill >= 1) {
        g.lineStyle(1.5, 0xd8f0ff, 0.5 + Math.sin(time / 150) * 0.25); g.strokeCircle(x, y - 10, 13);
        // Your cheeks puff while you hold it.
        g.fillStyle(0xd8f0ff, 0.35); g.fillCircle(p.x - 8, p.y - 22, 4); g.fillCircle(p.x + 8, p.y - 22, 4);
      }
      if (time - popAt < 600) {
        const q = (time - popAt) / 600;
        for (let k = 0; k < (popFull ? 8 : 4); k++) {
          const a = (k / 8) * Math.PI * 2 + q;
          g.fillStyle(0xe8f6ff, 1 - q); g.fillCircle(x + Math.cos(a) * q * 34, y - 24 + Math.sin(a) * q * 22, 3 - q * 2);
        }
      }
    },
  };
};

// ── Charm: Cloud-Line Ribbon ─────────────────────────────────────────

/**
 * A strip of pale ribbon cut from the cloud line itself, the way a Windlass grandmother tells it.
 * Wearing it, you can see the line across any fight: halfway up the arena. Below it, the air is
 * free — you breathe back 1 health every 1.5s. Above it, breath is taxed — and the foe pays: every
 * hit you land on a foe standing above the line adds +4. Fight from the floor; drive them up.
 */
const cloudLineRibbon: ItemScriptFactory = (ctx) => {
  const lineY = (): number => (96 + ctx.H) / 2;
  let lastBreath = -1;
  let guard = false;
  let taxAt = -9999;
  return {
    update(time) {
      if (lastBreath < 0) lastBreath = time;
      if (!alive(ctx, 'player')) return;
      if (ctx.player.y > lineY() && time - lastBreath >= 1500) {
        lastBreath = time;
        if (ctx.player.hp < ctx.player.maxHp) ctx.heal(ctx.player, 1);
      } else if (ctx.player.y <= lineY()) {
        lastBreath = time;
      }
    },
    onHitDealt() {
      if (guard || !alive(ctx, 'npc') || ctx.npc.y > lineY()) return;
      guard = true;
      ctx.hit(ctx.npc, 4, ctx.npc.x, ctx.npc.y);
      guard = false;
      const now = ctx.scene.time.now;
      if (now - taxAt > 900) ctx.float(ctx.npc.x, ctx.npc.y - 46, 'TAXED +4', '#86d0f0');
      taxAt = now;
    },
    drawGround(g, time) {
      const y = lineY();
      // The line: a soft band of cloud puffs drifting across the arena.
      g.fillStyle(0xf2f6fa, 0.06); g.fillRect(0, y - 10, ctx.W, 20);
      for (let x = -40; x < ctx.W + 40; x += 34) {
        const xx = x + ((time / 60) % 34);
        g.fillStyle(0xf2f6fa, 0.12 + Math.sin(xx * 0.05 + time / 900) * 0.04);
        g.fillEllipse(xx, y + Math.sin(xx * 0.03) * 3, 40, 12);
      }
      g.lineStyle(1, 0xc8d4e0, 0.35);
      for (let x = 0; x < ctx.W; x += 22) g.lineBetween(x, y, x + 11, y);
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (p.y > lineY()) {
        // Free breath: a little puff of mist from you every breath.
        const ph = (time / 1500) % 1;
        g.fillStyle(0xe8f6ff, (1 - ph) * 0.5); g.fillCircle(p.x + 10 + ph * 12, p.y - 24 - ph * 10, 3 + ph * 5);
      }
      if (alive(ctx, 'npc') && ctx.npc.y <= lineY()) {
        // The foe above the line wears a meter, ticking.
        const n = ctx.npc;
        g.fillStyle(0x7a5e26, 1); g.fillCircle(n.x, n.y - 2, 6);
        g.fillStyle(0xd4aa4a, 1); g.fillCircle(n.x, n.y - 2, 5);
        g.lineStyle(1, 0x1a1612, 1); const a = -Math.PI / 2 + Math.sin(time / 90) * 0.6; g.lineBetween(n.x, n.y - 2, n.x + Math.cos(a) * 4, n.y - 2 + Math.sin(a) * 4);
      }
    },
  };
};

// ── Charm: Spindrift Float ───────────────────────────────────────────

/**
 * A red-and-white cork float off Fen's own line. It rides beside you and bobs on a 3.2-second swell,
 * and at the bottom of every swell it dips — a bite! — for just over half a second. Land a hit while
 * it is under and you strike: +10. Watch the float, not the foe. Fishermen will understand.
 */
const spindriftFloat: ItemScriptFactory = (ctx) => {
  const CYCLE = 3200, DIP = 550;
  let start = -1;
  let struckCycle = -1;
  let strikeAt = -9999;
  let guard = false;
  const phase = (time: number): { cyc: number; t: number } => {
    const e = time - start;
    return { cyc: Math.floor(e / CYCLE), t: e % CYCLE };
  };
  const dipping = (time: number): boolean => phase(time).t >= CYCLE - DIP;
  return {
    update(time) { if (start < 0) start = time; },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (guard || start < 0 || !dipping(now) || !alive(ctx, 'npc')) return;
      const { cyc } = phase(now);
      if (cyc === struckCycle) return;
      struckCycle = cyc;
      strikeAt = now;
      guard = true;
      ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y);
      guard = false;
      ctx.sfx('reload');
      ctx.float(ctx.npc.x, ctx.npc.y - 48, 'STRIKE! +10', '#ff7a6a');
    },
    drawGround(g, time) {
      if (start < 0) return;
      const p = ctx.player;
      const x = p.x + 30, y = p.y + 16;
      const { t } = phase(time);
      const dip = t >= CYCLE - DIP;
      // Ripples spreading from the float; a sharp ring when it dips.
      for (let k = 0; k < 2; k++) {
        const ph = ((time / 900) + k / 2) % 1;
        g.lineStyle(1, 0xcfe8f0, (1 - ph) * 0.4); g.strokeEllipse(x, y, 8 + ph * 26, 3 + ph * 8);
      }
      if (dip) { g.lineStyle(2, 0xff7a6a, 0.6); g.strokeEllipse(x, y, 30, 10); }
    },
    drawAir(g, time) {
      if (start < 0) return;
      const p = ctx.player;
      const x = p.x + 30, y = p.y + 16;
      const { t } = phase(time);
      const dip = t >= CYCLE - DIP;
      const bob = dip ? 6 : Math.sin((t / (CYCLE - DIP)) * Math.PI * 2) * 2;
      // The float: a cork egg, red cap, white belly, a quill sticking up.
      g.lineStyle(1, 0x3a2e22, 1); g.lineBetween(x, y - 12 + bob, x, y - 20 + bob);
      g.fillStyle(0xf4f0e0, 1); g.fillEllipse(x, y - 4 + bob, 9, 10);
      g.fillStyle(0xe84a3a, 1); g.fillEllipse(x, y - 8 + bob, 9, 6);
      if (dip) {
        g.fillStyle(0xff7a6a, 0.3 + Math.sin(time / 50) * 0.15); g.fillCircle(x, y - 4, 10);
      } else {
        // The swell gauge: an arc filling toward the dip.
        const k = t / (CYCLE - DIP);
        g.lineStyle(1.5, 0xcfe8f0, 0.5); g.beginPath(); g.arc(x, y - 4, 12, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      if (time - strikeAt < 500 && alive(ctx, 'npc')) {
        const q = (time - strikeAt) / 500;
        g.lineStyle(2, 0xff7a6a, 1 - q); g.lineBetween(x, y - 20, ctx.npc.x, ctx.npc.y - 10 - q * 10);
      }
    },
  };
};

// ── Charm: Herring Shoal Lure ────────────────────────────────────────

/**
 * A lure of beaten silver cut like a herring, and a shoal of little silver flashes that follow it.
 * A shoal moves as one: every hit you land within 1.2s of your last adds a fish to the shoal round
 * you. The fifth in a row turns the whole shoal at once — that hit adds +15 and you heal 4. Let a
 * gap open and the shoal scatters. Keep the pressure on.
 */
const herringLure: ItemScriptFactory = (ctx) => {
  const GAP = 1200;
  let shoal = 0;
  let lastHit = -9999;
  let guard = false;
  let turnAt = -9999;
  let scatterAt = -9999;
  return {
    update(time) {
      if (shoal > 0 && time - lastHit > GAP) { shoal = 0; scatterAt = time; }
    },
    onHitDealt() {
      if (guard || !alive(ctx, 'npc')) return;
      const now = ctx.scene.time.now;
      shoal = now - lastHit <= GAP ? shoal + 1 : 1;
      lastHit = now;
      if (shoal >= 5) {
        shoal = 0;
        turnAt = now;
        guard = true;
        ctx.hit(ctx.npc, 15, ctx.npc.x, ctx.npc.y);
        guard = false;
        ctx.heal(ctx.player, 4);
        ctx.sfx('splash');
        ctx.float(ctx.npc.x, ctx.npc.y - 48, 'THE SHOAL TURNS +15', '#e0f0ff');
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      // The fish of the shoal, circling you together.
      for (let i = 0; i < shoal; i++) {
        const a = time / 260 + (i / 5) * Math.PI * 2 * 0.4;
        const x = p.x + Math.cos(a) * 30, y = p.y - 6 + Math.sin(a) * 14;
        const dir = -Math.sin(a) >= 0 ? 1 : -1;
        g.fillStyle(0xd8e4ec, 1); g.fillEllipse(x, y, 10, 4);
        g.fillStyle(0x6a8aa8, 1); g.fillEllipse(x, y - 1, 8, 1.6);
        g.fillStyle(0xd8e4ec, 1); g.fillTriangle(x - dir * 5, y, x - dir * 9, y - 3, x - dir * 9, y + 3);
      }
      // The gap closing: a thin arc showing how long until they scatter.
      if (shoal > 0) {
        const left = 1 - Math.min(1, (time - lastHit) / GAP);
        g.lineStyle(1.5, 0xe0f0ff, 0.5); g.beginPath(); g.arc(p.x, p.y, 36, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      }
      if (time - turnAt < 600 && alive(ctx, 'npc')) {
        const q = (time - turnAt) / 600;
        for (let k = 0; k < 8; k++) {
          const t = q + k * 0.05;
          const x = p.x + (ctx.npc.x - p.x) * Math.min(1, t * 1.4), y = p.y - 6 + (ctx.npc.y - 10 - p.y) * Math.min(1, t * 1.4) + Math.sin(k) * 10;
          g.fillStyle(0xe0f0ff, 1 - q); g.fillEllipse(x, y, 9, 3.5);
        }
      }
      if (time - scatterAt < 400) {
        const q = (time - scatterAt) / 400;
        for (let k = 0; k < 4; k++) { const a = k * 1.6; g.fillStyle(0xd8e4ec, 1 - q); g.fillEllipse(p.x + Math.cos(a) * (30 + q * 40), p.y + Math.sin(a) * (14 + q * 20), 8, 3); }
      }
    },
  };
};

// ── Reward charm: The True Meter ─────────────────────────────────────

/**
 * Ada Bellweather's mother's breath-meter, cut before the King's thirteen-tooth wheels, which has
 * never once counted a breath twice. It turns the King's trick round: it counts your hits, and
 * every fourth hit you land is counted twice — it lands again for the same amount (max 15).
 */
const trueMeter: ItemScriptFactory = (ctx) => {
  let count = 0;
  let guard = false;
  let twiceAt = -9999;
  return {
    onHitDealt(amount) {
      if (guard || !alive(ctx, 'npc')) return;
      count++;
      if (count < 4) return;
      count = 0;
      const again = Math.max(1, Math.min(15, Math.round(amount)));
      guard = true;
      ctx.hit(ctx.npc, again, ctx.npc.x, ctx.npc.y);
      guard = false;
      twiceAt = ctx.scene.time.now;
      ctx.sfx('clock-tick');
      ctx.float(ctx.npc.x, ctx.npc.y - 46, `COUNTED TWICE +${again}`, '#f0d070');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x, y = p.y - 4;
      // The meter over your heart, its needle stepping a quarter round per hit.
      g.fillStyle(0x7a5e26, 1); g.fillCircle(x, y, 7.5);
      g.fillStyle(0xd4aa4a, 1); g.fillCircle(x, y, 6.5);
      g.fillStyle(0xf4ecd8, 1); g.fillCircle(x, y, 5);
      for (let k = 0; k < 4; k++) {
        const a = -Math.PI / 2 + (k / 4) * Math.PI * 2;
        g.fillStyle(k < count ? 0x2a5a7a : 0xb8b0a0, 1); g.fillCircle(x + Math.cos(a) * 3.6, y + Math.sin(a) * 3.6, 1);
      }
      const na = -Math.PI / 2 + (count / 4) * Math.PI * 2;
      g.lineStyle(1, 0x1a1612, 1); g.lineBetween(x, y, x + Math.cos(na) * 4, y + Math.sin(na) * 4);
      if (time - twiceAt < 500) {
        const q = (time - twiceAt) / 500;
        g.lineStyle(2, 0xf0d070, 1 - q); g.strokeCircle(x, y, 8 + q * 14);
        if (alive(ctx, 'npc')) { g.lineStyle(2, 0xf0d070, 1 - q); g.strokeCircle(ctx.npc.x, ctx.npc.y - 10, 10 + q * 18); }
      }
    },
  };
};

// ── Meals (one fight each) ───────────────────────────────────────────

/**
 * Gull Herring Roll — herring in a roll so light it has to be held down. Move fast (a dash or a
 * sprint: 70px in a quarter-second) and you ride the updraft for a second: your next landed hit
 * inside it adds +7. Dash in, strike.
 */
const herringRoll: ItemScriptFactory = (ctx) => {
  const trail: { x: number; y: number; t: number }[] = [];
  let liftUntil = 0;
  let guard = false;
  return {
    update(time) {
      const p = ctx.player;
      trail.push({ x: p.x, y: p.y, t: time });
      while (trail.length && time - trail[0].t > 250) trail.shift();
      const a = trail[0];
      if (a && Math.hypot(p.x - a.x, p.y - a.y) > 70 && time > liftUntil - 200) {
        if (time > liftUntil) ctx.sfx('wings');
        liftUntil = time + 1000;
      }
    },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (guard || now > liftUntil || !alive(ctx, 'npc')) return;
      liftUntil = 0;
      guard = true;
      ctx.hit(ctx.npc, 7, ctx.npc.x, ctx.npc.y);
      guard = false;
      ctx.float(ctx.npc.x, ctx.npc.y - 44, 'ON THE UPDRAFT +7', '#e8f6ff');
    },
    drawAir(g, time) {
      if (time > liftUntil) return;
      const p = ctx.player;
      const k = (liftUntil - time) / 1000;
      for (let i = 0; i < 4; i++) {
        const ph = ((time / 300) + i / 4) % 1;
        g.lineStyle(2, 0xe8f6ff, (1 - ph) * k);
        g.lineBetween(p.x - 14 + i * 9, p.y + 14 - ph * 30, p.x - 14 + i * 9, p.y + 4 - ph * 30);
      }
    },
  };
};

/**
 * Haulier's Pasty — herring and cod in a crust thick enough to hang off a wheel-rung. Hold the
 * line: while you stand within 150px of the foe, you heal 1 a second, up to 24 in the fight.
 */
const haulierPasty: ItemScriptFactory = (ctx) => {
  let left = 24;
  let tickAt = -1;
  return {
    update(time) {
      if (tickAt < 0) tickAt = time;
      if (left <= 0 || !alive(ctx, 'player') || !alive(ctx, 'npc')) { tickAt = time; return; }
      if (!near(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y, 150)) { tickAt = time; return; }
      if (time - tickAt >= 1000) {
        tickAt = time;
        if (ctx.player.hp < ctx.player.maxHp) { ctx.heal(ctx.player, 1); left--; }
      }
    },
    drawGround(g, time) {
      if (left <= 0 || !alive(ctx, 'npc')) return;
      const p = ctx.player;
      const on = near(p.x, p.y, ctx.npc.x, ctx.npc.y, 150);
      // A haul-rope laid out on the ground between you while you hold the line.
      if (on) {
        g.lineStyle(3, 0xc8ac74, 0.55);
        g.lineBetween(p.x, p.y + 14, ctx.npc.x, ctx.npc.y + 14);
        for (let k = 1; k < 6; k++) {
          const t = (k / 6 + time / 4000) % 1;
          g.fillStyle(0x8a6a3a, 0.6); g.fillCircle(p.x + (ctx.npc.x - p.x) * t, p.y + 14 + (ctx.npc.y - p.y) * t, 1.8);
        }
      }
      g.lineStyle(1, 0xc8ac74, on ? 0.3 : 0.12); g.strokeCircle(p.x, p.y + 10, 150);
    },
  };
};

/**
 * Skyline Chowder — cloud-edge sprat and spindrift mackerel in a broth the colour of fog. Every 7s
 * a cloud drifts over you for 1.6s (its shadow slides in a second before); hits you take under it
 * are softened — half comes back, up to 10.
 */
const cloudChowder: ItemScriptFactory = (ctx) => {
  const CYCLE = 7000, COVER = 1600, WARN = 1000;
  let start = -1;
  const t = (time: number): number => (time - start) % CYCLE;
  const covered = (time: number): boolean => start >= 0 && t(time) >= CYCLE - COVER;
  return {
    update(time) { if (start < 0) start = time; },
    onHitTaken(amount) {
      if (!covered(ctx.scene.time.now) || !alive(ctx, 'player')) return;
      const back = Math.min(10, Math.round(amount / 2));
      if (back > 0) { ctx.heal(ctx.player, back); ctx.float(ctx.player.x, ctx.player.y - 46, `in the cloud +${back}`, '#e8f0f8'); }
    },
    drawGround(g, time) {
      if (start < 0) return;
      const p = ctx.player;
      const k = t(time);
      if (k < CYCLE - COVER - WARN) return;
      // The shadow slides in from the west, then sits under you.
      const slide = Math.min(1, (k - (CYCLE - COVER - WARN)) / WARN);
      g.fillStyle(0x000000, 0.12 * slide); g.fillEllipse(p.x - (1 - slide) * 120, p.y + 14, 90, 30);
    },
    drawAir(g, time) {
      if (!covered(time)) return;
      const p = ctx.player;
      const k = (t(time) - (CYCLE - COVER)) / COVER;
      const a = Math.sin(k * Math.PI) * 0.75;
      for (let i = 0; i < 5; i++) {
        g.fillStyle(0xf2f6fa, a * 0.7); g.fillCircle(p.x - 24 + i * 12, p.y - 52 + Math.sin(i * 1.7) * 4, 11 - Math.abs(i - 2) * 1.5);
      }
      g.fillStyle(0xf2f6fa, a * 0.18); g.fillEllipse(p.x, p.y - 14, 64, 76);
    },
  };
};

/**
 * Ledge Lobster Soufflé — lobster and Lake of Nod carp, risen a hand above the dish. While it stands
 * risen, every hit you land adds +4. Take a heavy hit (14 or more) and it falls; six seconds without
 * a heavy hit and it rises again. Do not slam the oven door.
 */
const lobsterSouffle: ItemScriptFactory = (ctx) => {
  let risen = true;
  let fellAt = -9999;
  let guard = false;
  let lastAdd = -9999;
  return {
    update(time) {
      if (!risen && time - fellAt >= 6000) {
        risen = true;
        ctx.float(ctx.player.x, ctx.player.y - 46, 'risen again', '#f8e0a0');
      }
    },
    onHitDealt() {
      if (guard || !risen || !alive(ctx, 'npc')) return;
      const now = ctx.scene.time.now;
      if (now - lastAdd < 250) return;
      lastAdd = now;
      guard = true;
      ctx.hit(ctx.npc, 4, ctx.npc.x, ctx.npc.y);
      guard = false;
    },
    onHitTaken(amount) {
      if (amount < 14) return;
      const now = ctx.scene.time.now;
      if (risen) ctx.float(ctx.player.x, ctx.player.y - 46, 'the soufflé falls', '#c8a070');
      risen = false;
      fellAt = now;
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x + 24, y = p.y - 30;
      // The ramekin and its crown: tall and golden while risen, slumped while not.
      g.fillStyle(0xf4f0e8, 1); g.fillRect(x - 7, y - 4, 14, 8);
      g.lineStyle(1, 0xc8c0b0, 1); for (let k = 0; k < 4; k++) g.lineBetween(x - 6 + k * 4, y - 4, x - 6 + k * 4, y + 4);
      const h = risen ? 10 + Math.sin(time / 300) : 3 + Math.min(1, (time - fellAt) / 6000) * 6;
      g.fillStyle(0xd88a3a, 1); g.fillEllipse(x, y - 4 - h / 2, 15, h);
      g.fillStyle(0xf8d080, 1); g.fillEllipse(x - 1, y - 5 - h / 2, 10, h * 0.6);
      if (risen) { g.fillStyle(0xd84a2a, 1); g.fillCircle(x + 3, y - 5 - h, 1.6); }
    },
  };
};

/**
 * Tuna & Moonfish Pie — sky tuna under a lid of Orbit moonfish, cut on a slant like a tide-line.
 * The pie keeps a six-second tide: three seconds high, three low. At high tide every hit you land
 * adds +5; at low tide every hit you take ebbs back 3.
 */
const tidePie: ItemScriptFactory = (ctx) => {
  const HALF = 3000;
  let start = -1;
  let guard = false;
  const high = (time: number): boolean => start >= 0 && Math.floor((time - start) / HALF) % 2 === 0;
  return {
    update(time) { if (start < 0) start = time; },
    onHitDealt() {
      if (guard || !alive(ctx, 'npc') || !high(ctx.scene.time.now)) return;
      guard = true;
      ctx.hit(ctx.npc, 5, ctx.npc.x, ctx.npc.y);
      guard = false;
    },
    onHitTaken(amount) {
      if (high(ctx.scene.time.now) || !alive(ctx, 'player')) return;
      const back = Math.min(3, Math.max(0, amount - 1));
      if (back > 0) ctx.heal(ctx.player, back);
    },
    drawGround(g, time) {
      if (start < 0) return;
      const p = ctx.player;
      const k = ((time - start) % (HALF * 2)) / (HALF * 2);
      const lvl = Math.cos(k * Math.PI * 2);
      // A tide-ring round your feet, swelling and ebbing.
      g.lineStyle(2, high(time) ? 0x6ab0e0 : 0x8a9aa8, 0.45);
      g.strokeEllipse(p.x, p.y + 14, 50 + lvl * 14, 16 + lvl * 4);
      g.fillStyle(0x4a8ab8, 0.08 + (lvl + 1) * 0.04); g.fillEllipse(p.x, p.y + 14, 50 + lvl * 14, 16 + lvl * 4);
    },
  };
};

// ── Item defs ────────────────────────────────────────────────────────

export const PORT_ITEMS: IsleItemDef[] = [
  // The Lee Side
  {
    id: 'charm-windlass-weathercock', name: 'Weathercock Pin', emoji: '🐓', kind: 'charm', price: 280, isle: 'air',
    flavor: 'A tin weathercock no bigger than a thumb. It swings round on your shoulder to show where the wind has gone.',
    script: 'charm-windlass-weathercock',
    scriptText: [
      'The wind shifts every 5s and the vane shows it. Hits you land while the foe is downwind of you',
      '(inside the drawn cone) carry for +6.',
    ],
  },
  {
    id: 'charm-windlass-fighting-kite', name: 'Fighting Kite', emoji: '🪁', kind: 'charm', price: 400, isle: 'air',
    flavor: 'A palm-sized cutter from Wren Ribbonsby\'s stall, on a line dressed with powdered glass. Fly it carefully.',
    script: 'charm-windlass-fighting-kite',
    scriptText: [
      'A kite flies behind you on 110px of glass line. A foe touching the line takes 4 (every 0.8s).',
      'Circle them to drag the line through; stand still and it climbs above you.',
    ],
  },
  {
    id: 'charm-windlass-bottled-breath', name: 'Bottled Breath', emoji: '🍾', kind: 'charm', price: 540, isle: 'air',
    flavor: 'A corked bottle of your own breath — the one the collectors never got. Do not drop it. You only get the one.',
    script: 'charm-windlass-bottled-breath', effect: { maxHp: 6 },
    scriptText: [
      '2s without casting and the bottle fills over 3s. Your next cast uncorks it: full, +25% damage for 2.5s',
      'and 1.5s off that cooldown; half full, +12% for 1.5s. A hit taken while it fills knocks out half.',
    ],
  },
  {
    id: 'charm-windlass-cloud-line', name: 'Cloud-Line Ribbon', emoji: '🎀', kind: 'charm', price: 720, isle: 'air',
    flavor: 'A strip of pale ribbon "cut from the cloud line itself", Perpetua swears. She also swears it was cheap.',
    script: 'charm-windlass-cloud-line', effect: { damageTakenMult: 0.97 },
    scriptText: [
      'Shows the cloud line across the middle of every fight. Below it you breathe free: +1 health every 1.5s.',
      'Hits you land on a foe standing above it are taxed: +4.',
    ],
  },
  // The Long Line
  {
    id: 'charm-windlass-spindrift-float', name: 'Spindrift Float', emoji: '🔴', kind: 'charm', price: 360, isle: 'air',
    flavor: 'A red-capped cork float off Fen\'s own line. It bobs whether there is water or not. Fen finds that normal.',
    script: 'charm-windlass-spindrift-float',
    scriptText: ['The float bobs on a 3.2s swell and dips for 0.55s at the bottom. A hit landed during the dip strikes: +10.'],
  },
  {
    id: 'charm-windlass-herring-lure', name: 'Herring Shoal Lure', emoji: '🐟', kind: 'charm', price: 500, isle: 'air',
    flavor: 'Beaten silver cut like a herring. Hang it off a line and a shoal turns up out of nowhere to follow it.',
    script: 'charm-windlass-herring-lure', effect: { speedMult: 1.02 },
    scriptText: [
      'Each hit landed within 1.2s of your last adds a fish to the shoal. The fifth in a row turns it:',
      '+15 damage and +4 health. A gap scatters the shoal.',
    ],
  },
  // Quest reward
  {
    id: 'charm-windlass-true-meter', name: 'The True Meter', emoji: '⏲️', kind: 'charm', isle: 'air',
    flavor: 'A breath-meter from before the King\'s thirteen-tooth wheels. It has never once counted a breath twice.',
    script: 'charm-windlass-true-meter', effect: { critChance: 0.02 },
    scriptText: ['Counts your hits: every 4th hit you land is counted twice — it lands again for the same amount (max 15).'],
  },
  // Counter food
  {
    id: 'food-windlass-kite-biscuit', name: 'Kite-Tail Biscuit', emoji: '🍪', kind: 'food', price: 40, sell: 10, isle: 'air',
    flavor: 'A long crisp biscuit knotted like a kite\'s tail. Haulers keep one in a pocket for the climb.',
    effect: { shieldHp: 10 },
  },
  {
    id: 'food-windlass-updraft-cordial', name: 'Updraft Cordial', emoji: '🧃', kind: 'food', price: 55, sell: 14, isle: 'air',
    flavor: 'Elderflower and sea-fennel, fizzing. Tastes like the first breath at the top of the Hundred Turns.',
    effect: { regenPerSecond: 0.2, speedMult: 1.05 },
  },
  // The Rising Loaf's meals
  {
    id: 'meal-windlass-herring-roll', name: 'Gull Herring Roll', emoji: '🥖', kind: 'food', sell: 14, isle: 'air',
    flavor: 'Herring in a roll so light the Rising Loaf ties them down in the window. They still escape.',
    script: 'meal-windlass-herring-roll', effect: { speedMult: 1.03 },
    scriptText: ['Next fight: move fast (a dash or sprint) and you ride the updraft for 1s — your next hit in it adds +7.'],
  },
  {
    id: 'meal-windlass-haulers-pasty', name: 'Haulier\'s Pasty', emoji: '🥟', kind: 'food', sell: 20, isle: 'air',
    flavor: 'Herring and cod in a crust thick enough to hang off a wheel-rung. Twenty of these go up the cliff a shift.',
    script: 'meal-windlass-haulers-pasty', effect: { maxHp: 8 },
    scriptText: ['Next fight: while you stand within 150px of the foe you heal 1 a second (up to 24).'],
  },
  {
    id: 'meal-windlass-cloud-chowder', name: 'Skyline Chowder', emoji: '🍲', kind: 'food', sell: 28, isle: 'air',
    flavor: 'Cloud-edge sprat and spindrift mackerel in a broth the colour of fog. It steams sideways, like everything here.',
    script: 'meal-windlass-cloud-chowder', effect: { regenPerSecond: 0.25 },
    scriptText: ['Next fight: every 7s a cloud passes over you for 1.6s — half of any hit taken under it comes back (max 10).'],
  },
  {
    id: 'meal-windlass-lobster-souffle', name: 'Ledge Lobster Soufflé', emoji: '🧁', kind: 'food', sell: 34, isle: 'air',
    flavor: 'Lobster and Lake of Nod carp, risen a hand above the dish. Hester bakes it in the free air. It shows.',
    script: 'meal-windlass-lobster-souffle', effect: { shieldHp: 8 },
    scriptText: [
      'Next fight: while risen, every hit you land adds +4. A hit of 14 or more makes it fall;',
      '6s without one and it rises again.',
    ],
  },
  {
    id: 'meal-windlass-tide-pie', name: 'Tuna & Moonfish Pie', emoji: '🥧', kind: 'food', sell: 40, isle: 'air',
    flavor: 'Sky tuna under a lid of Orbit moonfish, cut on a slant like a tide-line. It sloshes. Pies should not slosh.',
    script: 'meal-windlass-tide-pie', effect: { damageMult: 1.03 },
    scriptText: ['Next fight: a 6s tide — 3s high, 3s low. At high tide hits you land add +5; at low tide hits taken ebb back 3.'],
  },
];

export const PORT_SCRIPTS: Record<string, ItemScriptFactory> = {
  'charm-windlass-weathercock': weathercock,
  'charm-windlass-fighting-kite': fightingKite,
  'charm-windlass-bottled-breath': bottledBreath,
  'charm-windlass-cloud-line': cloudLineRibbon,
  'charm-windlass-spindrift-float': spindriftFloat,
  'charm-windlass-herring-lure': herringLure,
  'charm-windlass-true-meter': trueMeter,
  'meal-windlass-herring-roll': herringRoll,
  'meal-windlass-haulers-pasty': haulierPasty,
  'meal-windlass-cloud-chowder': cloudChowder,
  'meal-windlass-lobster-souffle': lobsterSouffle,
  'meal-windlass-tide-pie': tidePie,
};

export const PORT_SHOPS: ShopDef[] = [
  {
    id: 'windlass-store', name: 'The Lee Side', buys: true,
    stock: [
      'charm-windlass-weathercock', 'charm-windlass-fighting-kite', 'charm-windlass-bottled-breath', 'charm-windlass-cloud-line',
      'food-windlass-kite-biscuit', 'food-windlass-updraft-cordial',
    ],
  },
  {
    id: 'windlass-tackle', name: 'The Long Line', buys: true,
    stock: ['rod-skyline', 'rod-iron', 'rod-driftwood', 'charm-windlass-spindrift-float', 'charm-windlass-herring-lure'],
  },
];

export const PORT_BAKERIES: BakeryDef[] = [
  {
    id: 'windlass-bakery', name: 'The Rising Loaf',
    recipes: [
      {
        id: 'recipe-windlass-herring-roll', name: 'Gull Herring Roll', coins: 12, output: 'meal-windlass-herring-roll', makes: 2,
        inputs: [{ item: 'fish-gull-herring', count: 3 }],
      },
      {
        id: 'recipe-windlass-haulers-pasty', name: 'Haulier\'s Pasty', coins: 16, output: 'meal-windlass-haulers-pasty',
        inputs: [{ item: 'fish-gull-herring', count: 2 }, { item: 'fish-cliff-cod', count: 1 }],
      },
      {
        id: 'recipe-windlass-cloud-chowder', name: 'Skyline Chowder', coins: 24, output: 'meal-windlass-cloud-chowder',
        inputs: [{ item: 'fish-cirrus-sprat', count: 1 }, { item: 'fish-spindrift-mackerel', count: 1 }],
      },
      {
        id: 'recipe-windlass-lobster-souffle', name: 'Ledge Lobster Soufflé', coins: 30, output: 'meal-windlass-lobster-souffle',
        inputs: [{ item: 'fish-ledge-lobster', count: 1 }, { item: 'fish-dozing-carp', count: 2 }],
      },
      {
        id: 'recipe-windlass-tide-pie', name: 'Tuna & Moonfish Pie', coins: 38, output: 'meal-windlass-tide-pie',
        inputs: [{ item: 'fish-sky-tuna', count: 1 }, { item: 'fish-tidal-moonfish', count: 1 }],
      },
    ],
  },
];
