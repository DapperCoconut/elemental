import type { BakeryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, Pt, ShopDef } from '../../../../IslesTypes';

/**
 * Terminus's goods: Ottoline Brass's four charms at Sockets & Sundries, Gus Varnish's two tackle
 * charms, Nan Wickersley's snuffer-cap (a quest reward, never sold), two counter foods, and the five
 * meals the Element bakes.
 *
 * Every script keeps its own clock (scene `time`), draws what it is doing on the fighter it belongs
 * to, and says so out loud when it fires. Thornwild's charms were about a garden's habits; these are
 * about a town that cranks: current you wind by walking, a meter that rings on a clock, a jar that
 * stores what hurt you, a rod the storm will find, an eel on a live line — and one small contraband
 * flame that goes out the moment you are hit.
 */

const near = (ax: number, ay: number, bx: number, by: number, r: number): boolean =>
  (ax - bx) * (ax - bx) + (ay - by) * (ay - by) <= r * r;

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

/** A jagged little arc between two points, for scripts (deterministic per `seed`). */
function zap(g: Phaser.GameObjects.Graphics, a: Pt, b: Pt, seed: number, alpha: number, w = 2): void {
  const len = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
  const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
  const pts: Pt[] = [a];
  for (let i = 1; i < 6; i++) {
    const j = Math.sin(seed * 91.7 + i * 37.3) * 1000;
    const off = ((j - Math.floor(j)) - 0.5) * Math.min(40, len * 0.25);
    pts.push({ x: a.x + (b.x - a.x) * (i / 6) + nx * off, y: a.y + (b.y - a.y) * (i / 6) + ny * off });
  }
  pts.push(b);
  for (const [lw, c, al] of [[w * 3, 0x9ad4ff, 0.25], [w, 0xecf7ff, 1]] as [number, number, number][]) {
    g.lineStyle(lw, c, al * alpha);
    g.beginPath(); pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y))); g.strokePath();
  }
}

// ── Charm: Pocket Crank ──────────────────────────────────────────────

/**
 * A crank-handle and a little coil in a tin, worn on the belt. Every 520px you walk winds one turn
 * into it (three at most). The next ability you cast spends a turn and comes back 1.1s sooner.
 * Terminus has cranked on its feet for forty years; now you do too.
 */
const pocketCrank: ItemScriptFactory = (ctx) => {
  const PER_TURN = 520;
  let turns = 0;
  let wound = 0;
  let lx = NaN, ly = NaN;
  let spentAt = -9999;
  return {
    update() {
      const p = ctx.player;
      if (!alive(ctx, 'player')) return;
      if (Number.isNaN(lx)) { lx = p.x; ly = p.y; return; }
      const d = Math.hypot(p.x - lx, p.y - ly);
      lx = p.x; ly = p.y;
      if (d > 60 || turns >= 3) return; // a teleport is not a walk
      wound += d;
      if (wound >= PER_TURN) { wound -= PER_TURN; turns++; ctx.sfx('gear-turn'); }
    },
    onCast(abilityId) {
      if (turns <= 0) return;
      turns--;
      spentAt = ctx.scene.time.now;
      ctx.refund(abilityId, 1100);
      ctx.float(ctx.player.x, ctx.player.y - 52, 'CRANKED −1.1s', '#9ad4ff');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const cx = p.x + 22, cy = p.y + 6;
      // The tin, and the handle turning as you walk.
      g.fillStyle(0x3c404c, 1); g.fillRoundedRect(cx - 6, cy - 6, 12, 12, 2);
      const a = (wound / PER_TURN) * Math.PI * 2;
      g.lineStyle(1.5, 0x6c7284, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9);
      g.fillStyle(0x4a3426, 1); g.fillCircle(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 2);
      for (let i = 0; i < 3; i++) {
        g.fillStyle(i < turns ? 0x9ad4ff : 0x1e2028, 1); g.fillCircle(cx - 5 + i * 5, cy - 11, 1.8);
      }
      if (time - spentAt < 400) {
        const q = (time - spentAt) / 400;
        g.lineStyle(2, 0x9ad4ff, 1 - q); g.strokeCircle(p.x, p.y, 20 + q * 24);
      }
    },
  };
};

// ── Charm: Draw Meter ────────────────────────────────────────────────

/**
 * A household meter on a chain, with a bell in it. Every 10s it rings the Brownout for your fight
 * and reads what you dealt since the last ring. Made your Draw (35 or more)? +20% damage for 4s.
 * Short? The meter chalks it, and the dial sulks in red until the next ring.
 */
