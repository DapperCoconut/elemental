import type { BakeryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';

/**
 * Stilthaven's goods: Pennywort Dace's four charms at the Coil & Candle, Saul Mudgett's two tackle
 * charms at the Bitten Hook, Ossery Blain's lantern (a quest reward, never sold), two counter foods,
 * and the five meals the Honeyed Fang bakes.
 *
 * Every script keeps its own clock (scene `time`, never the frame `dt` alone), draws what it is
 * doing on the fighter it belongs to, and says so out loud when it fires. Thornwild's charms were about
 * a garden's habits; these are about a venom town's — milking the bite out of a snake, sinking into
 * the mire to let it take the blow, listening behind you, a snake that sleeps on your arm until
 * something comes close, and lanterns left where somebody fell.
 */

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

/** Signed smallest difference between two angles, in (-π, π]. */
const angDiff = (a: number, b: number): number => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
};

// ── Charm: Milking Glove ─────────────────────────────────────────────

/**
 * A Fang Court milker's glove — thick hide, a glass vial strapped to the palm. A milker holds a snake
 * behind the head and lets it bite the vial until its venom is spent; after that it can bite you all it
 * likes. Each hit you land milks a drop into the vial (one every 0.7s, five to fill). With the vial full,
 * the next hit you take is spent on it: all of it comes back (up to 22), and the vial is emptied.
 */
const milkingGlove: ItemScriptFactory = (ctx) => {
  const FULL = 5;
  let drops = 0;
  let lastDrop = -9999;
  let spentAt = -9999;
  return {
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (drops >= FULL || now - lastDrop < 700) return;
      drops++;
      lastDrop = now;
      if (drops === FULL) {
        ctx.sfx('status-poison');
        ctx.float(ctx.player.x, ctx.player.y - 50, 'THE VIAL IS FULL', '#b8f070');
      }
    },
    onHitTaken(amount) {
      if (drops < FULL || !alive(ctx, 'player')) return;
      drops = 0;
      const back = Math.min(22, Math.max(1, Math.round(amount)));
      ctx.heal(ctx.player, back);
      spentAt = ctx.scene.time.now;
      ctx.sfx('heal');
      ctx.float(ctx.player.x, ctx.player.y - 50, `BITE SPENT +${back}`, '#d0f070');
    },
    drawAir(g, time) {
      const p = ctx.player;
      // The vial on the back of the glove: glass, a green fill rising drop by drop.
      const vx = p.x + 22, vy = p.y - 6;
      g.fillStyle(0x3a2a1a, 1); g.fillRoundedRect(vx - 6, vy - 3, 12, 8, 3);
      g.fillStyle(0xd8e8d0, 0.35); g.fillRoundedRect(vx - 3.5, vy - 22, 7, 20, 3);
      const lvl = (drops / FULL) * 18;
      if (lvl > 0) { g.fillStyle(0x8ad040, 0.9); g.fillRoundedRect(vx - 2.5, vy - 3 - lvl, 5, lvl, 2); }
      g.lineStyle(1, 0xe8f0e0, 0.8); g.strokeRoundedRect(vx - 3.5, vy - 22, 7, 20, 3);
      g.fillStyle(0x6a5a3a, 1); g.fillRect(vx - 3, vy - 25, 6, 3);
      if (drops >= FULL) {
        g.fillStyle(0xd0f070, 0.18 + Math.sin(time / 120) * 0.08); g.fillCircle(vx, vy - 12, 12);
      } else if (time - lastDrop < 300) {
        const q = (time - lastDrop) / 300;
        g.fillStyle(0x8ad040, 1 - q); g.fillCircle(vx, vy - 30 + q * 10, 2);
      }
      if (time - spentAt < 600) {
        const q = (time - spentAt) / 600;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          g.fillStyle(0xb8f070, 1 - q); g.fillCircle(p.x + Math.cos(a) * (10 + q * 30), p.y - 10 + Math.sin(a) * (6 + q * 18), 2.4 - q * 1.5);
        }
      }
    },
  };
};

// ── Charm: Mire Boots ────────────────────────────────────────────────

/**
 * Wading boots tarred to the thigh. On Fangmire the mire is soft enough to sink in and thick enough to
 * stop a blow, and the waders know it. Stand still for half a second and you sink in: while sunk, every
 * hit you take is partly swallowed by the mire (35% of it comes back, up to 12). Stay down a full second
 * and the mire grips you — when you move again you pull free with a lurch: +25% speed for 1.2s.
 */
