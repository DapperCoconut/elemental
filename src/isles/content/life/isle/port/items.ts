import type { BakeryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';

/**
 * Mossgate's goods: Tansy Knott's four charms, Ezra Reedbottom's two tackle charms, Agnes Tare's
 * honest pound (a quest reward, never sold), two counter foods, and the five meals the Crumb &
 * Thistle bakes.
 *
 * Every script keeps its own clock (scene `time`, never the frame `dt`), draws what it is doing on
 * the fighter it belongs to, and says so out loud when it fires. Brandmark's charms were about fire
 * and timing, the Drowned Reach's about the sea's habits; these are about a garden's — moss that
 * only grows on one side of you, seeds that come up later, bees that need two flowers, and scales
 * that will not stay tipped.
 */

const near = (ax: number, ay: number, bx: number, by: number, r: number): boolean =>
  (ax - bx) * (ax - bx) + (ay - by) * (ay - by) <= r * r;

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

// ── Charm: North-Side Moss ───────────────────────────────────────────

/**
 * Moss only grows on the north side of things — every Mossgate child knows it. Three tufts grow on
 * your north side. A hit you take while the foe stands north of you (above you on screen) lands in
 * the moss: 40% of it comes back (up to 10) and a tuft is crushed. Tufts regrow one every three
 * seconds. Keep the foe above you and the moss takes the blows; let them round you and it does not.
 */
const northMoss: ItemScriptFactory = (ctx) => {
  const REGROW = 3000;
  let tufts = 3;
  let lastGrow = -1;
  let squashAt = -9999;
  const foeNorth = (): boolean => alive(ctx, 'npc') && ctx.npc.y < ctx.player.y - 24;
  return {
    update(time) {
      if (lastGrow < 0) lastGrow = time;
      if (tufts < 3 && time - lastGrow >= REGROW) { tufts++; lastGrow = time; }
      if (tufts >= 3) lastGrow = time;
    },
    onHitTaken(amount) {
      if (tufts <= 0 || !alive(ctx, 'player') || !foeNorth()) return;
      const back = Math.min(10, Math.max(1, Math.round(amount * 0.4)));
      ctx.heal(ctx.player, back);
      tufts--;
      squashAt = ctx.scene.time.now;
      ctx.sfx('spore');
      ctx.float(ctx.player.x, ctx.player.y - 50, `INTO THE MOSS +${back}`, '#9ad06a');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const north = foeNorth();
      // Three tufts on the crown of your head, brighter while the foe is to the north.
      for (let i = 0; i < 3; i++) {
        const x = p.x - 12 + i * 12, y = p.y - 34 - (i === 1 ? 3 : 0);
        if (i >= tufts) { g.fillStyle(0x3a4a26, 0.6); g.fillEllipse(x, y + 2, 8, 3); continue; }
        g.fillStyle(0x2e5222, 1); g.fillEllipse(x, y, 11, 7);
        g.fillStyle(north ? 0x9ad06a : 0x5e8e3a, 1); g.fillEllipse(x, y - 1.5, 9, 5);
        g.fillStyle(0xc8f0a0, north ? 0.8 : 0.3); g.fillCircle(x - 2, y - 3, 1.3);
      }
      if (north && tufts > 0) {
        g.lineStyle(1.5, 0x9ad06a, 0.35 + Math.sin(time / 180) * 0.1);
        g.beginPath(); g.arc(p.x, p.y, 34, -Math.PI * 0.85, -Math.PI * 0.15, false); g.strokePath();
      }
      if (time - squashAt < 500) {
        const q = (time - squashAt) / 500;
        for (let k = 0; k < 6; k++) {
          const a = -Math.PI / 2 + (k - 2.5) * 0.35;
          g.fillStyle(0x7aa848, 1 - q); g.fillCircle(p.x + Math.cos(a) * (14 + q * 26), p.y - 30 + Math.sin(a) * (6 + q * 18), 2);
        }
      }
    },
  };
};

// ── Charm: Seed Pouch ────────────────────────────────────────────────

/**
 * A pouch of the Empress's own hedge-seed, spilled as you swing. Every hit you land drops a seed at
 * the foe's feet (four in the ground at most, one every 0.8s). Three and a half seconds later it
 * comes up as a thorn rosette: 8 damage to the foe if they are still within 56px, and 5 health to
 * you if YOU are. Fight them where you have been fighting them, or stand on your own garden.
 */
const seedPouch: ItemScriptFactory = (ctx) => {
  const GROW = 3500;
  const seeds: { x: number; y: number; born: number; popped: number }[] = [];
  let lastDrop = -9999;
  return {
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (!alive(ctx, 'npc') || now - lastDrop < 800) return;
      if (seeds.filter((s) => s.popped < 0).length >= 4) return;
      lastDrop = now;
      seeds.push({ x: ctx.npc.x + (ctx.rng() - 0.5) * 20, y: ctx.npc.y + 14, born: now, popped: -1 });
    },
    update(time) {
      for (const s of seeds) {
        if (s.popped >= 0 || time - s.born < GROW) continue;
        s.popped = time;
        let said = false;
        if (alive(ctx, 'npc') && near(s.x, s.y, ctx.npc.x, ctx.npc.y + 14, 56)) {
          ctx.hit(ctx.npc, 8, s.x, s.y);
          ctx.float(s.x, s.y - 40, 'THORNS COME UP', '#c8e070');
          said = true;
        }
        if (alive(ctx, 'player') && near(s.x, s.y, ctx.player.x, ctx.player.y + 14, 56)) {
          ctx.heal(ctx.player, 5);
          if (!said) ctx.float(s.x, s.y - 40, 'it flowers +5', '#f0b8d8');
        }
        ctx.sfx('thorn');
      }
      for (let i = seeds.length - 1; i >= 0; i--) if (seeds[i].popped >= 0 && time - seeds[i].popped > 900) seeds.splice(i, 1);
    },
    drawGround(g, time) {
      for (const s of seeds) {
        if (s.popped < 0) {
          // A seed in a little scuff of soil, a sprout lengthening as it nears.
          const k = Math.min(1, (time - s.born) / GROW);
          g.fillStyle(0x2a2016, 0.6); g.fillEllipse(s.x, s.y, 16, 6);
          g.fillStyle(0x8a6a3a, 1); g.fillEllipse(s.x, s.y - 1, 5, 3.5);
          if (k > 0.3) {
            const h = (k - 0.3) / 0.7 * 12;
            g.lineStyle(1.5, 0x6aa040, 1); g.lineBetween(s.x, s.y - 1, s.x, s.y - 1 - h);
            g.fillStyle(0x8ac050, 1); g.fillEllipse(s.x - 3, s.y - 1 - h, 5, 2.5); g.fillEllipse(s.x + 3, s.y - 2 - h, 5, 2.5);
          }
          if (k > 0.8) { g.lineStyle(1, 0xc8e070, (k - 0.8) * 3); g.strokeCircle(s.x, s.y, 56); }
        } else {
          // The rosette: thorny stems bursting out, a pink bud in the middle, then withering.
          const q = Math.min(1, (time - s.popped) / 900);
          const r = 10 + Math.min(1, q * 3) * 26;
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2;
            g.lineStyle(2.5, 0x4a6a2a, 1 - q);
            g.lineBetween(s.x, s.y, s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.5);
            g.fillStyle(0xd8e0a0, 1 - q);
            g.fillTriangle(s.x + Math.cos(a) * r * 0.6 - 2, s.y + Math.sin(a) * r * 0.3, s.x + Math.cos(a) * r * 0.6 + 2, s.y + Math.sin(a) * r * 0.3, s.x + Math.cos(a + 0.3) * r * 0.7, s.y + Math.sin(a + 0.3) * r * 0.35 - 4);
          }
          g.fillStyle(0xe880b0, 1 - q); g.fillCircle(s.x, s.y - 3, 4);
        }
      }
    },
  };
};