const drawMeter: ItemScriptFactory = (ctx) => {
  const PERIOD = 10000, QUOTA = 35;
  let start = -1;
  let dealt = 0;
  let lastRing = -9999;
  let made = false;
  return {
    update(time) {
      if (start < 0) start = time;
      if (time - start >= PERIOD) {
        start = time;
        lastRing = time;
        made = dealt >= QUOTA;
        ctx.sfx('clang');
        if (made && alive(ctx, 'player')) {
          ctx.boostDamage(1.2, 4000);
          ctx.float(ctx.player.x, ctx.player.y - 56, `DRAW MADE ${dealt}/${QUOTA}`, '#9ad4ff');
        } else {
          ctx.float(ctx.player.x, ctx.player.y - 56, `SHORT ${dealt}/${QUOTA}`, '#d8443a');
        }
        dealt = 0;
      }
    },
    onHitDealt(amount) { dealt += amount; },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x - 26, y = p.y - 30, r = 8;
      g.fillStyle(0x7a5c22, 1); g.fillCircle(x, y, r + 1.5);
      g.fillStyle(0xeee6cc, 1); g.fillCircle(x, y, r);
      const read = Math.min(1, dealt / QUOTA);
      g.lineStyle(2, 0x9ad4ff, 0.9);
      g.beginPath(); g.arc(x, y, r - 2, -Math.PI / 2, -Math.PI / 2 + read * Math.PI * 2, false); g.strokePath();
      const left = 1 - (time - start) / PERIOD;
      const na = -Math.PI / 2 + (1 - left) * Math.PI * 2;
      g.lineStyle(1.5, 0x1a1410, 1); g.lineBetween(x, y, x + Math.cos(na) * (r - 1), y + Math.sin(na) * (r - 1));
      const since = time - lastRing;
      if (since < 600) {
        const q = since / 600;
        g.lineStyle(2, made ? 0x9ad4ff : 0xd8443a, 1 - q); g.strokeCircle(x, y, r + 4 + q * 18);
      } else if (!made && since < 4000) {
        g.fillStyle(0xd8443a, 0.5); g.fillCircle(x, y, 3);
      }
    },
  };
};

// ── Charm: Leyden Jar ────────────────────────────────────────────────

/**
 * A pocket Leyden jar, foil-skinned. Every hit you take charges it by the damage (to 40). Land a
 * hit while it holds 20 or more and it discharges down your blow into the foe: half its charge as an
 * arc (at most 20), then it is empty. Once per 2.5s.
 */
const leydenJar: ItemScriptFactory = (ctx) => {
  const CAP = 40;
  let charge = 0;
  let lastFire = -9999;
  return {
    onHitTaken(amount) { charge = Math.min(CAP, charge + amount); },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (charge < 20 || now - lastFire < 2500 || !alive(ctx, 'npc')) return;
      const dmg = Math.min(20, Math.round(charge * 0.5));
      lastFire = now;
      charge = 0;
      ctx.hit(ctx.npc, dmg, ctx.npc.x, ctx.npc.y);
      ctx.sfx('zap');
      ctx.float(ctx.npc.x, ctx.npc.y - 46, `DISCHARGE ${dmg}`, '#ecf7ff');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x + 24, y = p.y - 26;
      const f = charge / CAP;
      g.fillStyle(0x2a3a4a, 0.8); g.fillRoundedRect(x - 5, y - 12, 10, 16, 3);
      g.fillStyle(0x6a8aff, 0.25 + f * 0.6); g.fillRect(x - 4, y + 3 - f * 14, 8, f * 14);
      g.fillStyle(0xb8c0c8, 1); g.fillRect(x - 5, y - 2, 10, 6);
      g.lineStyle(1, 0xd2aa4a, 1); g.lineBetween(x, y - 12, x, y - 17);
      g.fillStyle(0xd2aa4a, 1); g.fillCircle(x, y - 18, 2);
      if (charge >= 20 && Math.sin(time / 60) > 0.2) zap(g, { x, y: y - 18 }, { x: x + 6, y: y - 24 }, Math.floor(time / 60), 0.8, 1);
      if (time - lastFire < 260 && alive(ctx, 'npc')) zap(g, { x, y: y - 18 }, { x: ctx.npc.x, y: ctx.npc.y - 10 }, Math.floor(time / 40), 1 - (time - lastFire) / 260, 2.5);
    },
  };
};

// ── Charm: Lightning Rod Pin ─────────────────────────────────────────

/**
 * A copper pin cut from the lighthouse rod's guy-wire. Every 7s it plants a little rod where you
 * stand; at the end of the 7s the storm finds it. A foe within 85px of the rod is struck for 18;
 * if YOU are within it, you are earthed instead — untouched, and quick (+30% speed, 1.5s). Then
 * the next rod goes in where you are. Lure them onto it.
 */