const mireBoots: ItemScriptFactory = (ctx) => {
  let lastX = Number.NaN;
  let lastY = Number.NaN;
  let still = 0;
  let sunk = false;
  let sunkFor = 0;
  let pullAt = -9999;
  let gulpAt = -9999;
  return {
    update(time, dt) {
      const p = ctx.player;
      if (Number.isNaN(lastX)) { lastX = p.x; lastY = p.y; }
      const moved = dist(p.x, p.y, lastX, lastY);
      lastX = p.x; lastY = p.y;
      if (!alive(ctx, 'player')) return;
      if (moved < 0.6) {
        still += dt * 1000;
        if (!sunk && still >= 500) { sunk = true; sunkFor = 0; ctx.sfx('slime-splat'); }
        if (sunk) sunkFor += dt * 1000;
      } else {
        if (sunk && sunkFor >= 1000) {
          ctx.boostSpeed(1.25, 1200);
          pullAt = time;
          ctx.sfx('whoosh');
          ctx.float(p.x, p.y - 46, 'PULLED FREE', '#c8b880');
        }
        sunk = false; still = 0; sunkFor = 0;
      }
    },
    onHitTaken(amount) {
      if (!sunk || !alive(ctx, 'player')) return;
      const back = Math.min(12, Math.max(1, Math.round(amount * 0.35)));
      ctx.heal(ctx.player, back);
      gulpAt = ctx.scene.time.now;
      ctx.float(ctx.player.x, ctx.player.y - 46, `the mire takes it +${back}`, '#9aa860');
    },
    drawGround(g, time) {
      const p = ctx.player;
      if (sunk) {
        const d = Math.min(1, sunkFor / 1000);
        // A ring of mire welling up round the feet, deeper as it grips.
        g.fillStyle(0x1a1a10, 0.75); g.fillEllipse(p.x, p.y + 14, 44 + d * 8, 14 + d * 4);
        g.fillStyle(0x3a3a20, 0.8); g.fillEllipse(p.x, p.y + 13, 36 + d * 6, 9 + d * 3);
        g.lineStyle(1.5, d >= 1 ? 0x8ad040 : 0x5a5a30, 0.8); g.strokeEllipse(p.x, p.y + 14, 46 + d * 8, 15 + d * 4);
        for (let k = 0; k < 3; k++) {
          const q = ((time / 700) + k / 3) % 1;
          g.fillStyle(0x6a7a3a, 0.6 * (1 - q)); g.fillCircle(p.x - 14 + k * 14, p.y + 12 - q * 6, 1.5 + q * 2);
        }
      }
      if (time - gulpAt < 400) {
        const q = (time - gulpAt) / 400;
        g.lineStyle(2, 0x9aa860, 1 - q); g.strokeEllipse(p.x, p.y + 14, 50 + q * 30, 16 + q * 10);
      }
      if (time - pullAt < 500) {
        const q = (time - pullAt) / 500;
        for (let k = 0; k < 6; k++) {
          const a = Math.PI + (k / 5) * Math.PI;
          g.fillStyle(0x3a3a20, 1 - q); g.fillCircle(p.x + Math.cos(a) * (16 + q * 24), p.y + 14 + Math.sin(a) * (4 + q * 16), 2.5);
        }
      }
    },
  };
};

// ── Charm: Ear-Trumpet ───────────────────────────────────────────────

/**
 * A Cloak Court informer's brass ear-trumpet, worn turned backward over the shoulder. It hears what
 * comes up behind you. A hit you take while the foe is outside the 140° arc you are facing is heard
 * coming — you turn your shoulder into it and it is halved (up to 18 back). The trumpet needs four
 * seconds to listen again. Fight facing your foe and it never fires; turn your back on them to cast
 * and it is always listening.
 */
const earTrumpet: ItemScriptFactory = (ctx) => {
  const RECHARGE = 4000;
  let readyAt = 0;
  let heardAt = -9999;
  const behind = (): boolean => {
    if (!alive(ctx, 'npc')) return false;
    const p = ctx.player;
    const toFoe = Math.atan2(ctx.npc.y - p.y, ctx.npc.x - p.x);
    return Math.abs(angDiff(toFoe, ctx.facing(p))) > (70 * Math.PI) / 180;
  };
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (now < readyAt || !alive(ctx, 'player') || !behind()) return;
      readyAt = now + RECHARGE;
      heardAt = now;
      const back = Math.min(18, Math.max(1, Math.round(amount / 2)));
      ctx.heal(ctx.player, back);
      ctx.sfx('sonic-pulse');
      ctx.float(ctx.player.x, ctx.player.y - 50, `HEARD YOU +${back}`, '#e8d080');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const f = ctx.facing(p);
      const back = f + Math.PI;
      const ready = time >= readyAt;
      // The trumpet at the shoulder, bell pointing behind.
      const sx = p.x + Math.cos(back) * 10, sy = p.y - 18 + Math.sin(back) * 5;
      const bx = p.x + Math.cos(back) * 26, by = p.y - 20 + Math.sin(back) * 12;
      g.lineStyle(3, 0x8a6a2a, 1); g.lineBetween(sx, sy, bx, by);
      g.fillStyle(ready ? 0xd8b050 : 0x7a6a40, 1); g.fillCircle(bx, by, 6);
      g.fillStyle(0x1a1408, 1); g.fillCircle(bx, by, 3.2);
      if (ready && behind()) {
        // It is listening: little arcs coming in toward the bell.
        for (let k = 0; k < 3; k++) {
          const q = ((time / 500) + k / 3) % 1;
          const r = 22 - q * 14;
          g.lineStyle(1.2, 0xe8d080, 0.6 * q);
          g.beginPath(); g.arc(bx, by, r, back - 0.6, back + 0.6, false); g.strokePath();
        }
      }
      if (!ready) {
        const q = 1 - (readyAt - time) / RECHARGE;
        g.lineStyle(1.5, 0xd8b050, 0.6);
        g.beginPath(); g.arc(bx, by, 9, -Math.PI / 2, -Math.PI / 2 + q * Math.PI * 2, false); g.strokePath();
      }
      if (time - heardAt < 500) {
        const q = (time - heardAt) / 500;
        g.lineStyle(2, 0xe8d080, 1 - q); g.strokeCircle(p.x, p.y - 8, 20 + q * 30);
      }
    },
  };
};

// ── Charm: Coiled Asp ────────────────────────────────────────────────

/**
 * A little banded asp that sleeps coiled round your forearm, warm and heavy. It coils tighter the
 * longer it is left alone: one coil every 1.6s, three at most. When the foe comes within 90px it
 * strikes on its own — 6 damage for every coil, and the bite holds them 0.25s for every coil (up to
 * 0.75s). Then it uncoils and starts over. Let them come close when it is wound tight.
 */