// ── Charm: Honeybee Brooch ───────────────────────────────────────────

/**
 * A worker bee set in amber on a pin, and a live one that will not leave it. A bee that visits only
 * one flower carries nothing: cast a DIFFERENT ability from the last one you cast and she carries
 * pollen across. Three crossings in a row ripen a drop of honey; your next landed hit blooms for +16
 * and the honey heals you 6. Cast the same ability twice running and the pollen is shaken off.
 */
const honeybeeBrooch: ItemScriptFactory = (ctx) => {
  let lastSlot: string | null = null;
  let pollen = 0;
  let honey = false;
  let guard = false;
  let bloomAt = -9999;
  return {
    onCast(_id, slot) {
      if (!slot) return;
      if (lastSlot === null || honey) { lastSlot = slot; return; }
      if (slot === lastSlot) {
        if (pollen > 0) ctx.float(ctx.player.x, ctx.player.y - 46, 'pollen shaken off', '#c8b880');
        pollen = 0;
      } else {
        pollen++;
        if (pollen >= 3) {
          honey = true;
          ctx.sfx('sparkle');
          ctx.float(ctx.player.x, ctx.player.y - 48, 'HONEY IS READY', '#ffd860');
        }
      }
      lastSlot = slot;
    },
    onHitDealt() {
      if (!honey || guard || !alive(ctx, 'npc')) return;
      honey = false;
      pollen = 0;
      bloomAt = ctx.scene.time.now;
      guard = true;
      ctx.hit(ctx.npc, 16, ctx.npc.x, ctx.npc.y);
      guard = false;
      ctx.heal(ctx.player, 6);
      ctx.flash(ctx.npc.x, ctx.npc.y, 0xffd860);
      ctx.sfx('heal');
      ctx.float(ctx.npc.x, ctx.npc.y - 48, 'IN BLOOM!', '#ffd860');
    },
    drawAir(g, time) {
      const p = ctx.player;
      // The bee, circling, a little heavier with each crossing.
      const a = time / 260;
      const bx = p.x + Math.cos(a) * 26, by = p.y - 24 + Math.sin(a * 2) * 8;
      const flap = Math.sin(time / 30) > 0 ? 1 : 0.4;
      g.fillStyle(0xe8f4ff, 0.7); g.fillEllipse(bx - 2, by - 4, 6, 4 * flap); g.fillEllipse(bx + 2, by - 4, 6, 4 * flap);
      g.fillStyle(0x2a2010, 1); g.fillEllipse(bx, by, 9, 6);
      g.fillStyle(0xf0c030, 1); g.fillRect(bx - 2.5, by - 3, 2, 6); g.fillRect(bx + 1, by - 3, 2, 6);
      // Pollen sacs on her legs.
      for (let k = 0; k < pollen; k++) { g.fillStyle(0xffe070, 1); g.fillCircle(bx - 3 + k * 3, by + 4, 1.6); }
      if (honey) {
        const x = p.x - 26, y = p.y - 30;
        g.fillStyle(0xffc030, 0.2 + Math.sin(time / 140) * 0.08); g.fillCircle(x, y, 11);
        g.fillStyle(0xe8a020, 1); g.fillCircle(x, y + 1, 5); g.fillTriangle(x - 4, y - 1, x + 4, y - 1, x, y - 8);
        g.fillStyle(0xfff0b0, 1); g.fillCircle(x - 1.5, y - 1, 1.3);
      }
      if (time - bloomAt < 600 && alive(ctx, 'npc')) {
        const q = (time - bloomAt) / 600;
        for (let k = 0; k < 6; k++) {
          const pa = (k / 6) * Math.PI * 2 + q;
          g.fillStyle(0xffd860, 1 - q); g.fillEllipse(ctx.npc.x + Math.cos(pa) * (10 + q * 24), ctx.npc.y - 14 + Math.sin(pa) * (6 + q * 14), 9, 6);
        }
      }
    },
  };
};