const lightningRodPin: ItemScriptFactory = (ctx) => {
  const PERIOD = 7000, R = 85, WARN = 1200;
  let rod: Pt | null = null;
  let start = -1;
  let struckAt = -9999;
  let struck: Pt = { x: 0, y: 0 };
  return {
    update(time) {
      if (!alive(ctx, 'player')) return;
      if (start < 0 || !rod) { start = time; rod = { x: ctx.player.x, y: ctx.player.y }; return; }
      if (time - start < PERIOD) return;
      struck = rod; struckAt = time;
      ctx.sfx('thunder');
      ctx.flash(rod.x, rod.y, 0x9ad4ff);
      if (alive(ctx, 'npc') && near(ctx.npc.x, ctx.npc.y, rod.x, rod.y, R)) {
        ctx.hit(ctx.npc, 18, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 46, 'STRUCK', '#ecf7ff');
      }
      if (near(ctx.player.x, ctx.player.y, rod.x, rod.y, R)) {
        ctx.boostSpeed(1.3, 1500);
        ctx.float(ctx.player.x, ctx.player.y - 52, 'EARTHED', '#c8783e');
      }
      start = time;
      rod = { x: ctx.player.x, y: ctx.player.y };
    },
    drawGround(g, time) {
      if (!rod || start < 0) return;
      const left = PERIOD - (time - start);
      const warn = left < WARN;
      g.lineStyle(1.5, 0x9ad4ff, warn ? 0.5 + Math.sin(time / 50) * 0.3 : 0.18);
      g.strokeCircle(rod.x, rod.y, R);
      if (warn) { g.fillStyle(0x9ad4ff, 0.08 + (1 - left / WARN) * 0.12); g.fillCircle(rod.x, rod.y, R); }
      // The pin itself: a copper spike with a ball, and its clock as a shrinking arc.
      g.fillStyle(0x6e3a1c, 1); g.fillRect(rod.x - 1.5, rod.y - 22, 3, 22);
      g.fillStyle(0xf2ac6a, 1); g.fillCircle(rod.x, rod.y - 23, 3);
      g.lineStyle(2, 0xc8783e, 0.8);
      g.beginPath(); g.arc(rod.x, rod.y, 12, -Math.PI / 2, -Math.PI / 2 + (left / PERIOD) * Math.PI * 2, false); g.strokePath();
    },
    drawAir(g, time) {
      const since = time - struckAt;
      if (since > 300) return;
      zap(g, { x: struck.x + 30, y: 96 }, { x: struck.x, y: struck.y - 23 }, Math.floor(struckAt), 1 - since / 300, 3);
      g.fillStyle(0xecf7ff, 0.4 * (1 - since / 300)); g.fillCircle(struck.x, struck.y, R);
    },
  };
};

// ── Charm: Cable Eel Line ────────────────────────────────────────────

/**
 * A length of Gus's live line with a cable eel's tooth for a hook. A landed hit hooks the foe on a
 * crackling line for 3s (once every 5s): while hooked and within 260px of you, they take 2 every
 * half-second. Run them out past 260 and the line parts.
 */
const eelLine: ItemScriptFactory = (ctx) => {
  let hookedAt = -9999;
  let until = -9999;
  let lastTick = 0;
  let partedAt = -9999;
  return {
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (now - hookedAt < 5000 || !alive(ctx, 'npc')) return;
      hookedAt = now; until = now + 3000; lastTick = now;
      ctx.sfx('electric-charge');
      ctx.float(ctx.npc.x, ctx.npc.y - 46, 'HOOKED', '#9ad4ff');
    },
    update(time) {
      if (time >= until) return;
      if (!alive(ctx, 'npc') || !alive(ctx, 'player')) { until = time; return; }
      if (!near(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y, 260)) {
        until = time; partedAt = time;
        ctx.float((ctx.player.x + ctx.npc.x) / 2, (ctx.player.y + ctx.npc.y) / 2 - 20, 'line parted', '#6c7284');
        return;
      }
      if (time - lastTick >= 500) { lastTick = time; ctx.hit(ctx.npc, 2, ctx.npc.x, ctx.npc.y); }
    },
    drawAir(g, time) {
      const a = { x: ctx.player.x, y: ctx.player.y - 6 }, b = { x: ctx.npc.x, y: ctx.npc.y - 6 };
      if (time < until) {
        g.lineStyle(1.5, 0x1a1612, 1);
        g.beginPath(); g.moveTo(a.x, a.y);
        for (let i = 1; i <= 12; i++) { const f = i / 12; g.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f + Math.sin(f * Math.PI) * 18); }
        g.strokePath();
        const f = ((time - hookedAt) / 500) % 1;
        const px = a.x + (b.x - a.x) * f, py = a.y + (b.y - a.y) * f + Math.sin(f * Math.PI) * 18;
        g.fillStyle(0x9ad4ff, 0.35); g.fillCircle(px, py, 6);
        g.fillStyle(0xecf7ff, 1); g.fillCircle(px, py, 2);
      } else if (time - partedAt < 300) {
        const q = (time - partedAt) / 300;
        g.lineStyle(1.5, 0x1a1612, 1 - q);
        g.lineBetween(a.x, a.y, a.x + (b.x - a.x) * 0.3, a.y + (b.y - a.y) * 0.3 + 20 * q);
      }
    },
  };
};

