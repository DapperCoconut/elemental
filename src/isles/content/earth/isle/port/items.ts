import type { BakeryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';

/**
 * Quarrymouth's goods: Mags Cobble's four charms, Silas Sounder's two tackle charms, Ruth Ashlar's
 * slate page (a quest reward, never sold), two counter foods, and the five meals the Hearthstone
 * bakes.
 *
 * Every script keeps its own clock (scene `time`), draws what it is doing on the fighter it belongs
 * to, and says so out loud when it fires. Brandmark's charms were about fire and timing, the
 * Drowned Reach's about the sea, Thornwild's about a garden's habits; these are about a quarry's —
 * a bob that has to hang true, stone that splits only along one line, an arch that stands only once
 * its keystone is in, and a debt that is always, eventually, paid in weight.
 */

const near = (ax: number, ay: number, bx: number, by: number, r: number): boolean =>
  (ax - bx) * (ax - bx) + (ay - by) * (ay - by) <= r * r;

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

/** Smallest difference between two angles, in radians (0..π). */
const angDiff = (a: number, b: number): number => {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
};

// ── Charm: Plumb Bob ─────────────────────────────────────────────────

/**
 * A mason's plumb-bob on a cord at your belt. Run in one direction and it swings out behind you,
 * gathering weight; double back sharply after at least 120px of run and it whips through and cracks
 * out ahead of you — 8 damage, +1 for every 40px of run behind it (max 16), to a foe within 110px
 * of where it lands. Once every 1.2s. Standing still lets it hang dead.
 */
const plumbBob: ItemScriptFactory = (ctx) => {
  let lastX = NaN, lastY = NaN;
  let dirX = 0, dirY = 1;
  let run = 0;
  let lastCrack = -9999;
  let crack: { x: number; y: number; at: number; hit: boolean } | null = null;
  return {
    update(time, dt) {
      const p = ctx.player;
      if (Number.isNaN(lastX)) { lastX = p.x; lastY = p.y; return; }
      const dx = p.x - lastX, dy = p.y - lastY;
      lastX = p.x; lastY = p.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.4) { run = Math.max(0, run - 160 * dt); return; }
      const ux = dx / d, uy = dy / d;
      const dot = ux * dirX + uy * dirY;
      if (dot < -0.5 && run >= 120 && time - lastCrack >= 1200 && alive(ctx, 'player')) {
        const cx = p.x + ux * 70, cy = p.y + uy * 70;
        const dmg = Math.min(16, 8 + Math.floor((run - 120) / 40));
        const hit = alive(ctx, 'npc') && near(cx, cy, ctx.npc.x, ctx.npc.y, 110);
        if (hit) {
          ctx.hit(ctx.npc, dmg, ctx.npc.x, ctx.npc.y);
          ctx.float(ctx.npc.x, ctx.npc.y - 46, `PLUMB! ${dmg}`, '#f0d88a');
        }
        ctx.sfx(hit ? 'clang' : 'whoosh');
        crack = { x: cx, y: cy, at: time, hit };
        lastCrack = time;
        run = 0;
        dirX = ux; dirY = uy;
        return;
      }
      if (dot > 0.3) run += d;
      else run *= 0.85;
      const nx = dirX * 0.8 + ux * 0.2, ny = dirY * 0.8 + uy * 0.2, nl = Math.hypot(nx, ny) || 1;
      dirX = nx / nl; dirY = ny / nl;
    },
    drawAir(g, time) {
      const p = ctx.player;
      const swing = Math.min(34, 10 + run / 8);
      const bx = p.x - dirX * swing, by = p.y + 6 - dirY * swing * 0.6 + (run < 20 ? 12 : 0);
      const ready = run >= 120 && time - lastCrack >= 1200;
      g.lineStyle(1, 0xc8b088, 0.9); g.lineBetween(p.x, p.y + 2, bx, by - 6);
      g.fillStyle(ready ? 0xf0d88a : 0xc9a44a, 1); g.fillTriangle(bx - 5, by - 6, bx + 5, by - 6, bx, by + 6);
      g.fillStyle(0x7a5e22, 1); g.fillRect(bx - 5, by - 8, 10, 2);
      if (ready) { g.lineStyle(1.5, 0xf0d88a, 0.4 + Math.sin(time / 90) * 0.2); g.strokeCircle(bx, by, 9); }
      if (crack && time - crack.at < 420) {
        const q = (time - crack.at) / 420;
        g.lineStyle(3 - q * 2, crack.hit ? 0xf0d88a : 0xc8b088, 1 - q);
        g.lineBetween(p.x, p.y, crack.x, crack.y);
        g.strokeCircle(crack.x, crack.y, 10 + q * 30);
      }
    },
  };
};

// ── Charm: Tithe-Stone Pendant ───────────────────────────────────────