// ── Charm: Scale Acorn ───────────────────────────────────────────────

/**
 * One of the Empress's brass tithe-acorns, stolen off the scales and filed honest. It keeps a
 * balance of what you have dealt against what you have taken, and it hates to be tipped. Fall 40
 * behind and the beam swings back your way: your next three hits each add 8. Get 40 ahead and it
 * swings back to protect what you have: the next hit you take is halved (up to 20 back). Either
 * way the balance is then reset to even.
 */
const scaleAcorn: ItemScriptFactory = (ctx) => {
  const TIP = 40;
  let balance = 0;
  let boosted = 0;
  let cushion = false;
  let guard = false;
  let tipAt = -9999;
  let tipDir = 0;
  return {
    onHitDealt(amount) {
      if (guard) return;
      if (boosted > 0 && alive(ctx, 'npc')) {
        boosted--;
        guard = true;
        ctx.hit(ctx.npc, 8, ctx.npc.x, ctx.npc.y);
        guard = false;
      }
      balance += amount;
      if (balance >= TIP && !cushion) {
        cushion = true;
        balance = 0;
        tipAt = ctx.scene.time.now; tipDir = 1;
        ctx.sfx('clang');
        ctx.float(ctx.player.x, ctx.player.y - 48, 'THE BEAM SWINGS BACK — guarded', '#e8d080');
      }
    },
    onHitTaken(amount) {
      if (cushion && alive(ctx, 'player')) {
        cushion = false;
        const back = Math.min(20, Math.round(amount / 2));
        if (back > 0) ctx.heal(ctx.player, back);
        ctx.float(ctx.player.x, ctx.player.y - 48, `weighed light +${back}`, '#e8d080');
        return;
      }
      balance -= amount;
      if (balance <= -TIP && boosted === 0) {
        boosted = 3;
        balance = 0;
        tipAt = ctx.scene.time.now; tipDir = -1;
        ctx.sfx('money');
        ctx.float(ctx.player.x, ctx.player.y - 48, 'THE BEAM SWINGS BACK — +8 x3', '#e8d080');
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x, y = p.y - 46;
      // A little balance over your head, tilted by how far the fight has tipped.
      const tilt = Math.max(-1, Math.min(1, balance / TIP)) * 0.45;
      const swing = time - tipAt < 700 ? Math.sin((time - tipAt) / 70) * 0.3 * (1 - (time - tipAt) / 700) * tipDir : 0;
      const ang = tilt + swing;
      const dx = Math.cos(ang) * 16, dy = Math.sin(ang) * 16;
      g.lineStyle(1.5, 0x7a6028, 1); g.lineBetween(x, y, x, y + 8);
      g.lineStyle(2, 0xc9a44a, 1); g.lineBetween(x - dx, y + dy, x + dx, y - dy);
      // Pans: left is yours (dealt), right is the Empress's (taken).
      for (const [px, py, col] of [[x - dx, y + dy, 0x9ad06a], [x + dx, y - dy, 0xc84a4a]] as [number, number, number][]) {
        g.lineStyle(1, 0x7a6028, 1); g.lineBetween(px, py, px - 3, py + 6); g.lineBetween(px, py, px + 3, py + 6);
        g.fillStyle(0xc9a44a, 1); g.fillEllipse(px, py + 6, 9, 3);
        g.fillStyle(col, 0.8); g.fillCircle(px, py + 4, 1.6);
      }
      if (cushion) { g.lineStyle(2, 0xe8d080, 0.5 + Math.sin(time / 160) * 0.2); g.strokeCircle(p.x, p.y, 30); }
      for (let k = 0; k < boosted; k++) { g.fillStyle(0xe8d080, 1); g.fillCircle(p.x - 8 + k * 8, p.y + 30, 2.4); }
    },
  };
};

// ── Charm: Briar Hook ────────────────────────────────────────────────

/**
 * A hook whittled from a bramble thorn, its barbs left on. A landed hit sets it in the foe (once
 * every 4s) and pays a line out between you for 2.5 seconds. If they pull away past 200px while
 * hooked, the barbs rip out: 10 damage. If they stay close, it is reeled in at the end for 4.
 * Hit, then back off and make them choose.
 */
const briarHook: ItemScriptFactory = (ctx) => {
  const HOLD = 2500;
  let setAt = -9999;
  let hooked = false;
  let ripAt = -9999;
  let ripX = 0, ripY = 0;
  return {
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (hooked || now - setAt < 4000 || !alive(ctx, 'npc')) return;
      hooked = true;
      setAt = now;
      ctx.sfx('trap-snap');
      ctx.float(ctx.npc.x, ctx.npc.y - 44, 'HOOKED', '#d8c080');
    },
    update(time) {
      if (!hooked) return;
      if (!alive(ctx, 'npc') || !alive(ctx, 'player')) { hooked = false; return; }
      const d = Math.hypot(ctx.npc.x - ctx.player.x, ctx.npc.y - ctx.player.y);
      if (d > 200) {
        hooked = false;
        ripAt = time; ripX = ctx.npc.x; ripY = ctx.npc.y;
        ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y);
        ctx.sfx('slash');
        ctx.float(ctx.npc.x, ctx.npc.y - 48, 'THE BARBS RIP', '#e87a5a');
      } else if (time - setAt >= HOLD) {
        hooked = false;
        ctx.hit(ctx.npc, 4, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 44, 'reeled', '#d8c080');
      }
    },
    drawGround(g, time) {
      if (hooked && alive(ctx, 'npc')) {
        const p = ctx.player, n = ctx.npc;
        const d = Math.hypot(n.x - p.x, n.y - p.y);
        const taut = Math.min(1, d / 200);
        const sag = (1 - taut) * 26;
        g.lineStyle(1.5, taut > 0.8 ? 0xe87a5a : 0xd8c080, 0.85);
        g.beginPath();
        for (let k = 0; k <= 12; k++) {
          const t = k / 12;
          const x = p.x + (n.x - p.x) * t, y = p.y - 10 + (n.y - p.y) * t + Math.sin(t * Math.PI) * sag;
          if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
        // Thorns along the line.
        for (let k = 1; k < 6; k++) {
          const t = k / 6;
          const x = p.x + (n.x - p.x) * t, y = p.y - 10 + (n.y - p.y) * t + Math.sin(t * Math.PI) * sag;
          g.fillStyle(0x5a6a2a, 1); g.fillTriangle(x - 2, y, x + 2, y, x, y - 4);
        }
        const left = 1 - (time - setAt) / HOLD;
        g.lineStyle(2, 0xd8c080, 0.6);
        g.beginPath(); g.arc(n.x, n.y - 10, 18, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      }
      if (time - ripAt < 500) {
        const q = (time - ripAt) / 500;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          g.fillStyle(0xe87a5a, 1 - q); g.fillTriangle(ripX + Math.cos(a) * q * 30, ripY - 10 + Math.sin(a) * q * 20, ripX + Math.cos(a) * q * 30 + 4, ripY - 10 + Math.sin(a) * q * 20, ripX + Math.cos(a) * q * 34, ripY - 14 + Math.sin(a) * q * 22);
        }
      }
    },
  };
};