// ── Charm: Herring Lure ──────────────────────────────────────────────

/**
 * A glass lure with a live volt herring sealed in it. Every 6s a glowing herring flops onto the floor
 * 90–160px from you and glows for 4.5s; reach it and eat it: +6 health and +20% speed for 1.5s.
 * Leave it and it goes dark.
 */
const herringLure: ItemScriptFactory = (ctx) => {
  let fish: { x: number; y: number; born: number } | null = null;
  let last = -1;
  let ateAt = -9999;
  return {
    update(time) {
      if (last < 0) last = time;
      if (fish && time - fish.born > 4500) fish = null;
      if (fish && alive(ctx, 'player') && near(ctx.player.x, ctx.player.y, fish.x, fish.y, 30)) {
        fish = null; ateAt = time;
        ctx.heal(ctx.player, 6);
        ctx.boostSpeed(1.2, 1500);
        ctx.sfx('bubble');
        ctx.float(ctx.player.x, ctx.player.y - 50, 'HERRING +6', '#9ad4ff');
      }
      if (!fish && time - last >= 6000 && alive(ctx, 'player')) {
        last = time;
        const a = ctx.rng() * Math.PI * 2, d = 90 + ctx.rng() * 70;
        fish = {
          x: Math.min(ctx.W - 40, Math.max(40, ctx.player.x + Math.cos(a) * d)),
          y: Math.min(ctx.H - 40, Math.max(110, ctx.player.y + Math.sin(a) * d)),
          born: time,
        };
      }
    },
    drawGround(g, time) {
      if (!fish) return;
      const age = (time - fish.born) / 4500;
      const flop = Math.sin(time / 90) * (age < 0.3 ? 4 : 1.5);
      g.fillStyle(0x9ad4ff, 0.15 * (1 - age)); g.fillCircle(fish.x, fish.y, 22);
      g.fillStyle(0x6a8aa8, 1); g.fillEllipse(fish.x, fish.y - flop * 0.4, 18, 7);
      g.fillTriangle(fish.x + 8, fish.y - flop * 0.4, fish.x + 14, fish.y - 5 + flop, fish.x + 14, fish.y + 5 + flop);
      g.lineStyle(1.5, 0x9ad4ff, 0.9 * (1 - age * 0.6)); g.lineBetween(fish.x - 8, fish.y - flop * 0.4, fish.x + 7, fish.y - flop * 0.4);
      g.fillStyle(0x0a0a0e, 1); g.fillCircle(fish.x - 6, fish.y - 1 - flop * 0.4, 1.2);
    },
    drawAir(g, time) {
      if (time - ateAt < 350) {
        const q = (time - ateAt) / 350;
        for (let k = 0; k < 6; k++) { const a = k * 1.05; g.fillStyle(0x9ad4ff, 1 - q); g.fillCircle(ctx.player.x + Math.cos(a) * q * 26, ctx.player.y - 10 + Math.sin(a) * q * 18, 1.6); }
      }
    },
  };
};

// ── Charm: Snuffer-Cap (quest reward) ───────────────────────────────

/**
 * The brass snuffer-cap off Tam Wickersley's pole, with a flame kept lit in it — contraband. While
 * it burns, every 4th hit you land carries it for +10. Take a hit and it goes out; it relights after
 * 3s untouched.
 */
const snufferCap: ItemScriptFactory = (ctx) => {
  let lit = true;
  let outAt = -9999;
  let count = 0;
  let burnAt = -9999;
  return {
    update(time) {
      if (!lit && time - outAt >= 3000) { lit = true; ctx.sfx('sizzle'); ctx.float(ctx.player.x, ctx.player.y - 50, 'relit', '#ffc062'); }
    },
    onHitTaken() {
      if (!lit) { outAt = ctx.scene.time.now; return; }
      lit = false; outAt = ctx.scene.time.now; count = 0;
      ctx.float(ctx.player.x, ctx.player.y - 50, 'snuffed', '#6c7284');
    },
    onHitDealt() {
      if (!lit || !alive(ctx, 'npc')) return;
      count++;
      if (count % 4 !== 0) return;
      burnAt = ctx.scene.time.now;
      ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y);
      ctx.sfx('flame-burst');
      ctx.float(ctx.npc.x, ctx.npc.y - 46, 'LAMPLIT +10', '#ffc062');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x - 20, y = p.y - 36;
      // The little brass cone on its stub, the flame (or a curl of smoke) above it, and four pips.
      g.fillStyle(0x7a5c22, 1); g.fillTriangle(x - 5, y + 6, x + 5, y + 6, x, y - 3);
      g.fillStyle(0xd2aa4a, 1); g.fillTriangle(x - 4, y + 5, x + 1, y + 5, x - 1, y - 1);
      if (lit) {
        const fl = 1 + Math.sin(time / 70) * 0.15;
        g.fillStyle(0xffc062, 0.25); g.fillCircle(x, y - 6, 8 * fl);
        g.fillStyle(0xffc062, 1); g.fillEllipse(x, y - 6, 4 * fl, 8 * fl);
        g.fillStyle(0xfff0c8, 1); g.fillEllipse(x, y - 5, 1.8, 3.5);
      } else {
        const q = ((time - outAt) % 1200) / 1200;
        g.fillStyle(0x8a8a90, 0.5 * (1 - q)); g.fillCircle(x + Math.sin(q * 6) * 3, y - 6 - q * 16, 2 + q * 3);
      }
      for (let i = 0; i < 4; i++) { g.fillStyle(i < count % 4 ? 0xffc062 : 0x2a2420, 1); g.fillCircle(x - 6 + i * 4, y + 10, 1.3); }
      if (time - burnAt < 300 && alive(ctx, 'npc')) {
        const q = (time - burnAt) / 300;
        g.lineStyle(2, 0xffc062, 1 - q); g.strokeCircle(ctx.npc.x, ctx.npc.y, 16 + q * 26);
      }
    },
  };
};