const coiledAsp: ItemScriptFactory = (ctx) => {
  const COIL_MS = 1600;
  const REACH = 90;
  let coils = 0;
  let lastCoil = -1;
  let strikeAt = -9999;
  let strikeTo = { x: 0, y: 0 };
  return {
    update(time) {
      if (lastCoil < 0) lastCoil = time;
      if (coils < 3 && time - lastCoil >= COIL_MS) { coils++; lastCoil = time; }
      if (coils >= 3) lastCoil = time;
      if (coils < 1 || !alive(ctx, 'player') || !alive(ctx, 'npc')) return;
      if (dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) > REACH) return;
      const n = coils;
      coils = 0;
      lastCoil = time;
      strikeAt = time;
      strikeTo = { x: ctx.npc.x, y: ctx.npc.y };
      ctx.hit(ctx.npc, 6 * n, ctx.npc.x, ctx.npc.y);
      ctx.stun(ctx.npc, 250 * n);
      ctx.sfx('snap-back');
      ctx.float(ctx.npc.x, ctx.npc.y - 48, n >= 3 ? 'THE ASP STRIKES!' : 'asp bite', '#e8c040');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const ax = p.x - 20, ay = p.y - 2;
      // The coils on the arm: one band per coil, gold and black.
      for (let k = 0; k < 3; k++) {
        const on = k < coils;
        g.lineStyle(3, on ? 0x2a2010 : 0x2a2010, on ? 1 : 0.25);
        g.strokeEllipse(ax, ay - k * 5, 14, 6);
        g.lineStyle(1.5, on ? 0xe8c040 : 0x8a7a40, on ? 1 : 0.25);
        g.strokeEllipse(ax, ay - k * 5 - 0.5, 14, 6);
      }
      // The head resting on top, raised a little more with each coil.
      const hy = ay - 12 - coils * 3;
      if (time - strikeAt > 260) {
        g.fillStyle(0x2a2010, 1); g.fillEllipse(ax + 3, hy, 8, 5);
        g.fillStyle(0xe8c040, 1); g.fillCircle(ax + 5, hy - 1, 0.9);
        if (coils >= 3) { g.lineStyle(0.8, 0xc83a3a, 0.9); const fl = Math.sin(time / 60) > 0 ? 4 : 2; g.lineBetween(ax + 7, hy, ax + 7 + fl, hy + 0.5); }
      } else {
        // The strike: the body flung out straight to the bite.
        const q = (time - strikeAt) / 260;
        const tx = ax + (strikeTo.x - ax) * Math.min(1, q * 2), ty = hy + (strikeTo.y - 10 - hy) * Math.min(1, q * 2);
        g.lineStyle(3, 0x2a2010, 1 - q * 0.5); g.lineBetween(ax, ay - 6, tx, ty);
        g.lineStyle(1.2, 0xe8c040, 1 - q * 0.5); g.lineBetween(ax, ay - 6, tx, ty);
        g.fillStyle(0x2a2010, 1); g.fillEllipse(tx, ty, 9, 6);
      }
      // The reach ring, faint, only while wound.
      if (coils > 0) { g.lineStyle(1, 0xe8c040, 0.06 + coils * 0.04); g.strokeCircle(p.x, p.y, REACH); }
    },
  };
};

// ── Charm: Gaff Hook ─────────────────────────────────────────────────

/**
 * A boat-hook off the Landing Pier, the gaff Morrow Gall uses to bring a punt alongside. A hit you land
 * on a foe more than 220px away hooks them: they are hauled 70px toward you and the barb does 4. The
 * hook takes five seconds to swing back. Reach out and bring them in.
 */
const gaffHook: ItemScriptFactory = (ctx) => {
  const RECHARGE = 5000;
  let readyAt = 0;
  let guard = false;
  let gaffAt = -9999;
  let from = { x: 0, y: 0 };
  return {
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (guard || now < readyAt || !alive(ctx, 'npc')) return;
      const p = ctx.player, n = ctx.npc;
      const d = dist(p.x, p.y, n.x, n.y);
      if (d <= 220) return;
      readyAt = now + RECHARGE;
      gaffAt = now;
      from = { x: n.x, y: n.y };
      ctx.nudge(n, ((p.x - n.x) / d) * 70, ((p.y - n.y) / d) * 70);
      guard = true;
      ctx.hit(n, 4, n.x, n.y);
      guard = false;
      ctx.sfx('chain');
      ctx.float(n.x, n.y - 48, 'GAFFED!', '#c8d8e0');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const ready = time >= readyAt;
      // The hook on your belt: iron, catching the light when ready.
      const hx = p.x - 16, hy = p.y + 4;
      g.lineStyle(2.5, ready ? 0x8a9aa0 : 0x4a4a48, 1);
      g.lineBetween(hx, hy - 14, hx, hy);
      g.beginPath(); g.arc(hx + 4, hy, 4, Math.PI, 0, true); g.strokePath();
      if (ready) { g.fillStyle(0xe8f0f8, 0.6 + Math.sin(time / 200) * 0.3); g.fillCircle(hx + 8, hy - 1, 1.2); }
      if (time - gaffAt < 450 && alive(ctx, 'npc')) {
        const q = (time - gaffAt) / 450;
        const n = ctx.npc;
        g.lineStyle(1.5, 0xc8b890, 1 - q); g.lineBetween(p.x, p.y - 6, n.x, n.y - 6);
        g.lineStyle(2, 0x8a9aa0, 1 - q); g.strokeCircle(n.x, n.y - 6, 7);
        g.fillStyle(0xc8d8e0, 0.4 * (1 - q)); g.fillCircle(from.x, from.y, 10 + q * 10);
      }
    },
  };
};

// ── Charm: Mudskipper Fin ────────────────────────────────────────────

/**
 * A mudskipper's front fin, dried stiff and sewn to a wristband. Mudskippers do not swim and do not
 * walk; they skip, a yard at a time, and arrive staring. Cover 110px in a quarter-second (a dash, a
 * blink, a leap) and you skip: for 1.5s your next landed hit adds 10. One skip every two seconds.
 */