/**
 * A pendant like a little Tithe Scale, its one pan hanging off your collarbone. Every hit you take
 * drops a tithe-stone into it (five at most). The next hit you land pays the whole debt forward: 4
 * damage per stone, and the pan is empty again. Take the hits; pay them back all at once.
 */
const tithePendant: ItemScriptFactory = (ctx) => {
  let stones = 0;
  let paidAt = -9999, paid = 0;
  return {
    onHitTaken() {
      if (!alive(ctx, 'player') || stones >= 5) return;
      stones++;
      if (stones === 5) ctx.float(ctx.player.x, ctx.player.y - 52, 'TITHE FULL', '#c9a44a');
    },
    onHitDealt() {
      if (stones <= 0 || !alive(ctx, 'npc')) return;
      paid = stones * 4;
      ctx.hit(ctx.npc, paid, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 46, `TITHE PAID ${paid}`, '#f0d88a');
      ctx.sfx(stones >= 4 ? 'stone-slam' : 'rock-throw');
      paidAt = ctx.scene.time.now;
      stones = 0;
    },
    drawAir(g, time) {
      const p = ctx.player;
      const px = p.x + 16, py = p.y - 6;
      g.lineStyle(1, 0xc9a44a, 1); g.lineBetween(px - 8, py - 12, px, py - 4); g.lineBetween(px + 8, py - 12, px, py - 4);
      g.fillStyle(0x7a5e22, 1); g.fillEllipse(px, py, 18, 6);
      g.fillStyle(0xc9a44a, 1); g.fillEllipse(px, py - 1, 16, 4);
      for (let i = 0; i < stones; i++) {
        g.fillStyle(0x3a3634, 1); g.fillRect(px - 7 + (i % 3) * 5, py - 5 - Math.floor(i / 3) * 4, 4, 4);
      }
      if (time - paidAt < 500) {
        const q = (time - paidAt) / 500;
        const n = Math.max(1, Math.round(paid / 4));
        for (let i = 0; i < n; i++) {
          const tx = px + (ctx.npc.x - px) * q + (i - n / 2) * 6, ty = py + (ctx.npc.y - py) * q - Math.sin(q * Math.PI) * 40;
          g.fillStyle(0x3a3634, 1 - q * 0.5); g.fillRect(tx - 2.5, ty - 2.5, 5, 5);
        }
      }
    },
  };
};

// ── Charm: Feather & Wedge ───────────────────────────────────────────

/**
 * A pair of iron feathers and a wedge — the stonecutter's way to split a block along a line. Each
 * hit you land drives the wedge in from the side you struck from. Keep striking from the same side
 * (within 40° of the first, and within 2.5s of the last) and it goes deeper; the fourth splits the
 * foe along the grain for 22. Strike from anywhere else and you start a new line.
 */
const featherWedge: ItemScriptFactory = (ctx) => {
  let depth = 0;
  let angle = 0;
  let last = -9999;
  let splitAt = -9999, splitAngle = 0;
  return {
    update(time) {
      if (depth > 0 && time - last > 2500) depth = 0;
    },
    onHitDealt() {
      if (!alive(ctx, 'npc')) return;
      const now = ctx.scene.time.now;
      const a = Math.atan2(ctx.npc.y - ctx.player.y, ctx.npc.x - ctx.player.x);
      if (depth === 0 || now - last > 2500 || angDiff(a, angle) > 0.7) { depth = 1; angle = a; }
      else depth++;
      last = now;
      if (depth >= 4) {
        ctx.hit(ctx.npc, 22, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 50, 'SPLIT ALONG THE GRAIN 22', '#e0c898');
        ctx.flash(ctx.npc.x, ctx.npc.y, 0xe0c898);
        ctx.sfx('stone-slam');
        splitAt = now; splitAngle = angle;
        depth = 0;
      } else ctx.sfx('hammer-forge');
    },
    drawAir(g, time) {
      const n = ctx.npc;
      if (!alive(ctx, 'npc')) return;
      if (depth > 0) {
        // The wedges, driven into the foe on the side you are striking from.
        const sx = n.x - Math.cos(angle) * 22, sy = n.y - Math.sin(angle) * 22;
        const px = -Math.sin(angle), py = Math.cos(angle);
        for (let i = 0; i < depth; i++) {
          const o = (i - (depth - 1) / 2) * 8;
          const bx = sx + px * o, by = sy + py * o;
          const tx = bx + Math.cos(angle) * (6 + i * 2), ty = by + Math.sin(angle) * (6 + i * 2);
          g.fillStyle(0x6a6a70, 1); g.fillTriangle(bx + px * 3, by + py * 3, bx - px * 3, by - py * 3, tx, ty);
          g.fillStyle(0xa8a8b0, 1); g.fillTriangle(bx + px * 1.5, by + py * 1.5, bx - px * 1.5, by - py * 1.5, tx, ty);
        }
        if (depth >= 3) {
          g.lineStyle(1.5, 0x2a2018, 0.8);
          g.lineBetween(sx, sy, n.x + Math.cos(angle) * 6 + Math.sin(time / 60) * 1, n.y + Math.sin(angle) * 6);
        }
        // The line you must keep to, as a faint arc round the foe.
        g.lineStyle(1, 0xe0c898, 0.35);
        g.beginPath(); g.arc(n.x, n.y, 40, angle + Math.PI - 0.7, angle + Math.PI + 0.7, false); g.strokePath();
      }
      if (time - splitAt < 500) {
        const q = (time - splitAt) / 500;
        const px = -Math.sin(splitAngle), py = Math.cos(splitAngle);
        g.lineStyle(3 * (1 - q), 0xe0c898, 1 - q);
        g.lineBetween(n.x - Math.cos(splitAngle) * 40, n.y - Math.sin(splitAngle) * 40, n.x + Math.cos(splitAngle) * 40, n.y + Math.sin(splitAngle) * 40);
        for (const s of [-1, 1]) {
          g.fillStyle(0xc4a272, 1 - q);
          g.fillRect(n.x + px * s * (6 + q * 24) - 3, n.y + py * s * (6 + q * 24) - 3, 6, 6);
        }
      }
    },
  };
};