// ── Meals ───────────────────────────────────────────────────────────

/**
 * Herring Pasty — volt herring in a crimped crust that glows faintly through the pastry. Next
 * fight: every 8s a glowing scale drops where you stand (two at most, 8s each); standing within
 * 40px of one heals 1.5 a second.
 */
const herringPasty: ItemScriptFactory = (ctx) => {
  const scales: { x: number; y: number; born: number }[] = [];
  let last = -1;
  let healAcc = 0;
  return {
    update(time, dt) {
      if (last < 0) last = time;
      for (let i = scales.length - 1; i >= 0; i--) if (time - scales[i].born > 8000) scales.splice(i, 1);
      if (time - last >= 8000 && alive(ctx, 'player')) {
        last = time;
        if (scales.length >= 2) scales.shift();
        scales.push({ x: ctx.player.x, y: ctx.player.y + 8, born: time });
      }
      if (alive(ctx, 'player') && scales.some((s) => near(ctx.player.x, ctx.player.y, s.x, s.y, 40))) {
        healAcc += 1.5 * dt;
        if (healAcc >= 1) { const n = Math.floor(healAcc); healAcc -= n; ctx.heal(ctx.player, n); }
      }
    },
    drawGround(g, time) {
      for (const s of scales) {
        const life = 1 - (time - s.born) / 8000;
        g.fillStyle(0x9ad4ff, 0.08 * life); g.fillCircle(s.x, s.y, 40);
        g.lineStyle(1, 0x9ad4ff, 0.35 * life); g.strokeCircle(s.x, s.y, 40);
        g.fillStyle(0xb8d8f0, 0.9 * life); g.fillEllipse(s.x, s.y, 10, 7);
        g.fillStyle(0xecf7ff, life * (0.6 + Math.sin(time / 160) * 0.3)); g.fillEllipse(s.x - 1, s.y - 1, 4, 2);
      }
    },
  };
};

/**
 * Copper Snapper Stew — snapper and herring in a copper pot, served in it. Next fight: the first
 * time you fall below half health you are "re-plated": +16 health and +25% speed for 3s.
 */
const snapperStew: ItemScriptFactory = (ctx) => {
  let used = false;
  let at = -9999;
  return {
    update(time) {
      const p = ctx.player;
      if (used || !alive(ctx, 'player') || p.hp >= p.maxHp * 0.5) return;
      used = true; at = time;
      ctx.heal(p, 16);
      ctx.boostSpeed(1.25, 3000);
      ctx.sfx('anvil');
      ctx.float(p.x, p.y - 54, 'RE-PLATED +16', '#f2ac6a');
    },
    drawAir(g, time) {
      const since = time - at;
      if (since > 3000) return;
      const p = ctx.player;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + time / 400;
        g.fillStyle(0xc8783e, 0.8 * (1 - since / 3000)); g.fillRect(p.x + Math.cos(a) * 24 - 3, p.y + Math.sin(a) * 18 - 2, 6, 4);
      }
    },
  };
};

/**
 * Eel & Trout Pie — cable eel and Dynamo turbine trout under a lattice crust that sparks when cut.
 * Next fight: every 5th ability you cast jolts up an unseen line into the foe wherever they are,
 * for 12.
 */