const mudskipperFin: ItemScriptFactory = (ctx) => {
  const trail: { t: number; x: number; y: number }[] = [];
  let armedUntil = -9999;
  let nextSkip = 0;
  let guard = false;
  let skipAt = -9999;
  let skipFrom = { x: 0, y: 0 };
  return {
    update(time) {
      const p = ctx.player;
      trail.push({ t: time, x: p.x, y: p.y });
      while (trail.length && time - trail[0].t > 250) trail.shift();
      if (time < nextSkip || !alive(ctx, 'player') || trail.length < 2) return;
      const o = trail[0];
      if (dist(o.x, o.y, p.x, p.y) >= 110) {
        armedUntil = time + 1500;
        nextSkip = time + 2000;
        skipAt = time;
        skipFrom = { x: o.x, y: o.y };
        ctx.sfx('boing');
        ctx.float(p.x, p.y - 46, 'SKIP!', '#a8d8c0');
      }
    },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (guard || now > armedUntil || !alive(ctx, 'npc')) return;
      armedUntil = -9999;
      guard = true;
      ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y);
      guard = false;
      ctx.float(ctx.npc.x, ctx.npc.y - 48, 'and a stare +10', '#a8d8c0');
    },
    drawGround(g, time) {
      // Splash prints where you took off and landed.
      if (time - skipAt < 700) {
        const q = (time - skipAt) / 700;
        g.fillStyle(0x3a3a24, 0.6 * (1 - q)); g.fillEllipse(skipFrom.x, skipFrom.y + 14, 20, 6);
        g.lineStyle(1.2, 0xa8d8c0, 0.7 * (1 - q)); g.strokeEllipse(skipFrom.x, skipFrom.y + 14, 20 + q * 30, 6 + q * 10);
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      const armed = time <= armedUntil;
      // The fin on the wrist, fanned when armed.
      const fx = p.x + 18, fy = p.y + 2;
      const spread = armed ? 1 : 0.45;
      for (let k = 0; k < 4; k++) {
        const a = -Math.PI / 2 - 0.5 * spread + k * 0.33 * spread;
        g.lineStyle(1.2, 0x5a7a6a, 1); g.lineBetween(fx, fy, fx + Math.cos(a) * 12, fy + Math.sin(a) * 12);
      }
      g.fillStyle(0x6a8a7a, armed ? 0.7 : 0.4);
      g.fillTriangle(fx, fy, fx + Math.cos(-Math.PI / 2 - 0.5 * spread) * 12, fy + Math.sin(-Math.PI / 2 - 0.5 * spread) * 12, fx + Math.cos(-Math.PI / 2 + 0.5 * spread) * 12, fy + Math.sin(-Math.PI / 2 + 0.5 * spread) * 12);
      if (armed) {
        // Two goggling eyes over your head: it is staring at them.
        const bob = Math.sin(time / 90) * 1.5;
        for (const ex of [-5, 5]) {
          g.fillStyle(0xe8e8d8, 1); g.fillCircle(p.x + ex, p.y - 40 + bob, 4);
          g.fillStyle(0x101010, 1); g.fillCircle(p.x + ex + 1, p.y - 40 + bob, 2);
        }
      }
    },
  };
};

// ── Charm: The Lowering Lantern (quest reward) ───────────────────────

/**
 * Ossery Blain's old tin lantern, that found boats in the mire for thirty years. A hit of 12 or more
 * leaves a lantern burning where you stood (one every 2s, three at most, each burns 12s). Walk back
 * through one to take it up: +7 health, and your next landed hit adds 6. Every lantern is a way back to
 * where you were standing when it went wrong.
 */
const loweringLantern: ItemScriptFactory = (ctx) => {
  const lanterns: { x: number; y: number; born: number }[] = [];
  let lastDrop = -9999;
  let lit = 0;
  let guard = false;
  let takenAt = -9999;
  let takenPt = { x: 0, y: 0 };
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 12 || now - lastDrop < 2000 || lanterns.length >= 3 || !alive(ctx, 'player')) return;
      lastDrop = now;
      lanterns.push({ x: ctx.player.x, y: ctx.player.y, born: now });
      ctx.float(ctx.player.x, ctx.player.y - 46, 'a lantern left', '#ffc870');
    },
    update(time) {
      for (let i = lanterns.length - 1; i >= 0; i--) {
        const l = lanterns[i];
        if (time - l.born > 12000) { lanterns.splice(i, 1); continue; }
        if (time - l.born < 500 || !alive(ctx, 'player')) continue;
        if (dist(ctx.player.x, ctx.player.y, l.x, l.y) < 26) {
          lanterns.splice(i, 1);
          ctx.heal(ctx.player, 7);
          lit = Math.min(3, lit + 1);
          takenAt = time; takenPt = { x: l.x, y: l.y };
          ctx.sfx('heal');
          ctx.float(l.x, l.y - 40, 'the way back +7', '#ffe0a0');
        }
      }
    },
    onHitDealt() {
      if (guard || lit <= 0 || !alive(ctx, 'npc')) return;
      lit--;
      guard = true;
      ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y);
      guard = false;
      ctx.flash(ctx.npc.x, ctx.npc.y, 0xffc870);
    },
    drawGround(g, time) {
      for (const l of lanterns) {
        const left = 1 - (time - l.born) / 12000;
        const f = 0.85 + Math.sin(time / 90 + l.x) * 0.1;
        g.fillStyle(0xffc870, 0.1 * f * left + 0.03); g.fillEllipse(l.x, l.y + 12, 56, 18);
      }
    },
    drawAir(g, time) {
      for (const l of lanterns) {
        const left = 1 - (time - l.born) / 12000;
        const bob = Math.sin(time / 300 + l.x) * 2;
        const x = l.x, y = l.y - 6 + bob;
        g.fillStyle(0xffc870, 0.15 * left + 0.05); g.fillCircle(x, y, 14);
        g.fillStyle(0x2e2c2a, 1); g.fillRect(x - 5, y - 9, 10, 2); g.fillRect(x - 5, y + 5, 10, 2);
        g.fillStyle(0xffc870, 0.5 + 0.5 * left); g.fillRect(x - 4, y - 7, 8, 12);
        g.fillStyle(0xffe8b0, left); g.fillRect(x - 1.5, y - 4, 3, 5);
        g.lineStyle(1, 0x2e2c2a, 1); g.lineBetween(x, y - 9, x, y - 13);
      }
      if (lit > 0) {
        const p = ctx.player;
        for (let k = 0; k < lit; k++) { g.fillStyle(0xffc870, 0.8); g.fillCircle(p.x - 8 + k * 8, p.y - 38, 2.5); }
      }
      if (time - takenAt < 500) {
        const q = (time - takenAt) / 500;
        g.fillStyle(0xffe0a0, 0.6 * (1 - q)); g.fillCircle(takenPt.x, takenPt.y - 6 - q * 20, 8 + q * 10);
      }
    },
  };
};