// ── Charm: Keystone ──────────────────────────────────────────────────

/**
 * A wedge-cut stone that keeps an arch. Every hit you land lays a voussoir over your head (one per
 * 0.5s). When five are laid, the keystone drops in and the arch stands for 5s: each hit you take
 * under it is shed onto the arch (up to 12 back, three hits). If the arch is still standing when the
 * 5s are up, it comes down forward onto the foe — 18 damage if they are within 140px of you.
 */
const keystone: ItemScriptFactory = (ctx) => {
  let laid = 0;
  let lastLay = -9999;
  let standUntil = -1, shed = 0;
  let fellAt = -9999, fellHit = false, fellX = 0, fellY = 0;
  return {
    update(time) {
      if (standUntil > 0 && time >= standUntil) {
        standUntil = -1;
        if (shed < 3 && alive(ctx, 'player')) {
          fellX = ctx.player.x; fellY = ctx.player.y;
          fellHit = alive(ctx, 'npc') && near(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y, 140);
          if (fellHit) {
            ctx.hit(ctx.npc, 18, ctx.npc.x, ctx.npc.y);
            ctx.float(ctx.npc.x, ctx.npc.y - 48, 'THE ARCH FALLS 18', '#e0c898');
          } else ctx.float(ctx.player.x, ctx.player.y - 56, 'arch falls', '#a89a7c');
          ctx.sfx('quake');
          fellAt = time;
        }
        shed = 0;
      }
    },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (standUntil > 0 || now - lastLay < 500 || !alive(ctx, 'player')) return;
      lastLay = now;
      laid++;
      if (laid >= 5) {
        laid = 0;
        standUntil = now + 5000;
        shed = 0;
        ctx.float(ctx.player.x, ctx.player.y - 60, 'KEYSTONE IN', '#f0d88a');
        ctx.sfx('stone-rise');
      }
    },
    onHitTaken(amount) {
      if (standUntil < 0 || shed >= 3 || !alive(ctx, 'player')) return;
      const back = Math.min(12, Math.max(1, Math.round(amount)));
      ctx.heal(ctx.player, back);
      shed++;
      ctx.float(ctx.player.x, ctx.player.y - 56, `THE ARCH TAKES IT +${back}`, '#d8ccb0');
      ctx.sfx('shield-block');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const cx = p.x, cy = p.y - 30, R = 30;
      const standing = standUntil > 0;
      const n = standing ? 5 : laid;
      for (let i = 0; i < n; i++) {
        // Voussoirs go up from both springings toward the crown, alternating sides.
        const k = i === 4 ? 2 : [0, 4, 1, 3][i];
        const a = Math.PI + (k / 4) * Math.PI;
        const crack = standing && i < shed;
        g.fillStyle(crack ? 0x8a6c46 : 0xc4a272, 1); g.fillCircle(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.8, k === 2 ? 6 : 5);
        g.fillStyle(0xe0c898, 0.8); g.fillCircle(cx + Math.cos(a) * R - 1, cy + Math.sin(a) * R * 0.8 - 1.5, 2);
      }
      if (standing) {
        const left = (standUntil - time) / 5000;
        g.lineStyle(2, 0xf0d88a, 0.3 + left * 0.4);
        g.beginPath(); g.arc(cx, cy, R + 6, Math.PI, Math.PI + Math.PI * left, false); g.strokePath();
      }
      if (time - fellAt < 500) {
        const q = (time - fellAt) / 500;
        for (let i = 0; i < 5; i++) {
          const a = Math.PI + (i / 4) * Math.PI;
          const tx = fellHit ? ctx.npc.x : fellX + Math.cos(a) * R;
          const ty = fellHit ? ctx.npc.y : fellY + 10;
          const sx = fellX + Math.cos(a) * R, sy = fellY - 30 + Math.sin(a) * R * 0.8;
          g.fillStyle(0xc4a272, 1 - q); g.fillCircle(sx + (tx - sx) * q, sy + (ty - sy) * q, 5);
        }
      }
    },
  };
};