const eelTroutPie: ItemScriptFactory = (ctx) => {
  let casts = 0;
  let firedAt = -9999;
  return {
    onCast() {
      casts++;
      if (casts % 5 !== 0 || !alive(ctx, 'npc')) return;
      firedAt = ctx.scene.time.now;
      ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y);
      ctx.sfx('plasma-arc');
      ctx.float(ctx.npc.x, ctx.npc.y - 46, 'JOLT 12', '#9ad4ff');
    },
    drawAir(g, time) {
      const p = ctx.player;
      for (let i = 0; i < 5; i++) { g.fillStyle(i < casts % 5 ? 0x9ad4ff : 0x1e2028, 1); g.fillRect(p.x - 12 + i * 5, p.y + 26, 3, 3); }
      const since = time - firedAt;
      if (since < 260 && alive(ctx, 'npc')) zap(g, { x: p.x, y: p.y - 6 }, { x: ctx.npc.x, y: ctx.npc.y - 6 }, Math.floor(time / 40), 1 - since / 260, 2.5);
    },
  };
};

/**
 * Mackerel Sparklers — spark mackerel spitted and flashed on the element, still crackling. Next
 * fight: while you move fast (over 230px/s) you shed sparks (six at most, 2s each); a foe who walks
 * through one takes 4 and puts it out.
 */
const mackerelSparklers: ItemScriptFactory = (ctx) => {
  const sparks: { x: number; y: number; born: number }[] = [];
  let lx = NaN, ly = NaN;
  let lastDrop = -9999;
  return {
    update(time, dt) {
      for (let i = sparks.length - 1; i >= 0; i--) if (time - sparks[i].born > 2000) sparks.splice(i, 1);
      const p = ctx.player;
      if (!Number.isNaN(lx) && dt > 0) {
        const v = Math.hypot(p.x - lx, p.y - ly) / dt;
        if (v > 230 && v < 2000 && time - lastDrop > 180 && alive(ctx, 'player')) {
          lastDrop = time;
          if (sparks.length >= 6) sparks.shift();
          sparks.push({ x: p.x, y: p.y + 8, born: time });
        }
      }
      lx = p.x; ly = p.y;
      if (!alive(ctx, 'npc')) return;
      for (let i = sparks.length - 1; i >= 0; i--) {
        if (!near(ctx.npc.x, ctx.npc.y, sparks[i].x, sparks[i].y, 26)) continue;
        sparks.splice(i, 1);
        ctx.hit(ctx.npc, 4, ctx.npc.x, ctx.npc.y);
        ctx.sfx('zap');
      }
    },
    drawGround(g, time) {
      for (const s of sparks) {
        const life = 1 - (time - s.born) / 2000;
        g.fillStyle(0x9ad4ff, 0.2 * life); g.fillCircle(s.x, s.y, 9);
        for (let k = 0; k < 4; k++) {
          const a = time / 70 + k * 1.6 + s.x;
          g.lineStyle(1, 0xecf7ff, life); g.lineBetween(s.x, s.y, s.x + Math.cos(a) * 6, s.y + Math.sin(a) * 4);
        }
      }
    },
  };
};

/**
 * Storm Tuna, Glow-Gar Glaze — a tuna steak glazed with the Halflife's glowing gar until it shines
 * in the dark. Next fight: every 15s the lights dip for 2s — a brownout — and in the dark your hits
 * land 25% harder.
 */
const tunaGlaze: ItemScriptFactory = (ctx) => {
  let start = -1;
  let darkUntil = -9999;
  return {
    update(time) {
      if (start < 0) start = time;
      if (time - start >= 15000) {
        start = time;
        darkUntil = time + 2000;
        ctx.boostDamage(1.25, 2000);
        ctx.sfx('hush');
        ctx.float(ctx.player.x, ctx.player.y - 56, 'BROWNOUT', '#6a8aff');
      }
    },
    drawAir(g, time) {
      if (time < darkUntil) {
        const left = (darkUntil - time) / 2000;
        g.fillStyle(0x05070e, 0.38 * Math.min(1, left * 4) * Math.min(1, (1 - left) * 8 + 0.2));
        g.fillRect(0, 0, ctx.W, ctx.H);
        // The glaze still glows: you, faintly green, in the dark.
        g.fillStyle(0x7aff6a, 0.12); g.fillCircle(ctx.player.x, ctx.player.y, 30);
      } else if (time - start > 13000) {
        // The dip is coming: the light flickers.
        if (Math.sin(time / 45) > 0.6) { g.fillStyle(0x05070e, 0.08); g.fillRect(0, 0, ctx.W, ctx.H); }
      }
    },
  };
};

// ── Definitions ─────────────────────────────────────────────────────