// ── Meal: Grey-Day Buns ──────────────────────────────────────────────

/**
 * Hetty Combe's new-moon honey buns, a drop of something not on the board baked into the honey. The
 * first time you fall to half health it kicks in, slow and warm: 18 health over 6 seconds, and while it
 * works every hit you take is 3 lighter.
 */
const greyDayBuns: ItemScriptFactory = (ctx) => {
  let used = false;
  let start = -1;
  let given = 0;
  return {
    update(time) {
      const p = ctx.player;
      if (!alive(ctx, 'player')) return;
      if (!used && p.hp <= p.maxHp * 0.5) {
        used = true; start = time;
        ctx.sfx('heal');
        ctx.float(p.x, p.y - 50, 'THE DROP IN THE HONEY', '#ffd870');
      }
      if (start >= 0 && given < 18) {
        const due = Math.min(18, Math.floor(((time - start) / 6000) * 18));
        if (due > given) { ctx.heal(p, due - given); given = due; }
      }
    },
    onHitTaken() {
      if (start < 0 || given >= 18 || !alive(ctx, 'player')) return;
      ctx.heal(ctx.player, 3);
    },
    drawAir(g, time) {
      if (start < 0 || given >= 18) return;
      const p = ctx.player;
      // Honey welling up from the fingertips: gold drops rising round the hands.
      for (let k = 0; k < 5; k++) {
        const q = ((time - start) / 900 + k / 5) % 1;
        g.fillStyle(0xe8a828, 0.8 * (1 - q)); g.fillCircle(p.x - 14 + k * 7, p.y + 6 - q * 34, 2.2);
      }
      g.lineStyle(1.5, 0xffd870, 0.35); g.strokeCircle(p.x, p.y - 6, 26);
    },
  };
};

// ── Meal: Stargazy Fang-Pie ──────────────────────────────────────────

/**
 * Fanged herring baked whole in a pie with their heads poking up through the crust, teeth and all,
 * staring at the sky. Your landed hits each leave a herring's fang in the foe (one every 0.4s). With
 * three in, four seconds later they all bite at once: 18. Then the next three can go in.
 */
const stargazyPie: ItemScriptFactory = (ctx) => {
  let fangs = 0;
  let lastFang = -9999;
  let fullAt = -1;
  let biteAt = -9999;
  return {
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (fangs >= 3 || now - lastFang < 400) return;
      fangs++;
      lastFang = now;
      if (fangs === 3) {
        fullAt = now;
        ctx.float(ctx.npc.x, ctx.npc.y - 50, 'three fangs in', '#e8e0c8');
      }
    },
    update(time) {
      if (fullAt < 0 || time - fullAt < 4000) return;
      fullAt = -1;
      fangs = 0;
      if (!alive(ctx, 'npc')) return;
      biteAt = time;
      ctx.hit(ctx.npc, 18, ctx.npc.x, ctx.npc.y);
      ctx.sfx('stab');
      ctx.float(ctx.npc.x, ctx.npc.y - 50, 'THE HERRING BITE', '#e8e0c8');
    },
    drawAir(g, time) {
      if (!alive(ctx, 'npc')) return;
      const n = ctx.npc;
      // The fangs stuck in a ring round the foe, quivering harder as the bite comes due.
      const due = fullAt >= 0 ? Math.min(1, (time - fullAt) / 4000) : 0;
      for (let k = 0; k < fangs; k++) {
        const a = -Math.PI / 2 + (k - 1) * 0.9;
        const shake = due * Math.sin(time / 30 + k) * 2;
        const x = n.x + Math.cos(a) * 22 + shake, y = n.y - 8 + Math.sin(a) * 16;
        g.fillStyle(0xe8e0c8, 1); g.fillTriangle(x - 2.5, y - 4, x + 2.5, y - 4, x, y + 4);
        g.fillStyle(0x8ac8e8, 0.8); g.fillCircle(x, y - 6, 1.6);
      }
      if (due > 0) { g.lineStyle(1.5, 0xe8e0c8, 0.2 + due * 0.4); g.strokeCircle(n.x, n.y - 8, 30 - due * 6); }
      if (time - biteAt < 400) {
        const q = (time - biteAt) / 400;
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          g.fillStyle(0xe8e0c8, 1 - q); g.fillTriangle(n.x + Math.cos(a) * 26 * (1 - q), n.y - 8 + Math.sin(a) * 20 * (1 - q), n.x + Math.cos(a + 0.2) * 30 * (1 - q), n.y - 8 + Math.sin(a + 0.2) * 24 * (1 - q), n.x, n.y - 8);
        }
      }
    },
  };
};

// ── Meal: Jellied Viper ──────────────────────────────────────────────

/**
 * Viper eel and adder minnows set in their own green jelly, served cold and wobbling. You wobble too:
 * take two hits within 1.5s and the second one lands in the jelly — half of it comes back (up to 14).
 */