// ── Tackle charm: Sounding Lead ──────────────────────────────────────

/**
 * A lead on a marked line, the kind boatmen use to sound the depth. Every 2.5s it sounds the
 * distance to the foe. DEEP (over 280px away): for 2.5s your hits add +5. SHALLOW (within 120px):
 * for 2.5s each hit you take is blunted by 4. Anything between reads "mark" and does nothing.
 */
const soundingLead: ItemScriptFactory = (ctx) => {
  let next = -1;
  let reading: 'deep' | 'shallow' | 'mark' = 'mark';
  let until = 0;
  let soundedAt = -9999;
  return {
    update(time) {
      if (next < 0) next = time + 2500;
      if (time < next || !alive(ctx, 'player') || !alive(ctx, 'npc')) return;
      next = time + 2500;
      const d = Math.hypot(ctx.npc.x - ctx.player.x, ctx.npc.y - ctx.player.y);
      reading = d > 280 ? 'deep' : d < 120 ? 'shallow' : 'mark';
      until = time + 2500;
      soundedAt = time;
      if (reading !== 'mark') {
        ctx.float(ctx.player.x, ctx.player.y - 54, reading === 'deep' ? 'BY THE DEEP' : 'SHALLOWS', reading === 'deep' ? '#8ab8c8' : '#e0d0a8');
        ctx.sfx('bubble');
      }
    },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (reading !== 'deep' || now > until || !alive(ctx, 'npc')) return;
      ctx.hit(ctx.npc, 5, ctx.npc.x, ctx.npc.y);
    },
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (reading !== 'shallow' || now > until || !alive(ctx, 'player')) return;
      ctx.heal(ctx.player, Math.min(4, Math.max(1, Math.round(amount))));
    },
    drawGround(g, time) {
      if (!alive(ctx, 'npc')) return;
      const p = ctx.player, n = ctx.npc;
      const q = Math.min(1, (time - soundedAt) / 400);
      if (q < 1) {
        // The line paying out toward the foe, with its depth-marks.
        const ex = p.x + (n.x - p.x) * q, ey = p.y + (n.y - p.y) * q;
        g.lineStyle(1, 0xc8b088, 0.8); g.lineBetween(p.x, p.y, ex, ey);
        for (let k = 1; k < 6; k++) { const t = k / 6; if (t > q) break; g.fillStyle(0x9a2a1a, 1); g.fillCircle(p.x + (n.x - p.x) * t, p.y + (n.y - p.y) * t, 1.5); }
        g.fillStyle(0x6a6c74, 1); g.fillCircle(ex, ey, 4);
      }
      if (time < until && reading !== 'mark') {
        g.lineStyle(2, reading === 'deep' ? 0x8ab8c8 : 0xe0d0a8, 0.3 + Math.sin(time / 120) * 0.1);
        g.strokeCircle(p.x, p.y + 10, reading === 'deep' ? 26 : 20);
      }
    },
  };
};

// ── Tackle charm: Ratchet Reel ───────────────────────────────────────

/**
 * A brass reel with a five-tooth ratchet. Each ability you cast clicks it on a tooth. On the fifth
 * click the spring lets go and the reel spins back: every different ability among those five has
 * 1s taken off its cooldown. Mixing your kit pays; spamming one button pays one second.
 */
const ratchetReel: ItemScriptFactory = (ctx) => {
  const clicks: string[] = [];
  let spunAt = -9999;
  return {
    onCast(abilityId) {
      clicks.push(abilityId);
      ctx.sfx('gear-turn');
      if (clicks.length < 5) return;
      const distinct = [...new Set(clicks)];
      for (const id of distinct) ctx.refund(id, 1000);
      ctx.float(ctx.player.x, ctx.player.y - 56, `REEL SPINS BACK ×${distinct.length}`, '#f0d88a');
      ctx.sfx('snap-back');
      clicks.length = 0;
      spunAt = ctx.scene.time.now;
    },
    drawGround(g, time) {
      const p = ctx.player;
      const rx = p.x - 22, ry = p.y + 14;
      const spin = time - spunAt < 600 ? (time - spunAt) / 40 : 0;
      g.fillStyle(0x7a5e22, 1); g.fillCircle(rx, ry, 8);
      g.fillStyle(0xc9a44a, 1); g.fillCircle(rx, ry, 6.5);
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k / 5) * Math.PI * 2 + spin;
        g.fillStyle(k < clicks.length ? 0xf0d88a : 0x7a5e22, 1);
        g.fillCircle(rx + Math.cos(a) * 9.5, ry + Math.sin(a) * 9.5, 2);
      }
      g.lineStyle(1.5, 0x3a3a3e, 1);
      const pa = -Math.PI / 2 + (clicks.length / 5) * Math.PI * 2 + spin;
      g.lineBetween(rx, ry, rx + Math.cos(pa) * 6, ry + Math.sin(pa) * 6);
    },
  };
};