export const PORT_ITEMS: IsleItemDef[] = [
  // Sockets & Sundries
  {
    id: 'charm-terminus-pocket-crank', name: 'Pocket Crank', emoji: '🔧', kind: 'charm', price: 340, isle: 'electricity',
    flavor: 'A crank-handle and a coil in a tobacco tin. Ottoline sells them to crank-hands who walk to work.',
    script: 'charm-terminus-pocket-crank',
    scriptText: [
      'Every 520px you walk winds a turn into it (3 at most).',
      'Your next cast spends a turn and comes back 1.1s sooner.',
    ],
  },
  {
    id: 'charm-terminus-draw-meter', name: 'Draw Meter', emoji: '⏲️', kind: 'charm', price: 480, isle: 'electricity',
    flavor: 'A household meter on a watch-chain, with the Brownout Bell\'s chime inside. It will not let you forget.',
    script: 'charm-terminus-draw-meter', effect: { maxHp: 6 },
    scriptText: [
      'Rings every 10s and reads what you dealt since the last ring.',
      'Made the Draw (35+): +20% damage for 4s. Short: nothing, and it says so.',
    ],
  },
  {
    id: 'charm-terminus-leyden-jar', name: 'Leyden Jar', emoji: '🫙', kind: 'charm', price: 640, isle: 'electricity',
    flavor: 'A pocket jar, foil inside and out, a brass knob on a chain. It keeps whatever you give it, and gives it back.',
    script: 'charm-terminus-leyden-jar', effect: { shieldHp: 6 },
    scriptText: [
      'Hits you take charge the jar by their damage (max 40). Land a hit at 20+ and it discharges:',
      'half its charge into the foe (max 20), then empty. Once per 2.5s.',
    ],
  },
  {
    id: 'charm-terminus-lightning-rod-pin', name: 'Lightning Rod Pin', emoji: '📍', kind: 'charm', price: 860, isle: 'electricity',
    flavor: 'A copper pin cut from the lighthouse rod\'s guy-wire. Fenna says the storm still knows where it is.',
    script: 'charm-terminus-lightning-rod-pin',
    scriptText: [
      'Every 7s plants a rod where you stand; then the storm strikes it. A foe within 85px takes 18.',
      'If you are within it you are earthed instead: unhurt, +30% speed for 1.5s.',
    ],
  },
  // Varnish & Line
  {
    id: 'charm-terminus-eel-line', name: 'Cable Eel Line', emoji: '🪝', kind: 'charm', price: 420, isle: 'electricity',
    flavor: 'Gus\'s live line, with a cable eel\'s tooth for a hook. It hums in the hand. Do not lick the hook.',
    script: 'charm-terminus-eel-line',
    scriptText: [
      'A landed hit hooks the foe on a live line for 3s (every 5s): 2 damage per 0.5s while within 260px.',
      'Run them out past 260px and the line parts.',
    ],
  },
  {
    id: 'charm-terminus-herring-lure', name: 'Herring Lure', emoji: '🐟', kind: 'charm', price: 560, isle: 'electricity',
    flavor: 'A glass lure with a live volt herring sealed in it, blinking. It has never caught anything. It is lunch.',
    script: 'charm-terminus-herring-lure', effect: { regenPerSecond: 0.2 },
    scriptText: ['Every 6s a glowing herring lands 90–160px away for 4.5s. Reach it: +6 health, +20% speed for 1.5s.'],
  },
  // Quest reward
  {
    id: 'charm-terminus-snuffer-cap', name: 'Snuffer-Cap', emoji: '🕯️', kind: 'charm', isle: 'electricity',
    flavor: 'The brass cap off Tam Wickersley\'s lamplighter\'s pole, a small flame kept in it. Contraband. Lovely.',
    script: 'charm-terminus-snuffer-cap', effect: { critChance: 0.02 },
    scriptText: ['While lit, every 4th hit you land adds +10. Taking a hit snuffs it; it relights after 3s untouched.'],
  },
  // Counter food
  {
    id: 'food-terminus-crank-cake', name: 'Crank-Cake', emoji: '🍪', kind: 'food', price: 40, sell: 10, isle: 'electricity',
    flavor: 'Oat and treacle, baked in a ring so it hangs on the crank-handle. Eaten one-handed while cranking.',
    effect: { shieldHp: 11 },
  },
  {
    id: 'food-terminus-brine-tea', name: 'Brine Tea', emoji: '🍵', kind: 'food', price: 55, sell: 14, isle: 'electricity',
    flavor: 'Black tea with a pinch of sea-salt, brewed on a metered ring. Keeps the crank-hands awake till the Bell.',
    effect: { cooldownMult: 0.97, regenPerSecond: 0.2 },
  },
  // The Element's meals
  {
    id: 'meal-terminus-herring-pasty', name: 'Herring Pasty', emoji: '🥟', kind: 'food', sell: 15, isle: 'electricity',
    flavor: 'Volt herring in a crimped crust. It glows faintly through the pastry, so you can eat it in a brownout.',
    script: 'meal-terminus-herring-pasty', effect: { maxHp: 7 },
    scriptText: ['Next fight: every 8s a glowing scale drops where you stand (2 at most, 8s). Within 40px: +1.5 health/s.'],
  },
  {
    id: 'meal-terminus-snapper-stew', name: 'Copper Snapper Stew', emoji: '🍲', kind: 'food', sell: 22, isle: 'electricity',
    flavor: 'Snapper and herring stewed in a copper pot and served in it. The pot goes back. Delphine counts.',
    script: 'meal-terminus-snapper-stew', effect: { shieldHp: 8 },
    scriptText: ['Next fight: the first time you fall below half health, +16 health and +25% speed for 3s.'],
  },
  {
    id: 'meal-terminus-eel-trout-pie', name: 'Eel & Trout Pie', emoji: '🥧', kind: 'food', sell: 30, isle: 'electricity',
    flavor: 'Cable eel and Dynamo turbine trout under a lattice crust that sparks when it is cut. Mind your knife.',
    script: 'meal-terminus-eel-trout-pie', effect: { maxHp: 8 },
    scriptText: ['Next fight: every 5th ability you cast jolts into the foe wherever they are, for 12.'],
  },
  {
    id: 'meal-terminus-mackerel-sparklers', name: 'Mackerel Sparklers', emoji: '🍢', kind: 'food', sell: 26, isle: 'electricity',
    flavor: 'Spark mackerel on skewers, flashed on the element. They still crackle at the table. Children love them.',
    script: 'meal-terminus-mackerel-sparklers', effect: { speedMult: 1.03 },
    scriptText: ['Next fight: moving fast sheds sparks (6 at most, 2s). A foe who walks through one takes 4.'],
  },
  {
    id: 'meal-terminus-tuna-glaze', name: 'Storm Tuna, Glow-Gar Glaze', emoji: '🍣', kind: 'food', sell: 40, isle: 'electricity',
    flavor: 'A storm tuna steak glazed with Halflife glow-gar until it shines in the dark. Delphine wears gloves.',
    script: 'meal-terminus-tuna-glaze', effect: { damageMult: 1.03 },
    scriptText: ['Next fight: every 15s the lights dip for 2s — a brownout — and your hits land 25% harder in the dark.'],
  },
];