const jelliedViper: ItemScriptFactory = (ctx) => {
  let lastHit = -9999;
  let wobbleAt = -9999;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (now - lastHit <= 1500 && alive(ctx, 'player')) {
        const back = Math.min(14, Math.max(1, Math.round(amount / 2)));
        ctx.heal(ctx.player, back);
        ctx.sfx('slime-splat');
        ctx.float(ctx.player.x, ctx.player.y - 46, `into the jelly +${back}`, '#a8e070');
        lastHit = -9999;
        wobbleAt = now;
        return;
      }
      lastHit = now;
      wobbleAt = now;
    },
    drawAir(g, time) {
      const p = ctx.player;
      const primed = time - lastHit <= 1500;
      const w = time - wobbleAt < 600 ? Math.sin((time - wobbleAt) / 40) * (1 - (time - wobbleAt) / 600) * 4 : 0;
      if (primed || time - wobbleAt < 600) {
        g.fillStyle(0x8ad040, primed ? 0.16 : 0.08); g.fillEllipse(p.x, p.y - 6, 50 + w * 2, 56 - w * 2);
        g.lineStyle(1.5, 0xb8f070, primed ? 0.6 : 0.3); g.strokeEllipse(p.x, p.y - 6, 50 + w * 2, 56 - w * 2);
        g.fillStyle(0xe8ffd0, 0.4); g.fillEllipse(p.x - 12, p.y - 22, 8, 4);
      }
    },
  };
};

// ── Meal: Grouper Chowder ────────────────────────────────────────────

/**
 * Black grouper, shackle shad and mullet in a milk chowder, served in a tin cup you carry into the
 * fight on a string. Stand still for 0.6s and you take a sip: +5 health. Five sips in the cup, one
 * every 2.5s.
 */
const grouperChowder: ItemScriptFactory = (ctx) => {
  let sips = 5;
  let lastX = Number.NaN;
  let lastY = Number.NaN;
  let still = 0;
  let nextSip = 0;
  let sipAt = -9999;
  return {
    update(time, dt) {
      const p = ctx.player;
      if (Number.isNaN(lastX)) { lastX = p.x; lastY = p.y; }
      const moved = dist(p.x, p.y, lastX, lastY);
      lastX = p.x; lastY = p.y;
      still = moved < 0.6 ? still + dt * 1000 : 0;
      if (sips <= 0 || still < 600 || time < nextSip || !alive(ctx, 'player')) return;
      sips--;
      nextSip = time + 2500;
      sipAt = time;
      ctx.heal(p, 5);
      ctx.float(p.x, p.y - 46, `a sip +5 (${sips} left)`, '#e8e0d0');
    },
    drawAir(g, time) {
      if (sips <= 0 && time - sipAt > 600) return;
      const p = ctx.player;
      const cx = p.x - 22, cy = p.y + 2;
      const up = time - sipAt < 600 ? Math.sin(((time - sipAt) / 600) * Math.PI) * 14 : 0;
      g.lineStyle(0.8, 0x8a7a5a, 1); g.lineBetween(p.x - 10, p.y - 4, cx, cy - 8 - up);
      g.fillStyle(0x8a8a88, 1); g.fillRect(cx - 5, cy - 8 - up, 10, 9);
      g.fillStyle(0xe8e0d0, 1); g.fillRect(cx - 4, cy - 8 - up, 8, 2 + (sips / 5) * 3);
      g.lineStyle(1, 0x5a5a58, 1); g.strokeRect(cx - 5, cy - 8 - up, 10, 9);
      if (up > 0) { g.fillStyle(0xe8e0d0, 0.4); g.fillCircle(cx, cy - 14 - up, 3); }
    },
  };
};

// ── Meal: Hydra Platter ──────────────────────────────────────────────

/**
 * A hydra sturgeon served whole on a board with its four false heads carved free, between a shade
 * perch and a bonefish: a platter with five heads. You fight with five heads too. Each hit you take
 * costs one — and a lost head arms a bite: your next landed hit adds 8 (three bites can be armed).
 * Six seconds after it is lost, every lost head grows back as two, up to five.
 */