// ── Quest reward: The Book of Marks ──────────────────────────────────

/**
 * A slate leaf cut with the first page of Ruth Ashlar's book: every name she wrote down. It counts.
 * Every hit you take is tallied; on the fifth, the page is read out — you get back a quarter of what
 * those five hits dealt (max 25), and the foe takes the same. Then it counts again.
 */
const bookOfMarks: ItemScriptFactory = (ctx) => {
  const tally: number[] = [];
  let readAt = -9999, readFor = 0;
  return {
    onHitTaken(amount) {
      if (!alive(ctx, 'player')) return;
      tally.push(Math.max(1, amount));
      if (tally.length < 5) return;
      const sum = tally.reduce((a, b) => a + b, 0);
      const back = Math.min(25, Math.max(4, Math.round(sum * 0.25)));
      ctx.heal(ctx.player, back);
      if (alive(ctx, 'npc')) ctx.hit(ctx.npc, back, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.player.x, ctx.player.y - 58, `COUNTED: +${back}`, '#d8d0f0');
      ctx.sfx('judgement');
      tally.length = 0;
      readAt = ctx.scene.time.now; readFor = back;
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x0 = p.x - 10, y0 = p.y - 46;
      // Tally marks: four strokes, the fifth struck through.
      for (let i = 0; i < tally.length; i++) {
        g.lineStyle(2, 0xd8d0f0, 0.9); g.lineBetween(x0 + i * 5, y0, x0 + i * 5, y0 + 9);
      }
      if (time - readAt < 600) {
        const q = (time - readAt) / 600;
        g.lineStyle(2.5, 0xd8d0f0, 1 - q); g.lineBetween(x0 - 3, y0 + 8, x0 + 22, y0);
        if (readFor > 0 && alive(ctx, 'npc')) {
          g.lineStyle(1.5, 0xd8d0f0, (1 - q) * 0.7);
          g.lineBetween(p.x, p.y - 30, p.x + (ctx.npc.x - p.x) * q, p.y - 30 + (ctx.npc.y - p.y + 30) * q);
        }
      }
    },
  };
};

// ── Meals ────────────────────────────────────────────────────────────

/** Slit-Loaf: within 90px of the arena's edge you regenerate 2 health/s (30 a fight). */
const slitLoaf: ItemScriptFactory = (ctx) => {
  let pool = 30, acc = 0, lastFloat = -9999;
  const atWall = (): boolean => {
    const p = ctx.player;
    return p.x < 130 || p.x > ctx.W - 130 || p.y < 186 || p.y > ctx.H - 130;
  };
  return {
    update(time, dt) {
      if (pool <= 0 || !alive(ctx, 'player') || !atWall() || ctx.player.hp >= ctx.player.maxHp) return;
      acc += 2 * dt;
      if (acc >= 1) {
        const n = Math.min(pool, Math.floor(acc));
        acc -= n; pool -= n;
        ctx.heal(ctx.player, n);
        if (time - lastFloat > 2000) { ctx.float(ctx.player.x, ctx.player.y - 50, 'BACK TO THE WALL', '#e0c898'); lastFloat = time; }
      }
    },
    drawGround(g, time) {
      if (pool <= 0 || !atWall()) return;
      g.lineStyle(1.5, 0xe0c898, 0.3 + Math.sin(time / 200) * 0.1); g.strokeEllipse(ctx.player.x, ctx.player.y + 14, 40, 12);
    },
  };
};

/** Slit-Pie: each of the first 4 hits you take is capped at 12 — the excess comes back (max 20 each). */
const slitPie: ItemScriptFactory = (ctx) => {
  let left = 4;
  return {
    onHitTaken(amount) {
      if (left <= 0 || amount <= 12 || !alive(ctx, 'player')) return;
      left--;
      const back = Math.min(20, Math.round(amount - 12));
      ctx.heal(ctx.player, back);
      ctx.float(ctx.player.x, ctx.player.y - 52, `TOO HARD TO BREAK +${back}`, '#d8a868');
      ctx.sfx('shield-block');
    },
  };
};