export const PORT_SCRIPTS: Record<string, ItemScriptFactory> = {
  'charm-terminus-pocket-crank': pocketCrank,
  'charm-terminus-draw-meter': drawMeter,
  'charm-terminus-leyden-jar': leydenJar,
  'charm-terminus-lightning-rod-pin': lightningRodPin,
  'charm-terminus-eel-line': eelLine,
  'charm-terminus-herring-lure': herringLure,
  'charm-terminus-snuffer-cap': snufferCap,
  'meal-terminus-herring-pasty': herringPasty,
  'meal-terminus-snapper-stew': snapperStew,
  'meal-terminus-eel-trout-pie': eelTroutPie,
  'meal-terminus-mackerel-sparklers': mackerelSparklers,
  'meal-terminus-tuna-glaze': tunaGlaze,
};

export const PORT_SHOPS: ShopDef[] = [
  {
    id: 'terminus-store', name: 'Sockets & Sundries', buys: true,
    stock: [
      'charm-terminus-pocket-crank', 'charm-terminus-draw-meter', 'charm-terminus-leyden-jar', 'charm-terminus-lightning-rod-pin',
      'food-terminus-crank-cake', 'food-terminus-brine-tea',
    ],
  },
  {
    id: 'terminus-tackle', name: 'Varnish & Line', buys: true,
    stock: ['rod-insulated', 'rod-iron', 'rod-driftwood', 'charm-terminus-eel-line', 'charm-terminus-herring-lure'],
  },
];

export const PORT_BAKERIES: BakeryDef[] = [
  {
    id: 'terminus-bakery', name: 'The Element',
    recipes: [
      {
        id: 'recipe-terminus-herring-pasty', name: 'Herring Pasty', coins: 14, output: 'meal-terminus-herring-pasty', makes: 2,
        inputs: [{ item: 'fish-volt-herring', count: 3 }],
      },
      {
        id: 'recipe-terminus-snapper-stew', name: 'Copper Snapper Stew', coins: 18, output: 'meal-terminus-snapper-stew',
        inputs: [{ item: 'fish-copper-snapper', count: 1 }, { item: 'fish-volt-herring', count: 2 }],
      },
      {
        id: 'recipe-terminus-mackerel-sparklers', name: 'Mackerel Sparklers', coins: 22, output: 'meal-terminus-mackerel-sparklers', makes: 2,
        inputs: [{ item: 'fish-spark-mackerel', count: 2 }],
      },
      {
        id: 'recipe-terminus-eel-trout-pie', name: 'Eel & Trout Pie', coins: 28, output: 'meal-terminus-eel-trout-pie',
        inputs: [{ item: 'fish-cable-eel', count: 1 }, { item: 'fish-turbine-trout', count: 1 }],
      },
      {
        id: 'recipe-terminus-tuna-glaze', name: 'Storm Tuna, Glow-Gar Glaze', coins: 38, output: 'meal-terminus-tuna-glaze',
        inputs: [{ item: 'fish-storm-tuna', count: 1 }, { item: 'fish-glow-gar', count: 1 }],
      },
    ],
  },
];