const hydraPlatter: ItemScriptFactory = (ctx) => {
  let heads = 5;
  let bites = 0;
  const regrow: number[] = [];
  let guard = false;
  let lossAt = -9999;
  let growAt = -9999;
  return {
    onHitTaken() {
      if (heads <= 0 || !alive(ctx, 'player')) return;
      heads--;
      bites = Math.min(3, bites + 1);
      lossAt = ctx.scene.time.now;
      regrow.push(lossAt + 6000);
    },
    update(time) {
      for (let i = regrow.length - 1; i >= 0; i--) {
        if (time < regrow[i]) continue;
        regrow.splice(i, 1);
        if (heads < 5) {
          heads = Math.min(5, heads + 2);
          growAt = time;
          ctx.float(ctx.player.x, ctx.player.y - 50, 'TWO GROW BACK', '#8ad040');
        }
      }
    },
    onHitDealt() {
      if (guard || bites <= 0 || !alive(ctx, 'npc')) return;
      bites--;
      guard = true;
      ctx.hit(ctx.npc, 8, ctx.npc.x, ctx.npc.y);
      guard = false;
      ctx.sfx('slash');
    },
    drawAir(g, time) {
      const p = ctx.player;
      // A fan of small serpent heads on stalks behind the shoulders.
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.42;
        const on = k < heads;
        const sway = Math.sin(time / 260 + k) * 0.08;
        const len = on ? 22 : 9;
        const hx = p.x + Math.cos(a + sway) * len, hy = p.y - 14 + Math.sin(a + sway) * len;
        g.lineStyle(2.2, on ? 0x2e4a24 : 0x3a2a20, on ? 1 : 0.6);
        g.lineBetween(p.x + Math.cos(a) * 6, p.y - 14 + Math.sin(a) * 6, hx, hy);
        if (on) {
          g.fillStyle(0x3e6a2a, 1); g.fillEllipse(hx, hy, 7, 5);
          g.fillStyle(0xf0d040, 1); g.fillCircle(hx + 1.5, hy - 1, 0.8);
          if (bites > 0 && k < bites) { g.fillStyle(0xd0f070, 0.4); g.fillCircle(hx, hy, 6); }
        } else {
          g.fillStyle(0x8a2a2a, 0.7); g.fillCircle(hx, hy, 2);
        }
      }
      if (time - lossAt < 300) { g.fillStyle(0x8a2a2a, 0.5 * (1 - (time - lossAt) / 300)); g.fillCircle(p.x, p.y - 30, 10); }
      if (time - growAt < 500) { g.lineStyle(2, 0x8ad040, 1 - (time - growAt) / 500); g.strokeCircle(p.x, p.y - 24, 18 + (time - growAt) / 25); }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const PORT_ITEMS: IsleItemDef[] = [
  // The Coil & Candle
  {
    id: 'charm-stilthaven-milking-glove', name: 'Milking Glove', emoji: '🧤', kind: 'charm', price: 420, isle: 'slime',
    flavor: 'A Fang Court milker\'s hide glove with a vial on the palm. A snake that has bitten the glass has nothing left for you.',
    script: 'charm-stilthaven-milking-glove',
    scriptText: [
      'Landed hits milk a drop into the vial (one per 0.7s, 5 to fill).',
      'Full: the next hit you take is spent on the glass — all of it comes back (max 22). The vial empties.',
    ],
  },
  {
    id: 'charm-stilthaven-mire-boots', name: 'Mire Boots', emoji: '🥾', kind: 'charm', price: 560, isle: 'slime',
    flavor: 'Waders tarred to the thigh. The mire is soft enough to sink in and thick enough to stop a blow.',
    script: 'charm-stilthaven-mire-boots', effect: { maxHp: 6 },
    scriptText: [
      'Stand still 0.5s and you sink: hits taken while sunk are partly swallowed (35% back, max 12).',
      'Sunk a full second? Moving again pulls you free: +25% speed for 1.2s.',
    ],
  },
  {
    id: 'charm-stilthaven-ear-trumpet', name: 'Ear-Trumpet', emoji: '📯', kind: 'charm', price: 760, isle: 'slime',
    flavor: 'An informer\'s brass trumpet, worn turned backward over the shoulder. Pennywort says it was in her stove. It was not.',
    script: 'charm-stilthaven-ear-trumpet', effect: { dodgeChance: 0.02 },
    scriptText: [
      'A hit taken while the foe is outside the 140° arc you face is heard coming: halved (max 18 back).',
      'Then the trumpet listens again in 4s.',
    ],
  },
  {
    id: 'charm-stilthaven-coiled-asp', name: 'Coiled Asp', emoji: '🐍', kind: 'charm', price: 980, isle: 'slime',
    flavor: 'A banded asp that sleeps round your forearm, warm and heavy. It is not tame. It simply likes you better.',
    script: 'charm-stilthaven-coiled-asp',
    scriptText: [
      'The asp coils tighter while left alone: 1 coil per 1.6s, 3 at most. When the foe comes within 90px',
      'it strikes: 6 damage per coil and holds them 0.25s per coil. Then it uncoils and starts over.',
    ],
  },
  // The Bitten Hook
  {
    id: 'charm-stilthaven-gaff-hook', name: 'Gaff Hook', emoji: '🪝', kind: 'charm', price: 360, isle: 'slime',
    flavor: 'The boat-hook off the Landing Pier. Morrow Gall says he has another. He has said that about a lot of things.',
    script: 'charm-stilthaven-gaff-hook',
    scriptText: ['A landed hit on a foe more than 220px away hauls them 70px toward you and the barb does 4. Every 5s.'],
  },
  {
    id: 'charm-stilthaven-mudskipper-fin', name: 'Mudskipper Fin', emoji: '🐸', kind: 'charm', price: 540, isle: 'slime',
    flavor: 'A mudskipper\'s fin, dried stiff and sewn to a band. Mudskippers do not walk. They skip, and arrive staring.',
    script: 'charm-stilthaven-mudskipper-fin', effect: { speedMult: 1.03 },
    scriptText: ['Cover 110px in a quarter-second (dash, blink, leap) to skip: your next landed hit within 1.5s adds 10.'],
  },
  // Quest reward
  {
    id: 'charm-stilthaven-lowering-lantern', name: 'The Lowering Lantern', emoji: '🏮', kind: 'charm', isle: 'slime',
    flavor: 'Ossery Blain\'s tin lantern. It found boats in the mire for thirty years. It will find you the way back.',
    script: 'charm-stilthaven-lowering-lantern', effect: { regenPerSecond: 0.15 },
    scriptText: [
      'A hit of 12+ leaves a lantern where you stood (3 at most, 12s each). Walk back through one:',
      '+7 health, and your next landed hit adds 6.',
    ],
  },
  // Counter food
  {
    id: 'food-stilthaven-mangrove-tea', name: 'Mangrove Tea', emoji: '🍵', kind: 'food', price: 40, sell: 10, isle: 'slime',
    flavor: 'Mangrove bark stewed black. Bitter as a ration board. Stilthaven drinks it to take the almond out of the air.',
    effect: { regenPerSecond: 0.3 },
  },
  {
    id: 'food-stilthaven-smoked-mudskipper', name: 'Smoked Mudskipper', emoji: '🍢', kind: 'food', price: 60, sell: 15, isle: 'slime',
    flavor: 'Three on a skewer, smoked over the tannery fire. They are still staring. Eat them anyway.',
    effect: { shieldHp: 12, speedMult: 1.03 },
  },
  // The Honeyed Fang's meals
  {
    id: 'meal-stilthaven-grey-day-buns', name: 'Grey-Day Buns', emoji: '🍯', kind: 'food', sell: 16, isle: 'slime',
    flavor: 'Honey buns with mullet and herring baked in, for the passed-over. There is a drop of something in the honey.',
    script: 'meal-stilthaven-grey-day-buns', effect: { maxHp: 6 },
    scriptText: ['Next fight: at half health it kicks in — 18 health over 6s, and hits taken meanwhile are 3 lighter.'],
  },
  {
    id: 'meal-stilthaven-stargazy-pie', name: 'Stargazy Fang-Pie', emoji: '🥧', kind: 'food', sell: 24, isle: 'slime',
    flavor: 'Fanged herring baked whole, heads up through the crust, teeth bared at the sky. Hetty\'s pride.',
    script: 'meal-stilthaven-stargazy-pie', effect: { critChance: 0.02 },
    scriptText: ['Next fight: landed hits leave herring fangs in the foe (1 per 0.4s); with 3 in, 4s later they bite for 18.'],
  },
  {
    id: 'meal-stilthaven-jellied-viper', name: 'Jellied Viper', emoji: '🍮', kind: 'food', sell: 30, isle: 'slime',
    flavor: 'Viper eel and Fang Court adder minnows set in their own green jelly. It wobbles. So will you.',
    script: 'meal-stilthaven-jellied-viper', effect: { shieldHp: 8 },
    scriptText: ['Next fight: take two hits within 1.5s and the second lands in the jelly — half comes back (max 14).'],
  },
  {
    id: 'meal-stilthaven-grouper-chowder', name: 'Grouper Chowder', emoji: '🍲', kind: 'food', sell: 34, isle: 'slime',
    flavor: 'Black grouper, Shackle shad and mullet in milk, in a tin cup on a string. Debtors\' food, made generous.',
    script: 'meal-stilthaven-grouper-chowder', effect: { regenPerSecond: 0.2 },
    scriptText: ['Next fight: stand still 0.6s to take a sip — +5 health. Five sips, one every 2.5s.'],
  },
  {
    id: 'meal-stilthaven-hydra-platter', name: 'Hydra Platter', emoji: '🐲', kind: 'food', sell: 60, isle: 'slime',
    flavor: 'A hydra sturgeon with its false heads carved free, between an Umbral shade perch and a Grave Court bonefish.',
    script: 'meal-stilthaven-hydra-platter', effect: { damageMult: 1.03, maxHp: 8 },
    scriptText: [
      'Next fight: you have five heads. A hit taken costs one and arms a bite (next landed hit +8, 3 at most).',
      '6s after it is lost, each lost head grows back as two (up to five).',
    ],
  },
];

export const PORT_SCRIPTS: Record<string, ItemScriptFactory> = {
  'charm-stilthaven-milking-glove': milkingGlove,
  'charm-stilthaven-mire-boots': mireBoots,
  'charm-stilthaven-ear-trumpet': earTrumpet,
  'charm-stilthaven-coiled-asp': coiledAsp,
  'charm-stilthaven-gaff-hook': gaffHook,
  'charm-stilthaven-mudskipper-fin': mudskipperFin,
  'charm-stilthaven-lowering-lantern': loweringLantern,
  'meal-stilthaven-grey-day-buns': greyDayBuns,
  'meal-stilthaven-stargazy-pie': stargazyPie,
  'meal-stilthaven-jellied-viper': jelliedViper,
  'meal-stilthaven-grouper-chowder': grouperChowder,
  'meal-stilthaven-hydra-platter': hydraPlatter,
};

export const PORT_SHOPS: ShopDef[] = [
  {
    id: 'stilthaven-store', name: 'The Coil & Candle', buys: true,
    stock: [
      'charm-stilthaven-milking-glove', 'charm-stilthaven-mire-boots', 'charm-stilthaven-ear-trumpet', 'charm-stilthaven-coiled-asp',
      'food-stilthaven-mangrove-tea', 'food-stilthaven-smoked-mudskipper',
    ],
  },
  {
    id: 'stilthaven-tackle', name: 'The Bitten Hook', buys: true,
    stock: ['rod-antivenin', 'rod-iron', 'rod-driftwood', 'charm-stilthaven-gaff-hook', 'charm-stilthaven-mudskipper-fin'],
  },
];

export const PORT_BAKERIES: BakeryDef[] = [
  {
    id: 'stilthaven-bakery', name: 'The Honeyed Fang',
    recipes: [
      {
        id: 'recipe-stilthaven-grey-day-buns', name: 'Grey-Day Buns', coins: 14, output: 'meal-stilthaven-grey-day-buns', makes: 2,
        inputs: [{ item: 'fish-mire-mullet', count: 2 }, { item: 'fish-fanged-herring', count: 1 }],
      },
      {
        id: 'recipe-stilthaven-stargazy-pie', name: 'Stargazy Fang-Pie', coins: 20, output: 'meal-stilthaven-stargazy-pie',
        inputs: [{ item: 'fish-fanged-herring', count: 2 }, { item: 'fish-mudskipper', count: 1 }],
      },
      {
        id: 'recipe-stilthaven-jellied-viper', name: 'Jellied Viper', coins: 26, output: 'meal-stilthaven-jellied-viper',
        inputs: [{ item: 'fish-viper-eel', count: 1 }, { item: 'fish-adder-minnow', count: 2 }],
      },
      {
        id: 'recipe-stilthaven-grouper-chowder', name: 'Grouper Chowder', coins: 30, output: 'meal-stilthaven-grouper-chowder',
        inputs: [{ item: 'fish-black-grouper', count: 1 }, { item: 'fish-shackle-shad', count: 1 }, { item: 'fish-mire-mullet', count: 1 }],
      },
      {
        id: 'recipe-stilthaven-hydra-platter', name: 'Hydra Platter', coins: 44, output: 'meal-stilthaven-hydra-platter',
        inputs: [{ item: 'fish-hydra-sturgeon', count: 1 }, { item: 'fish-shade-perch', count: 1 }, { item: 'fish-lych-bonefish', count: 1 }],
      },
    ],
  },
];