// ── Charm: Thornback Barb ────────────────────────────────────────────

/**
 * The tail-thorn of a thornback ray, which strikes back when stepped on. Each hit you take raises
 * the barb for 1.6 seconds: your next landed hit inside that window drives it home for half of the
 * damage you just took (up to 16). The counter-puncher's charm — it pays you for answering at once.
 */
const thornbackBarb: ItemScriptFactory = (ctx) => {
  let raisedUntil = 0;
  let owed = 0;
  let guard = false;
  let strikeAt = -9999;
  return {
    onHitTaken(amount) {
      if (!alive(ctx, 'player')) return;
      owed = Math.min(16, Math.max(1, Math.round(amount * 0.5)));
      raisedUntil = ctx.scene.time.now + 1600;
    },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (guard || now > raisedUntil || owed <= 0 || !alive(ctx, 'npc')) return;
      guard = true;
      ctx.hit(ctx.npc, owed, ctx.npc.x, ctx.npc.y);
      guard = false;
      ctx.float(ctx.npc.x, ctx.npc.y - 46, `BARBED +${owed}`, '#e8a070');
      ctx.sfx('stab');
      owed = 0;
      raisedUntil = 0;
      strikeAt = now;
    },
    drawAir(g, time) {
      const p = ctx.player;
      const up = time < raisedUntil;
      const k = up ? (raisedUntil - time) / 1600 : 0;
      // The barb at your back: lies flat, then stands up glowing while it is owed.
      const x = p.x + 22, y = p.y + 4;
      const ang = up ? -Math.PI / 2 - 0.3 : -0.3;
      const ex = x + Math.cos(ang) * 16, ey = y + Math.sin(ang) * 16;
      g.lineStyle(3, 0x6a4a2a, 1); g.lineBetween(x, y, ex, ey);
      g.fillStyle(up ? 0xe8a070 : 0x8a6a4a, 1);
      g.fillTriangle(ex - 3, ey + 2, ex + 3, ey + 2, ex + Math.cos(ang) * 7, ey + Math.sin(ang) * 7);
      if (up) {
        g.lineStyle(1.5, 0xe8a070, 0.6 * k);
        g.beginPath(); g.arc(p.x, p.y, 28, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      if (time - strikeAt < 400 && alive(ctx, 'npc')) {
        const q = (time - strikeAt) / 400;
        g.lineStyle(2, 0xe8a070, 1 - q); g.strokeCircle(ctx.npc.x, ctx.npc.y - 10, 8 + q * 26);
      }
    },
  };
};

// ── Reward charm: The Honest Pound ───────────────────────────────────

/**
 * Agnes Tare's mother's pound-stone, which has never told a lie. It weighs your hits: it remembers
 * your last five, and any hit that comes in lighter than their average is topped up to it (up to
 * +12). Your worst blows weigh what your usual ones do — it rewards a rhythm, not a lucky swing.
 */
const honestPound: ItemScriptFactory = (ctx) => {
  const recent: number[] = [];
  let guard = false;
  let lastTop = { t: -9999, n: 0 };
  return {
    onHitDealt(amount) {
      if (guard) return;
      if (recent.length >= 3 && alive(ctx, 'npc')) {
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const short = Math.min(12, Math.round(avg - amount));
        if (short >= 1) {
          guard = true;
          ctx.hit(ctx.npc, short, ctx.npc.x, ctx.npc.y);
          guard = false;
          const now = ctx.scene.time.now;
          if (now - lastTop.t > 700) ctx.float(ctx.npc.x, ctx.npc.y - 44, `weighed true +${short}`, '#d8d0b8');
          lastTop = { t: now, n: short };
          amount += short;
        }
      }
      recent.push(amount);
      if (recent.length > 5) recent.shift();
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x - 26, y = p.y + 10;
      // The pound-stone hanging at your belt, five notches for the five remembered hits.
      g.lineStyle(1, 0x8a7a5a, 1); g.lineBetween(x, y - 14, x, y - 6);
      g.fillStyle(0x5a5650, 1); g.fillRoundedRect(x - 7, y - 6, 14, 12, 4);
      g.fillStyle(0xa8a498, 1); g.fillRoundedRect(x - 6, y - 5, 12, 10, 3);
      for (let k = 0; k < 5; k++) { g.fillStyle(k < recent.length ? 0x3a3630 : 0x8a867a, 1); g.fillRect(x - 5 + k * 2.4, y - 1, 1.4, 4); }
      if (time - lastTop.t < 500) {
        const q = (time - lastTop.t) / 500;
        g.lineStyle(2, 0xd8d0b8, 1 - q); g.strokeRect(x - 8 - q * 6, y - 7 - q * 6, 16 + q * 12, 14 + q * 12);
      }
    },
  };
};

// ── Meals (one fight each) ───────────────────────────────────────────

/**
 * Thistle Hand-Pie — mullet in a crust crimped with thistle. The first four hits you take while the
 * foe is within 160px prick them back for 4 apiece. Eat it, then get close.
 */
const thistlePie: ItemScriptFactory = (ctx) => {
  let pricks = 4;
  let lastPrick = -9999;
  return {
    onHitTaken() {
      if (pricks <= 0 || !alive(ctx, 'npc') || !near(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y, 160)) return;
      pricks--;
      lastPrick = ctx.scene.time.now;
      ctx.hit(ctx.npc, 4, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 40, 'prickled', '#c8a0e0');
    },
    drawAir(g, time) {
      const p = ctx.player;
      for (let i = 0; i < pricks; i++) {
        const a = (i / 4) * Math.PI * 2 + time / 900;
        const x = p.x + Math.cos(a) * 22, y = p.y - 2 + Math.sin(a) * 12;
        g.fillStyle(0x6a4a8a, 1); g.fillCircle(x, y, 3.2);
        g.lineStyle(1, 0xc8a0e0, 1);
        for (let k = 0; k < 5; k++) { const b = (k / 5) * Math.PI - Math.PI; g.lineBetween(x, y, x + Math.cos(b) * 5, y + Math.sin(b) * 5); }
      }
      if (time - lastPrick < 300 && alive(ctx, 'npc')) {
        g.lineStyle(1.5, 0xc8a0e0, 1 - (time - lastPrick) / 300);
        g.lineBetween(p.x, p.y - 10, ctx.npc.x, ctx.npc.y - 10);
      }
    },
  };
};

/**
 * Bride-Pie — the wedding pie, baked to be shared. Two halves: under 60% health you eat the first
 * (10 health and +12% damage for 4s); under 30%, the second.
 */
const bridePie: ItemScriptFactory = (ctx) => {
  let halves = 2;
  let ateAt = -9999;
  return {
    update(time) {
      const p = ctx.player;
      if (!alive(ctx, 'player') || halves <= 0) return;
      const mark = halves === 2 ? 0.6 : 0.3;
      if (p.hp < p.maxHp * mark) {
        halves--;
        ateAt = time;
        ctx.heal(p, 10);
        ctx.boostDamage(1.12, 4000);
        ctx.sfx('heal');
        ctx.float(p.x, p.y - 46, halves === 1 ? 'half the pie — for the bride' : 'the other half — for the groom', '#f0d0a0');
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x + 26, y = p.y - 28;
      if (halves > 0) {
        g.fillStyle(0x8a5a2a, 1);
        g.slice(x, y, 8, halves === 2 ? 0 : Math.PI / 2, halves === 2 ? Math.PI * 2 : Math.PI * 1.5, false); g.fillPath();
        g.fillStyle(0xd8a060, 1);
        g.slice(x, y - 1, 6.5, halves === 2 ? 0 : Math.PI / 2, halves === 2 ? Math.PI * 2 : Math.PI * 1.5, false); g.fillPath();
        g.lineStyle(1, 0x8a5a2a, 1); g.lineBetween(x, y - 7, x, y + 7);
      }
      if (time - ateAt < 4000) {
        g.lineStyle(1.5, 0xf0d0a0, 0.5 * (1 - (time - ateAt) / 4000)); g.strokeCircle(p.x, p.y, 30);
      }
    },
  };
};

/**
 * Bog-Pike Pasty — kelp pike and Spore-bog loach, peat-black. You leave a mire behind you (your last
 * 2.5 seconds of steps); hits you land on the foe while they stand in it add 4.
 */
const bogPasty: ItemScriptFactory = (ctx) => {
  const trail: { x: number; y: number; t: number }[] = [];
  let guard = false;
  const inMire = (): boolean => alive(ctx, 'npc') && trail.some((s) => near(s.x, s.y, ctx.npc.x, ctx.npc.y + 14, 30));
  return {
    update(time) {
      const p = ctx.player;
      const last = trail[trail.length - 1];
      if (!last || Math.hypot(last.x - p.x, last.y - (p.y + 14)) > 14) trail.push({ x: p.x, y: p.y + 14, t: time });
      while (trail.length && time - trail[0].t > 2500) trail.shift();
    },
    onHitDealt() {
      if (guard || !inMire()) return;
      guard = true;
      ctx.hit(ctx.npc, 4, ctx.npc.x, ctx.npc.y);
      guard = false;
    },
    drawGround(g, time) {
      for (const s of trail) {
        const k = 1 - (time - s.t) / 2500;
        g.fillStyle(0x2a2418, 0.45 * k); g.fillEllipse(s.x, s.y, 24, 9);
        g.fillStyle(0x4a5a30, 0.3 * k); g.fillEllipse(s.x - 3, s.y - 1, 8, 2);
      }
      if (inMire()) {
        g.lineStyle(2, 0x6a7a3a, 0.6); g.strokeEllipse(ctx.npc.x, ctx.npc.y + 14, 40, 14);
        for (let k = 0; k < 3; k++) {
          const ph = ((time / 600) + k / 3) % 1;
          g.lineStyle(1, 0x8a9a5a, 1 - ph); g.strokeCircle(ctx.npc.x - 10 + k * 10, ctx.npc.y + 12 - ph * 6, 1 + ph * 3);
        }
      }
    },
  };
};

/**
 * Crab & Lily Bake — barnacle crab on a bed of lilypad perch. While you have stood still for 0.4s
 * you hunker into your shell: each hit taken is blunted by 5.
 */
const crabLilyBake: ItemScriptFactory = (ctx) => {
  let px = NaN, py = NaN;
  let stillSince = 0;
  let last = -1;
  const hunkered = (time: number): boolean => time - stillSince >= 400;
  return {
    update(time) {
      const p = ctx.player;
      if (last < 0 || isNaN(px)) { last = time; px = p.x; py = p.y; stillSince = time; return; }
      if (Math.hypot(p.x - px, p.y - py) > 1.5) stillSince = time;
      px = p.x; py = p.y; last = time;
    },
    onHitTaken(amount) {
      if (!alive(ctx, 'player') || !hunkered(ctx.scene.time.now)) return;
      const back = Math.min(5, amount - 1);
      if (back > 0) ctx.heal(ctx.player, back);
    },
    drawAir(g, time) {
      if (!hunkered(time)) return;
      const p = ctx.player;
      g.lineStyle(3, 0xc87a4a, 0.55); g.beginPath(); g.arc(p.x, p.y + 4, 28, Math.PI * 1.05, Math.PI * 1.95, false); g.strokePath();
      for (let k = 0; k < 5; k++) {
        const a = Math.PI * (1.15 + k * 0.17);
        g.fillStyle(0xe8e0d0, 0.8); g.fillCircle(p.x + Math.cos(a) * 28, p.y + 4 + Math.sin(a) * 28, 1.8);
      }
    },
  };
};

/**
 * Honey-Glazed Thornback — ray in Heartwood amber-carp glaze. Each ultimate (Q) you cast seals you
 * in amber for 2.5s: whatever you take inside it comes back when it cracks (up to 30).
 */
const honeyThornback: ItemScriptFactory = (ctx) => {
  let sealedUntil = 0;
  let stored = 0;
  return {
    onCast(_id, slot) {
      if (slot !== 'q') return;
      sealedUntil = ctx.scene.time.now + 2500;
      stored = 0;
      ctx.sfx('crystal-chime');
      ctx.float(ctx.player.x, ctx.player.y - 48, 'GLAZED IN AMBER', '#ffc050');
    },
    onHitTaken(amount) {
      if (ctx.scene.time.now < sealedUntil) stored += amount;
    },
    update(time) {
      if (sealedUntil > 0 && time >= sealedUntil) {
        sealedUntil = 0;
        const back = Math.min(30, stored);
        if (back > 0 && alive(ctx, 'player')) {
          ctx.heal(ctx.player, back);
          ctx.sfx('crystal-shatter');
          ctx.float(ctx.player.x, ctx.player.y - 48, `the amber cracks +${back}`, '#ffc050');
        }
        stored = 0;
      }
    },
    drawAir(g, time) {
      if (time >= sealedUntil) return;
      const p = ctx.player;
      const k = (sealedUntil - time) / 2500;
      g.fillStyle(0xffb030, 0.18); g.fillEllipse(p.x, p.y - 6, 56, 70);
      g.lineStyle(2, 0xffc050, 0.5 + k * 0.3); g.strokeEllipse(p.x, p.y - 6, 56, 70);
      g.fillStyle(0xfff0c0, 0.5); g.fillEllipse(p.x - 12, p.y - 26, 8, 16);
    },
  };
};

// ── Item defs ────────────────────────────────────────────────────────

export const PORT_ITEMS: IsleItemDef[] = [
  // The Knothole Emporium
  {
    id: 'charm-mossgate-north-moss', name: 'North-Side Moss', emoji: '🌿', kind: 'charm', price: 260, isle: 'life',
    flavor: 'A pad of moss off the Elder\'s north flank, in a ring of bark. It only ever grows on the one side. Mind which.',
    script: 'charm-mossgate-north-moss',
    scriptText: [
      'Three tufts grow on your north side. A hit taken while the foe is north of you (above) lands in the moss:',
      '40% comes back (max 10) and a tuft is crushed. Tufts regrow one per 3s.',
    ],
  },
  {
    id: 'charm-mossgate-seed-pouch', name: 'Seed Pouch', emoji: '🌱', kind: 'charm', price: 360, isle: 'life',
    flavor: 'Hedge-seed swept off the Glasshouse cart. Tansy says it comes up wherever there is trouble. It does.',
    script: 'charm-mossgate-seed-pouch', effect: { maxHp: 6 },
    scriptText: [
      'Hits you land drop a seed at the foe\'s feet (4 at most). 3.5s later it comes up as thorns:',
      '8 damage to the foe within 56px of it, and +5 health to you if you are.',
    ],
  },
  {
    id: 'charm-mossgate-honeybee-brooch', name: 'Honeybee Brooch', emoji: '🐝', kind: 'charm', price: 480, isle: 'life',
    flavor: 'A worker set in amber on a pin, and a live one that will not leave it alone. Says something about loyalty.',
    script: 'charm-mossgate-honeybee-brooch',
    scriptText: [
      'Cast a different ability from your last to carry pollen; three crossings in a row ripen honey.',
      'Your next landed hit blooms for +16 and heals 6. The same ability twice running shakes the pollen off.',
    ],
  },
  {
    id: 'charm-mossgate-scale-acorn', name: 'Scale Acorn', emoji: '🌰', kind: 'charm', price: 600, isle: 'life',
    flavor: 'One of the Empress\'s brass tithe-acorns, stolen off the scales and filed honest. It hates to be tipped.',
    script: 'charm-mossgate-scale-acorn', effect: { damageTakenMult: 0.97 },
    scriptText: [
      'Weighs damage dealt against damage taken. Fall 40 behind: your next 3 hits add +8.',
      'Get 40 ahead: the next hit you take is halved (max 20 back). Then it is even again.',
    ],
  },
  // The Hook & Bramble
  {
    id: 'charm-mossgate-briar-hook', name: 'Briar Hook', emoji: '🪝', kind: 'charm', price: 320, isle: 'life',
    flavor: 'A hook whittled from a bramble thorn, barbs left on. Ezra uses them for rays. Rays hate them.',
    script: 'charm-mossgate-briar-hook',
    scriptText: [
      'A landed hit hooks the foe for 2.5s (every 4s). Pull past 200px apart and the barbs rip: 10 damage.',
      'Stay close and it is reeled in at the end for 4.',
    ],
  },
  {
    id: 'charm-mossgate-thornback-barb', name: 'Thornback Barb', emoji: '🦂', kind: 'charm', price: 440, isle: 'life',
    flavor: 'A thornback ray\'s tail-thorn on a thong. Step on a ray and it answers. So does this.',
    script: 'charm-mossgate-thornback-barb', effect: { reflectFraction: 0.03 },
    scriptText: ['Each hit you take raises the barb for 1.6s: your next landed hit adds half of it (max 16).'],
  },
  // Quest reward
  {
    id: 'charm-mossgate-honest-pound', name: 'The Honest Pound', emoji: '🪨', kind: 'charm', isle: 'life',
    flavor: 'A river stone, worn to exactly a pound by sixty years in the Tare family\'s hand. It has never told a lie.',
    script: 'charm-mossgate-honest-pound', effect: { critChance: 0.02 },
    scriptText: ['Remembers your last 5 hits. Any hit lighter than their average is topped up to it (max +12).'],
  },
  // Counter food
  {
    id: 'food-mossgate-acorn-cake', name: 'Acorn Cake', emoji: '🍪', kind: 'food', price: 35, sell: 9, isle: 'life',
    flavor: 'Real acorns, leached nine days in the harbour. Dense as a tithe-weight and about as easy to swallow.',
    effect: { shieldHp: 10 },
  },
  {
    id: 'food-mossgate-moss-tea', name: 'Moss Tea', emoji: '🍵', kind: 'food', price: 50, sell: 13, isle: 'life',
    flavor: 'Steeped from the soft green moss off the north roofs. Tastes like a wet morning. Mossgate swears by it.',
    effect: { regenPerSecond: 0.25, speedMult: 1.04 },
  },
  // The Crumb & Thistle's meals
  {
    id: 'meal-mossgate-thistle-pie', name: 'Thistle Hand-Pie', emoji: '🥧', kind: 'food', sell: 14, isle: 'life',
    flavor: 'Mossback mullet in a crust crimped with a thistle head. Eaten in the hand, carefully, on the move.',
    script: 'meal-mossgate-thistle-pie', effect: { maxHp: 7 },
    scriptText: ['Next fight: the first 4 hits you take within 160px of the foe prick them back for 4.'],
  },
  {
    id: 'meal-mossgate-bride-pie', name: 'Bride-Pie', emoji: '🥮', kind: 'food', sell: 20, isle: 'life',
    flavor: 'A wedding pie, mullet and snapper under a lattice of thistle crust. Baked to be split in two.',
    script: 'meal-mossgate-bride-pie', effect: { regenPerSecond: 0.3 },
    scriptText: ['Next fight: under 60% health, eat half (+10 health, +12% damage for 4s). Under 30%, the other half.'],
  },
  {
    id: 'meal-mossgate-bog-pasty', name: 'Bog-Pike Pasty', emoji: '🥟', kind: 'food', sell: 28, isle: 'life',
    flavor: 'Kelp pike and Spore-bog loach in a pastry black with peat-flour. Heavy. Leaves you trailing mud.',
    script: 'meal-mossgate-bog-pasty', effect: { maxHp: 8 },
    scriptText: ['Next fight: you leave a mire behind you (2.5s of steps). Hits on a foe standing in it add +4.'],
  },
  {
    id: 'meal-mossgate-crab-lily-bake', name: 'Crab & Lily Bake', emoji: '🦀', kind: 'food', sell: 32, isle: 'life',
    flavor: 'Barnacle crab baked shell-on over a bed of Bloom-pond perch. Crack it at the table; mind the barnacles.',
    script: 'meal-mossgate-crab-lily-bake', effect: { shieldHp: 10 },
    scriptText: ['Next fight: after standing still for 0.4s you hunker — every hit taken is blunted by 5.'],
  },
  {
    id: 'meal-mossgate-honey-thornback', name: 'Honey-Glazed Thornback', emoji: '🍯', kind: 'food', sell: 38, isle: 'life',
    flavor: 'Thornback wings glazed in honey and the amber of a Heartwood carp, set hard as a window.',
    script: 'meal-mossgate-honey-thornback', effect: { damageMult: 1.03 },
    scriptText: ['Next fight: each ultimate (Q) seals you in amber for 2.5s — damage taken inside comes back (max 30).'],
  },
];

export const PORT_SCRIPTS: Record<string, ItemScriptFactory> = {
  'charm-mossgate-north-moss': northMoss,
  'charm-mossgate-seed-pouch': seedPouch,
  'charm-mossgate-honeybee-brooch': honeybeeBrooch,
  'charm-mossgate-scale-acorn': scaleAcorn,
  'charm-mossgate-briar-hook': briarHook,
  'charm-mossgate-thornback-barb': thornbackBarb,
  'charm-mossgate-honest-pound': honestPound,
  'meal-mossgate-thistle-pie': thistlePie,
  'meal-mossgate-bride-pie': bridePie,
  'meal-mossgate-bog-pasty': bogPasty,
  'meal-mossgate-crab-lily-bake': crabLilyBake,
  'meal-mossgate-honey-thornback': honeyThornback,
};

export const PORT_SHOPS: ShopDef[] = [
  {
    id: 'mossgate-store', name: 'The Knothole Emporium', buys: true,
    stock: [
      'charm-mossgate-north-moss', 'charm-mossgate-seed-pouch', 'charm-mossgate-honeybee-brooch', 'charm-mossgate-scale-acorn',
      'food-mossgate-acorn-cake', 'food-mossgate-moss-tea',
    ],
  },
  {
    id: 'mossgate-tackle', name: 'The Hook & Bramble', buys: true,
    stock: ['rod-briarwood', 'rod-iron', 'rod-driftwood', 'charm-mossgate-briar-hook', 'charm-mossgate-thornback-barb'],
  },
];

export const PORT_BAKERIES: BakeryDef[] = [
  {
    id: 'mossgate-bakery', name: 'The Crumb & Thistle',
    recipes: [
      {
        id: 'recipe-mossgate-thistle-pie', name: 'Thistle Hand-Pie', coins: 12, output: 'meal-mossgate-thistle-pie', makes: 2,
        inputs: [{ item: 'fish-mossback-mullet', count: 3 }],
      },
      {
        id: 'recipe-mossgate-bride-pie', name: 'Bride-Pie', coins: 16, output: 'meal-mossgate-bride-pie',
        inputs: [{ item: 'fish-mossback-mullet', count: 2 }, { item: 'fish-rootreef-snapper', count: 1 }],
      },
      {
        id: 'recipe-mossgate-bog-pasty', name: 'Bog-Pike Pasty', coins: 24, output: 'meal-mossgate-bog-pasty',
        inputs: [{ item: 'fish-kelp-pike', count: 1 }, { item: 'fish-bog-loach', count: 1 }],
      },
      {
        id: 'recipe-mossgate-crab-lily-bake', name: 'Crab & Lily Bake', coins: 30, output: 'meal-mossgate-crab-lily-bake',
        inputs: [{ item: 'fish-barnacle-crab', count: 1 }, { item: 'fish-lilypad-perch', count: 2 }],
      },
      {
        id: 'recipe-mossgate-honey-thornback', name: 'Honey-Glazed Thornback', coins: 36, output: 'meal-mossgate-honey-thornback',
        inputs: [{ item: 'fish-thornback-ray', count: 1 }, { item: 'fish-amber-carp', count: 1 }],
      },
    ],
  },
];