/** Mackerel on the Stone: every third hit you land strikes a spark for +7. */
const mackerelStone: ItemScriptFactory = (ctx) => {
  let count = 0, sparkAt = -9999;
  return {
    onHitDealt() {
      if (!alive(ctx, 'npc')) return;
      count++;
      if (count % 3 !== 0) return;
      ctx.hit(ctx.npc, 7, ctx.npc.x, ctx.npc.y);
      ctx.sfx('zap');
      sparkAt = ctx.scene.time.now;
    },
    drawAir(g, time) {
      if (time - sparkAt > 300 || !alive(ctx, 'npc')) return;
      const q = (time - sparkAt) / 300;
      for (let k = 0; k < 6; k++) {
        const a = k * 1.05 + q;
        g.lineStyle(1.5, 0xfff0b0, 1 - q);
        g.lineBetween(ctx.npc.x + Math.cos(a) * 8, ctx.npc.y + Math.sin(a) * 8, ctx.npc.x + Math.cos(a) * (14 + q * 20), ctx.npc.y + Math.sin(a) * (14 + q * 20));
      }
    },
  };
};

/** Hearth-Roast Grouper: the first time you drop under 50%, you heal 3/s for 6s. */
const grouperRoast: ItemScriptFactory = (ctx) => {
  let lit = -1, used = false, acc = 0;
  return {
    update(time, dt) {
      const p = ctx.player;
      if (!alive(ctx, 'player')) return;
      if (!used && p.hp < p.maxHp * 0.5) {
        used = true; lit = time;
        ctx.float(p.x, p.y - 54, 'THE HEARTH WARMS YOU', '#ffa850');
        ctx.sfx('heal');
      }
      if (lit > 0 && time - lit < 6000) {
        acc += 3 * dt;
        if (acc >= 1) { const n = Math.floor(acc); acc -= n; ctx.heal(p, n); }
      }
    },
    drawGround(g, time) {
      if (lit < 0 || time - lit > 6000) return;
      const p = ctx.player;
      g.fillStyle(0xff7a2a, 0.12 + Math.sin(time / 140) * 0.04); g.fillEllipse(p.x, p.y + 12, 54, 18);
    },
  };
};

/**
 * Sole in a Salt Crust: the crust soaks the first 24 damage you take (it comes back as you take
 * it), then cracks — shards fly at the foe for 10 if they are within 150px.
 */
const saltSole: ItemScriptFactory = (ctx) => {
  let crust = 24, crackedAt = -9999;
  return {
    onHitTaken(amount) {
      if (crust <= 0 || !alive(ctx, 'player')) return;
      const soak = Math.min(crust, Math.max(1, Math.round(amount)));
      crust -= soak;
      ctx.heal(ctx.player, soak);
      if (crust <= 0) {
        crackedAt = ctx.scene.time.now;
        ctx.float(ctx.player.x, ctx.player.y - 54, 'THE CRUST CRACKS', '#f0f0e8');
        ctx.sfx('crystal-shatter');
        if (alive(ctx, 'npc') && near(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y, 150)) ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y);
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (crust > 0) {
        g.lineStyle(2, 0xf0f0e8, 0.25 + (crust / 24) * 0.4); g.strokeCircle(p.x, p.y, 26);
        return;
      }
      if (time - crackedAt < 450) {
        const q = (time - crackedAt) / 450;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          g.fillStyle(0xf0f0e8, 1 - q); g.fillRect(p.x + Math.cos(a) * (26 + q * 50) - 2, p.y + Math.sin(a) * (26 + q * 50) - 2, 4, 4);
        }
      }
    },
  };
};

// ── Item list ────────────────────────────────────────────────────────

export const PORT_ITEMS: IsleItemDef[] = [
  // The Chock & Chisel
  {
    id: 'charm-quarrymouth-plumb-bob', name: 'Plumb Bob', emoji: '🔻', kind: 'charm', price: 270, isle: 'earth',
    flavor: 'A brass bob on a waxed cord, the kind Ruth hangs to see if a wall is true. It wants to swing.',
    script: 'charm-quarrymouth-plumb-bob',
    scriptText: [
      'Run and the bob swings out behind you. Double back sharply after 120px of run and it cracks out ahead:',
      '8 damage (+1 per 40px more run, max 16) to a foe within 110px of it. Once per 1.2s.',
    ],
  },
  {
    id: 'charm-quarrymouth-tithe-pendant', name: 'Tithe-Stone Pendant', emoji: '⚖️', kind: 'charm', price: 390, isle: 'earth',
    flavor: 'A Tithe Scale the size of a thumb, one pan only. Mags says it is satire. The Regent\'s men buy them.',
    script: 'charm-quarrymouth-tithe-pendant', effect: { maxHp: 6 },
    scriptText: ['Each hit you take drops a tithe-stone in the pan (max 5). Your next landed hit pays them all: +4 per stone.'],
  },
  {
    id: 'charm-quarrymouth-feather-wedge', name: 'Feather & Wedge', emoji: '🪓', kind: 'charm', price: 560, isle: 'earth',
    flavor: 'Two iron feathers and a wedge, worn bright. Find the grain, keep to it, and any stone will open.',
    script: 'charm-quarrymouth-feather-wedge',
    scriptText: [
      'Hits drive a wedge in from the side you strike from. Keep to that side (within 40°, 2.5s apart)',
      'and the fourth hit splits the foe for 22. Strike from elsewhere and you start a new line.',
    ],
  },
  {
    id: 'charm-quarrymouth-keystone', name: 'Keystone', emoji: '🏛️', kind: 'charm', price: 820, isle: 'earth',
    flavor: 'The crown stone of an arch the Regent pulled down. Mags kept it. It still wants to hold something up.',
    script: 'charm-quarrymouth-keystone', effect: { damageTakenMult: 0.97 },
    scriptText: [
      'Landed hits lay voussoirs over you (one per 0.5s). At five the keystone drops: for 5s the arch sheds',
      'up to 3 hits (up to 12 back each). If it still stands at the end, it falls on a foe within 140px: 18.',
    ],
  },
  // Lode & Line
  {
    id: 'charm-quarrymouth-sounding-lead', name: 'Sounding Lead', emoji: '🪢', kind: 'charm', price: 340, isle: 'earth',
    flavor: 'A boatman\'s lead on a line marked in red rag every fathom. Silas sounds the Drowned Pit with it daily.',
    script: 'charm-quarrymouth-sounding-lead',
    scriptText: [
      'Every 2.5s it sounds the distance to the foe. Over 280px: DEEP, your hits add +5 for 2.5s.',
      'Within 120px: SHALLOWS, each hit taken is blunted by 4 for 2.5s.',
    ],
  },
  {
    id: 'charm-quarrymouth-ratchet-reel', name: 'Ratchet Reel', emoji: '🧭', kind: 'charm', price: 480, isle: 'earth',
    flavor: 'A brass reel with a five-tooth ratchet and a spring that will take your thumb off. Lovely action.',
    script: 'charm-quarrymouth-ratchet-reel',
    scriptText: ['Each cast clicks the ratchet. On the fifth, every different ability among those five gets 1s off its cooldown.'],
  },
  // Quest reward
  {
    id: 'charm-quarrymouth-book-of-marks', name: 'The Book of Marks', emoji: '📕', kind: 'charm', isle: 'earth',
    flavor: 'A slate leaf cut with the first page of Ruth Ashlar\'s book. Every name she wrote. It counts.',
    script: 'charm-quarrymouth-book-of-marks', effect: { maxHp: 8 },
    scriptText: ['Tallies the hits you take. On the fifth: heal a quarter of those five (max 25), and the foe takes the same.'],
  },
  // Counter food
  {
    id: 'food-quarrymouth-hardtack', name: 'Quarryman\'s Hardtack', emoji: '🍪', kind: 'food', price: 40, sell: 10, isle: 'earth',
    flavor: 'A biscuit you break with a mallet and soak in tea for an hour. The quarries run on it. So do the teeth.',
    effect: { shieldHp: 12 },
  },
  {
    id: 'food-quarrymouth-dustcutter', name: 'Dust-Cutter', emoji: '🍵', kind: 'food', price: 55, sell: 14, isle: 'earth',
    flavor: 'A mint-and-honey tea for throats full of stone-dust. Every cutter on the Rim carries a flask of it.',
    effect: { regenPerSecond: 0.25, cooldownMult: 0.98 },
  },
  // The Hearthstone's meals
  {
    id: 'meal-quarrymouth-slit-loaf', name: 'Slit-Loaf', emoji: '🥖', kind: 'food', sell: 14, isle: 'earth',
    flavor: 'Bream baked in a loaf two fingers wide, so it will go through a cell door. Eaten with your back to a wall.',
    script: 'meal-quarrymouth-slit-loaf', effect: { maxHp: 7 },
    scriptText: ['Next fight: within 90px of the arena\'s edge you regenerate 2 health/s (30 in all).'],
  },
  {
    id: 'meal-quarrymouth-slit-pie', name: 'Slit-Pie', emoji: '🥧', kind: 'food', sell: 22, isle: 'earth',
    flavor: 'Bream and crab baked flat and hard on the hearthstone. Too hard to break. Too good to take.',
    script: 'meal-quarrymouth-slit-pie', effect: { shieldHp: 8 },
    scriptText: ['Next fight: each of the first 4 hits over 12 you take is capped at 12 — the rest comes back (max 20).'],
  },
  {
    id: 'meal-quarrymouth-mackerel-stone', name: 'Mackerel on the Stone', emoji: '🐟', kind: 'food', sell: 26, isle: 'earth',
    flavor: 'Two flint mackerel split and laid on the hot stone till the skins crackle. Children swear they spark.',
    script: 'meal-quarrymouth-mackerel-stone', effect: { critChance: 0.02 },
    scriptText: ['Next fight: every third hit you land strikes a spark for +7.'],
  },
  {
    id: 'meal-quarrymouth-grouper-roast', name: 'Hearth-Roast Grouper', emoji: '🍖', kind: 'food', sell: 40, isle: 'earth',
    flavor: 'Granite grouper roasted whole with a Stonehold pebble-dace stuffing. Feeds a crane gang. Or you.',
    script: 'meal-quarrymouth-grouper-roast', effect: { maxHp: 10 },
    scriptText: ['Next fight: the first time you drop under 50% health, you heal 3/s for 6s.'],
  },
  {
    id: 'meal-quarrymouth-salt-sole', name: 'Sole in a Salt Crust', emoji: '🧂', kind: 'food', sell: 44, isle: 'earth',
    flavor: 'Slate sole and a Dunesea eel baked in a shell of salt you crack with the back of a spoon.',
    script: 'meal-quarrymouth-salt-sole', effect: { damageTakenMult: 0.98 },
    scriptText: ['Next fight: the crust soaks the first 24 damage you take, then cracks — 10 to a foe within 150px.'],
  },
];

export const PORT_SCRIPTS: Record<string, ItemScriptFactory> = {
  'charm-quarrymouth-plumb-bob': plumbBob,
  'charm-quarrymouth-tithe-pendant': tithePendant,
  'charm-quarrymouth-feather-wedge': featherWedge,
  'charm-quarrymouth-keystone': keystone,
  'charm-quarrymouth-sounding-lead': soundingLead,
  'charm-quarrymouth-ratchet-reel': ratchetReel,
  'charm-quarrymouth-book-of-marks': bookOfMarks,
  'meal-quarrymouth-slit-loaf': slitLoaf,
  'meal-quarrymouth-slit-pie': slitPie,
  'meal-quarrymouth-mackerel-stone': mackerelStone,
  'meal-quarrymouth-grouper-roast': grouperRoast,
  'meal-quarrymouth-salt-sole': saltSole,
};

export const PORT_SHOPS: ShopDef[] = [
  {
    id: 'quarrymouth-store', name: 'The Chock & Chisel', buys: true,
    stock: [
      'charm-quarrymouth-plumb-bob', 'charm-quarrymouth-tithe-pendant', 'charm-quarrymouth-feather-wedge', 'charm-quarrymouth-keystone',
      'food-quarrymouth-hardtack', 'food-quarrymouth-dustcutter',
    ],
  },
  {
    id: 'quarrymouth-tackle', name: 'Lode & Line', buys: true,
    stock: ['rod-delver', 'rod-iron', 'rod-driftwood', 'charm-quarrymouth-sounding-lead', 'charm-quarrymouth-ratchet-reel'],
  },
];

export const PORT_BAKERIES: BakeryDef[] = [
  {
    id: 'quarrymouth-bakery', name: 'The Hearthstone',
    recipes: [
      {
        id: 'recipe-quarrymouth-slit-loaf', name: 'Slit-Loaf', coins: 12, output: 'meal-quarrymouth-slit-loaf', makes: 2,
        inputs: [{ item: 'fish-quarry-bream', count: 3 }],
      },
      {
        id: 'recipe-quarrymouth-slit-pie', name: 'Slit-Pie', coins: 16, output: 'meal-quarrymouth-slit-pie',
        inputs: [{ item: 'fish-quarry-bream', count: 2 }, { item: 'fish-cliff-crab', count: 1 }],
      },
      {
        id: 'recipe-quarrymouth-mackerel-stone', name: 'Mackerel on the Stone', coins: 22, output: 'meal-quarrymouth-mackerel-stone',
        inputs: [{ item: 'fish-flint-mackerel', count: 2 }],
      },
      {
        id: 'recipe-quarrymouth-grouper-roast', name: 'Hearth-Roast Grouper', coins: 34, output: 'meal-quarrymouth-grouper-roast',
        inputs: [{ item: 'fish-granite-grouper', count: 1 }, { item: 'fish-pebble-dace', count: 1 }],
      },
      {
        id: 'recipe-quarrymouth-salt-sole', name: 'Sole in a Salt Crust', coins: 38, output: 'meal-quarrymouth-salt-sole',
        inputs: [{ item: 'fish-slate-sole', count: 1 }, { item: 'fish-dune-eel', count: 1 }],
      },
    ],
  },
];
