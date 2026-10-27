import type {
  BakeryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../IslesTypes';
import { brandSigil } from '../../../art/IsleArt';

/**
 * Emberport's goods: Marrit Fenwick's six sea-charms, two boatyard materials, the four meals the
 * Scorched Loaf bakes, and the Brand-King's own iron, which only leaves the Kiln one way.
 *
 * Every script keeps its own clock (`time` deltas, never the frame `dt`), draws what it is doing
 * on the fighter it belongs to, and tells the player out loud when it fires.
 */

const near = (ax: number, ay: number, bx: number, by: number, r: number): boolean =>
  (ax - bx) * (ax - bx) + (ay - by) * (ay - by) <= r * r;

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

// ── Charm: Tide Bell ─────────────────────────────────────────────────

/**
 * A ship's bell on a lanyard. It rings on its own every seven seconds; for a breath after each
 * ring the tide is "in", and any hit you take in that window washes 60% straight back.
 * You hear it coming — the player can bait a hit on the bell.
 */
const tideBell: ItemScriptFactory = (ctx) => {
  const PERIOD = 7000;
  const WINDOW = 1400;
  let nextRing = 0;
  let tideUntil = 0;
  return {
    update(time) {
      if (nextRing === 0) nextRing = time + PERIOD;
      if (time >= nextRing) {
        nextRing = time + PERIOD;
        tideUntil = time + WINDOW;
        ctx.sfx('crystal-chime');
        ctx.float(ctx.player.x, ctx.player.y - 44, 'TIDE IN', '#8fd8ff');
      }
    },
    onHitTaken(amount) {
      if (ctx.scene.time.now > tideUntil || !alive(ctx, 'player')) return;
      const back = Math.max(1, Math.round(amount * 0.6));
      ctx.heal(ctx.player, back);
      ctx.flash(ctx.player.x, ctx.player.y, 0x8fd8ff);
    },
    drawGround(g, time) {
      if (time > tideUntil) return;
      const k = (tideUntil - time) / WINDOW;
      g.lineStyle(3, 0x8fd8ff, 0.5 * k);
      g.strokeCircle(ctx.player.x, ctx.player.y + 6, 22 + (1 - k) * 26);
      g.lineStyle(1.5, 0xe6f8ff, 0.4 * k);
      g.strokeCircle(ctx.player.x, ctx.player.y + 6, 16 + (1 - k) * 18);
    },
    drawAir(g, time) {
      const x = ctx.player.x + 20, y = ctx.player.y - 38;
      const swing = time < tideUntil ? Math.sin(time / 60) * 0.5 : Math.sin(time / 500) * 0.12;
      const bx = x + Math.sin(swing) * 4;
      g.fillStyle(0x6b4a22, 1); g.fillRect(x - 1, y - 8, 2, 6);
      g.fillStyle(0xc9952f, 1);
      g.fillTriangle(bx - 6, y + 6, bx + 6, y + 6, bx, y - 4);
      g.fillCircle(bx, y - 1, 4.4);
      g.fillStyle(0xffe08a, 0.8); g.fillCircle(bx - 1.5, y - 2, 1.4);
      // A pip that fills as the next ring approaches.
      const fill = nextRing > 0 ? 1 - Math.max(0, nextRing - time) / PERIOD : 0;
      g.lineStyle(2, 0x8fd8ff, 0.6);
      g.beginPath(); g.arc(bx, y + 1, 9, -Math.PI / 2, -Math.PI / 2 + fill * Math.PI * 2, false); g.strokePath();
    },
  };
};

// ── Charm: Net Weights ───────────────────────────────────────────────

/**
 * Lead sinkers off a herring net. Every fourth hit you land marks where the foe stands; a heartbeat
 * later a weight drops on that mark. The foe can step off it — so the trick is landing that fourth
 * hit while they are pinned in a corner or mid-cast.
 */
const netWeights: ItemScriptFactory = (ctx) => {
  let hits = 0;
  const drops: { x: number; y: number; at: number; born: number; done: boolean }[] = [];
  const FALL = 900;
  return {
    onHitDealt() {
      hits++;
      if (hits % 4 !== 0) return;
      const t = ctx.scene.time.now;
      drops.push({ x: ctx.npc.x, y: ctx.npc.y, at: t + FALL, born: t, done: false });
      ctx.sfx('trap-set');
    },
    update(time) {
      for (const d of drops) {
        if (d.done || time < d.at) continue;
        d.done = true;
        ctx.sfx('anvil');
        ctx.flash(d.x, d.y, 0x8a9aa6);
        if (alive(ctx, 'npc') && near(d.x, d.y, ctx.npc.x, ctx.npc.y, 46)) {
          ctx.hit(ctx.npc, 14, d.x, d.y);
          ctx.float(d.x, d.y - 30, 'SUNK!', '#b8c8d4');
        }
      }
      while (drops.length && drops[0].done && time > drops[0].at + 400) drops.shift();
    },
    drawGround(g, time) {
      for (const d of drops) {
        if (d.done) continue;
        const k = Math.min(1, (time - d.born) / FALL);
        g.lineStyle(2, 0xb8c8d4, 0.35 + k * 0.4);
        g.strokeCircle(d.x, d.y, 46);
        g.fillStyle(0x2a3440, 0.15 + k * 0.25);
        g.fillCircle(d.x, d.y, 46 * k);
        // Net mesh inside the mark.
        g.lineStyle(1, 0xb8c8d4, 0.25);
        for (let i = -2; i <= 2; i++) {
          g.lineBetween(d.x + i * 16 - 20, d.y - 30, d.x + i * 16 + 20, d.y + 30);
          g.lineBetween(d.x + i * 16 + 20, d.y - 30, d.x + i * 16 - 20, d.y + 30);
        }
      }
    },
    drawAir(g, time) {
      for (const d of drops) {
        if (d.done) continue;
        const k = Math.min(1, (time - d.born) / FALL);
        const y = d.y - 260 * (1 - k * k);
        g.fillStyle(0x4c5862, 1); g.fillRoundedRect(d.x - 8, y - 14, 16, 16, 4);
        g.fillStyle(0x8a9aa6, 1); g.fillRect(d.x - 6, y - 12, 4, 10);
        g.lineStyle(1, 0xd8c8a0, 0.7); g.lineBetween(d.x, y - 14, d.x, y - 40);
      }
      // Pips: hits toward the next weight.
      const left = hits % 4;
      for (let i = 0; i < 3; i++) {
        g.fillStyle(i < left ? 0xb8c8d4 : 0x2a3440, 0.85);
        g.fillCircle(ctx.player.x - 10 + i * 10, ctx.player.y + 30, 3);
      }
    },
  };
};

// ── Charm: Lighthouse Lens ───────────────────────────────────────────

/**
 * A chip of the old lighthouse lens, still turning. A faint beam circles you; whenever it sweeps
 * across the foe they are caught in the light and take 20% more of your damage for two seconds.
 * Stand so the beam's next pass lands — or walk the foe into it.
 */
const lighthouseLens: ItemScriptFactory = (ctx) => {
  const SPIN = 1.15;
  const REACH = 270;
  let lastAt = -1;
  let ang = 0;
  let caughtUntil = 0;
  let ready = 0;
  return {
    update(time) {
      if (lastAt < 0) lastAt = time;
      const step = (time - lastAt) / 1000;
      lastAt = time;
      ang = (ang + SPIN * step) % (Math.PI * 2);
      if (!alive(ctx, 'npc') || time < ready) return;
      const dx = ctx.npc.x - ctx.player.x, dy = ctx.npc.y - ctx.player.y;
      if (dx * dx + dy * dy > REACH * REACH) return;
      let d = Math.atan2(dy, dx) - ang;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) < 0.12) {
        caughtUntil = time + 2000;
        ready = time + 3200;
        ctx.boostDamage(1.2, 2000);
        ctx.sfx('light-beam');
        ctx.float(ctx.npc.x, ctx.npc.y - 46, 'CAUGHT IN THE LIGHT', '#fff2b0');
      }
    },
    drawGround(g, time) {
      const x = ctx.player.x, y = ctx.player.y;
      const a = time < ready ? 0.08 : 0.2;
      g.fillStyle(0xfff2b0, a);
      g.slice(x, y, REACH, ang - 0.12, ang + 0.12, false);
      g.fillPath();
      if (time < caughtUntil && alive(ctx, 'npc')) {
        g.lineStyle(2, 0xfff2b0, 0.6);
        g.strokeCircle(ctx.npc.x, ctx.npc.y, 30 + Math.sin(time / 80) * 3);
      }
    },
  };
};

// ── Charm: Sailor's Knot ─────────────────────────────────────────────

/**
 * Rope that rewards variety. Cast a different ability each time and every new one ties a knot;
 * repeat one and the rope slips loose. Four knots pull taut — a burst of speed and a mouthful
 * of health. Spamming one key never pays.
 */
const sailorsKnot: ItemScriptFactory = (ctx) => {
  const tied: string[] = [];
  let tautUntil = 0;
  return {
    onCast(_id, slot) {
      if (!slot) return;
      if (tied.includes(slot)) {
        if (tied.length > 1) ctx.float(ctx.player.x, ctx.player.y - 40, 'knot slips', '#c8b48a');
        tied.length = 0;
      }
      tied.push(slot);
      if (tied.length >= 4) {
        tied.length = 0;
        tautUntil = ctx.scene.time.now + 3000;
        ctx.boostSpeed(1.25, 3000);
        ctx.heal(ctx.player, 10);
        ctx.sfx('whip');
        ctx.float(ctx.player.x, ctx.player.y - 46, 'PULLED TAUT', '#ffd98a');
      }
    },
    drawAir(g, time) {
      const x = ctx.player.x, y = ctx.player.y + 34;
      g.lineStyle(2, 0xa88a5a, 0.8);
      g.lineBetween(x - 26, y, x + 26, y);
      for (let i = 0; i < 4; i++) {
        const kx = x - 18 + i * 12;
        if (i < tied.length) {
          g.fillStyle(0xd8b878, 1); g.fillCircle(kx, y, 3.6);
          g.lineStyle(1, 0x5a4428, 1); g.strokeCircle(kx, y, 3.6);
        } else {
          g.fillStyle(0x5a4428, 0.6); g.fillCircle(kx, y, 1.6);
        }
      }
      if (time < tautUntil) {
        g.lineStyle(1.5, 0xffd98a, 0.5);
        g.strokeCircle(ctx.player.x, ctx.player.y, 26 + Math.sin(time / 70) * 2);
      }
    },
  };
};

// ── Charm: Harbour Lantern ───────────────────────────────────────────

/**
 * A little storm lantern that only stays lit when you stop moving. Stand your ground for a
 * second and it catches, mending you for as long as you hold still. A brawler's charm, not a
 * kiter's — the moment you run, it gutters.
 */
const harbourLantern: ItemScriptFactory = (ctx) => {
  let lx = 0, ly = 0;
  let stillSince = -1;
  let lit = false;
  let nextTick = 0;
  return {
    update(time) {
      const p = ctx.player;
      if (stillSince < 0 || !near(p.x, p.y, lx, ly, 3)) {
        lx = p.x; ly = p.y; stillSince = time;
        if (lit) { lit = false; ctx.sfx('hush'); }
        return;
      }
      if (!lit && time - stillSince > 1100) {
        lit = true;
        nextTick = time + 400;
        ctx.sfx('sizzle');
        ctx.float(p.x, p.y - 40, 'lantern lit', '#ffcf6a');
      }
      if (lit && time >= nextTick && alive(ctx, 'player') && p.hp < p.maxHp) {
        nextTick = time + 400;
        ctx.heal(p, 1);
      }
    },
    drawAir(g, time) {
      const x = ctx.player.x - 24, y = ctx.player.y - 6;
      g.fillStyle(0x2a2420, 1); g.fillRect(x - 5, y - 14, 10, 2); g.fillRect(x - 1, y - 18, 2, 4);
      g.fillStyle(0x3a3028, 1); g.fillRoundedRect(x - 6, y - 12, 12, 16, 3);
      if (lit) {
        const f = 0.8 + Math.sin(time / 70) * 0.2;
        g.fillStyle(0xffcf6a, 0.12 * f); g.fillCircle(x, y - 4, 30);
        g.fillStyle(0xffcf6a, 0.95); g.fillRect(x - 4, y - 10, 8, 11);
        g.fillStyle(0xffffff, 0.8); g.fillCircle(x, y - 4, 1.8);
      } else {
        g.fillStyle(0x1a1410, 1); g.fillRect(x - 4, y - 10, 8, 11);
        const k = stillSince >= 0 ? Math.min(1, (time - stillSince) / 1100) : 0;
        g.fillStyle(0xff8a3a, 0.6 * k); g.fillCircle(x, y - 3, 1 + k * 2);
      }
    },
  };
};

// ── Charm: Gull Feather ──────────────────────────────────────────────

/**
 * Every Emberport child knows the gulls hate the King's men. Once a fight, when you drop under a
 * third of your health, the harbour gulls mob the foe — three birds, three pecks each, wheeling
 * round their head where everyone can see.
 */
const gullFeather: ItemScriptFactory = (ctx) => {
  let fired = false;
  let start = 0;
  const pecks: number[] = [];
  return {
    update(time) {
      const p = ctx.player;
      if (!fired && p.hp > 0 && p.hp < p.maxHp * 0.35) {
        fired = true;
        start = time;
        ctx.sfx('screech');
        ctx.float(p.x, p.y - 50, 'THE GULLS!', '#f2f2e8');
        for (let i = 0; i < 9; i++) pecks.push(time + 500 + i * 330);
      }
      while (pecks.length && time >= pecks[0]) {
        pecks.shift();
        if (!alive(ctx, 'npc')) continue;
        ctx.hit(ctx.npc, 4, ctx.npc.x, ctx.npc.y - 20);
        ctx.sfx('stab');
      }
    },
    drawAir(g, time) {
      if (!fired || time > start + 3800) return;
      const cx = ctx.npc.x, cy = ctx.npc.y - 34;
      for (let i = 0; i < 3; i++) {
        const a = time / 260 + (i * Math.PI * 2) / 3;
        const dive = Math.max(0, Math.sin(time / 110 + i * 2)) * 14;
        const x = cx + Math.cos(a) * (34 - dive), y = cy + Math.sin(a) * 14 + dive * 0.6;
        const flap = Math.sin(time / 45 + i) * 5;
        g.lineStyle(2.4, 0xf2f2e8, 1);
        g.lineBetween(x - 9, y - flap, x, y);
        g.lineBetween(x, y, x + 9, y - flap);
        g.fillStyle(0xffb03a, 1); g.fillCircle(x + (Math.cos(a) > 0 ? -2 : 2), y + 1, 1.4);
      }
    },
  };
};

// ── Meals (one fight each) ───────────────────────────────────────────

/**
 * Charred Sprat Toast — crunchy bones that crackle on impact. Your first four landed hits each
 * spit an extra six damage.
 */
const spratToast: ItemScriptFactory = (ctx) => {
  let left = 4;
  return {
    onHitDealt() {
      if (left <= 0 || !alive(ctx, 'npc')) return;
      left--;
      ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x + 14, ctx.npc.y - 32, 'crackle', '#ffb070');
      ctx.sfx('sizzle');
    },
    drawAir(g) {
      for (let i = 0; i < left; i++) {
        g.fillStyle(0xd48a3a, 0.9);
        g.fillEllipse(ctx.player.x - 15 + i * 10, ctx.player.y - 40, 7, 3.5);
      }
    },
  };
};

/**
 * Tithe-Day Pie — four slices, eaten one per heavy blow. Any hit of eight or more takes a slice
 * and the slice gives eight back. Small pokes leave the pie alone.
 */
const tithePie: ItemScriptFactory = (ctx) => {
  let slices = 4;
  return {
    onHitTaken(amount) {
      if (slices <= 0 || amount < 8 || !alive(ctx, 'player')) return;
      slices--;
      ctx.heal(ctx.player, 8);
      ctx.float(ctx.player.x, ctx.player.y - 42, `pie! (${slices} left)`, '#f0c890');
    },
    drawAir(g) {
      const x = ctx.player.x + 26, y = ctx.player.y - 30;
      g.fillStyle(0x3a2414, 0.6); g.fillCircle(x, y, 8);
      for (let i = 0; i < slices; i++) {
        g.fillStyle(i % 2 ? 0xd8a060 : 0xe8b878, 1);
        g.slice(x, y, 7, -Math.PI / 2 + (i * Math.PI) / 2, -Math.PI / 2 + ((i + 1) * Math.PI) / 2, false);
        g.fillPath();
      }
    },
  };
};

/**
 * Twice-Eel Stew — you come out of every E slick as an eel: thirty percent faster for a second
 * and a half, trailing a wet shine.
 */
const eelStew: ItemScriptFactory = (ctx) => {
  let slickUntil = 0;
  const trail: { x: number; y: number; t: number }[] = [];
  return {
    onCast(_id, slot) {
      if (slot !== 'e') return;
      slickUntil = ctx.scene.time.now + 1600;
      ctx.boostSpeed(1.3, 1600);
      ctx.sfx('slime-splat');
    },
    update(time) {
      if (time < slickUntil) trail.push({ x: ctx.player.x, y: ctx.player.y + 14, t: time });
      while (trail.length && time - trail[0].t > 700) trail.shift();
    },
    drawGround(g, time) {
      for (const p of trail) {
        const k = 1 - (time - p.t) / 700;
        g.fillStyle(0x6ab8a8, 0.3 * k); g.fillEllipse(p.x, p.y, 18 * k + 4, 7 * k + 2);
      }
    },
  };
};

/**
 * Beacon Bake — the beacon lights after four seconds without landing a hit. The next hit you
 * land while it burns opens a window of +40% damage. Patience, then a broadside.
 */
const beaconBake: ItemScriptFactory = (ctx) => {
  let lastHit = 0;
  let lit = false;
  return {
    update(time) {
      if (lastHit === 0) lastHit = time;
      if (!lit && time - lastHit > 4000) { lit = true; ctx.sfx('light-beam'); }
    },
    onHitDealt() {
      lastHit = ctx.scene.time.now;
      if (!lit) return;
      lit = false;
      ctx.boostDamage(1.4, 1500);
      ctx.float(ctx.npc.x, ctx.npc.y - 44, 'BEACON!', '#fff2b0');
    },
    drawAir(g, time) {
      const x = ctx.player.x, y = ctx.player.y - 50;
      g.fillStyle(0x3a3028, 1); g.fillRect(x - 3, y, 6, 8);
      if (lit) {
        g.fillStyle(0xfff2b0, 0.15); g.fillCircle(x, y - 2, 16 + Math.sin(time / 90) * 2);
        g.fillStyle(0xfff2b0, 1); g.fillCircle(x, y - 2, 4);
      } else {
        const k = Math.min(1, (time - lastHit) / 4000);
        g.fillStyle(0xffa040, 0.5); g.fillCircle(x, y - 2, 1 + k * 2.5);
      }
    },
  };
};

// ── Artifact: The Brand-King's Iron ──────────────────────────────────

/**
 * King Ashgrave's great branding iron, cooled at last. Every fifth hit you land burns his sigil
 * onto the foe: for five seconds they take 20% more of your damage, and when the brand fades it
 * flares for fourteen. The iron that marked an isle, turned on whoever stands in front of you.
 */
const brandKingsIron: ItemScriptFactory = (ctx) => {
  let hits = 0;
  let brandUntil = 0;
  let branded = false;
  return {
    onHitDealt() {
      if (branded) return;
      hits++;
      if (hits < 5) return;
      hits = 0;
      branded = true;
      brandUntil = ctx.scene.time.now + 5000;
      ctx.boostDamage(1.2, 5000);
      ctx.sfx('hammer-forge');
      ctx.float(ctx.npc.x, ctx.npc.y - 50, 'BRANDED', '#ff7a2f');
    },
    update(time) {
      if (!branded || time < brandUntil) return;
      branded = false;
      if (!alive(ctx, 'npc')) return;
      ctx.hit(ctx.npc, 14, ctx.npc.x, ctx.npc.y);
      ctx.flash(ctx.npc.x, ctx.npc.y, 0xff7a2f);
      ctx.sfx('flame-burst');
    },
    drawAir(g, time) {
      if (branded && alive(ctx, 'npc')) {
        const k = (brandUntil - time) / 5000;
        const pulse = 1 + Math.sin(time / 90) * 0.1;
        brandSigil(g, ctx.npc.x, ctx.npc.y - 46, 9 * pulse, 0xff7a2f, 0.5 + k * 0.5);
        g.lineStyle(2, 0xff7a2f, 0.7);
        g.beginPath(); g.arc(ctx.npc.x, ctx.npc.y - 46, 15, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        return;
      }
      for (let i = 0; i < 4; i++) {
        g.fillStyle(i < hits ? 0xff7a2f : 0x3a1a0a, 0.85);
        g.fillRect(ctx.player.x - 14 + i * 8, ctx.player.y + 30, 5, 5);
      }
    },
  };
};

// ── Item defs ────────────────────────────────────────────────────────

export const PORT_ITEMS: IsleItemDef[] = [
  {
    id: 'charm-tide-bell', name: 'Tide Bell', emoji: '🔔', kind: 'charm', price: 180, isle: 'fire',
    flavor: 'Rung on every Emberport boat at the turn of the tide. Sailors swear the sea answers.',
    script: 'charm-tide-bell',
    scriptText: ['Rings every 7s. Hits taken in the 1.4s after a ring heal 60% back.'],
  },
  {
    id: 'charm-net-weights', name: 'Net Weights', emoji: '⚓', kind: 'charm', price: 220, isle: 'fire',
    flavor: 'Three lead sinkers on a cord. Heavier than they look, which is the point.',
    script: 'charm-net-weights',
    scriptText: ['Every 4th hit you land marks the foe\'s spot; 0.9s later a weight drops there for 14.'],
  },
  {
    id: 'charm-lighthouse-lens', name: 'Lighthouse Lens', emoji: '🔦', kind: 'charm', price: 340, isle: 'fire',
    flavor: 'A prism chipped from the old lens before the King had it smashed. It still wants to turn.',
    script: 'charm-lighthouse-lens',
    scriptText: ['A beam circles you. When it sweeps the foe, they take +20% of your damage for 2s.'],
  },
  {
    id: 'charm-sailors-knot', name: "Sailor's Knot", emoji: '🪢', kind: 'charm', price: 260, isle: 'fire',
    flavor: 'A bowline, a hitch, a sheet bend and one nobody remembers the name of.',
    script: 'charm-sailors-knot',
    scriptText: [
      'Each cast of a different ability ties a knot; repeating one unties them.',
      'Four knots: +25% speed for 3s and heal 10.',
    ],
  },
  {
    id: 'charm-harbour-lantern', name: 'Harbour Lantern', emoji: '🏮', kind: 'charm', price: 300, isle: 'fire',
    flavor: 'A storm lantern that refuses to burn on the move. Fishwives hang them on the night nets.',
    script: 'charm-harbour-lantern',
    scriptText: ['Stand still for 1.1s to light it: heal 2.5 HP a second while you stay still.'],
  },
  {
    id: 'charm-gull-feather', name: 'Gull Feather', emoji: '🪶', kind: 'charm', price: 420, isle: 'fire',
    flavor: 'The gulls of Emberport steal from tithe-wardens and nobody else. Wear one of theirs.',
    script: 'charm-gull-feather', effect: { dodgeChance: 0.03 },
    scriptText: ['Once a fight, below 35% HP: three gulls mob the foe for nine pecks of 4.'],
  },
  {
    id: 'mat-pitch', name: 'Pot of Pitch', emoji: '🪣', kind: 'material', price: 25, sell: 10, isle: 'fire',
    flavor: 'Black, sticky, smells of pine and burning. Every hull in the harbour is held together with it.',
  },
  {
    id: 'mat-sailcloth', name: 'Bolt of Sailcloth', emoji: '🧵', kind: 'material', price: 40, sell: 16, isle: 'fire',
    flavor: 'Heavy canvas dyed ash-grey, so the King\'s lookouts cannot see it against the smoke.',
  },
  {
    id: 'meal-sprat-toast', name: 'Charred Sprat Toast', emoji: '🍞', kind: 'food', isle: 'fire', sell: 12,
    flavor: 'Three sprats on a thick slice, crayfish butter, grilled until the bones crack. Emberport breakfast.',
    script: 'meal-sprat-toast', effect: { regenPerSecond: 0.4 },
    scriptText: ['Next fight: your first 4 hits each crackle for +6 damage.'],
  },
  {
    id: 'meal-tithe-pie', name: 'Tithe-Day Pie', emoji: '🥧', kind: 'food', isle: 'fire', sell: 18,
    flavor: 'Baked on the day the wardens come, so there is something warm left when they go.',
    script: 'meal-tithe-pie', effect: { maxHp: 8 },
    scriptText: ['Next fight: four slices. Each hit of 8+ you take eats one and heals 8.'],
  },
  {
    id: 'meal-eel-stew', name: 'Twice-Eel Stew', emoji: '🍲', kind: 'food', isle: 'fire', sell: 22,
    flavor: 'One eel from the sea, one from the Boilerworks pipes. They argue in the pot. Delicious.',
    script: 'meal-eel-stew',
    scriptText: ['Next fight: casting E makes you slick — +30% speed for 1.6s.'],
  },
  {
    id: 'meal-beacon-bake', name: 'Beacon Bake', emoji: '🥮', kind: 'food', isle: 'fire', sell: 26,
    flavor: 'Pike and glass-tetra baked in a crust that glows faintly. Eat it in the dark for the full effect.',
    script: 'meal-beacon-bake', effect: { critChance: 0.02 },
    scriptText: ['Next fight: after 4s without landing a hit the beacon lights; your next hit opens +40% damage for 1.5s.'],
  },
  {
    id: 'art-ashgrave', name: "The Brand-King's Iron", emoji: '🔥', kind: 'artifact', isle: 'fire',
    flavor: 'It marked every door on Brandmark. Held the other way round, it is just a very good poker.',
    script: 'art-ashgrave', effect: { maxHp: 15 },
    scriptText: [
      'Every 5th hit you land brands the foe: +20% of your damage for 5s.',
      'When the brand fades it flares for 14.',
    ],
  },
];

export const PORT_SCRIPTS: Record<string, ItemScriptFactory> = {
  'charm-tide-bell': tideBell,
  'charm-net-weights': netWeights,
  'charm-lighthouse-lens': lighthouseLens,
  'charm-sailors-knot': sailorsKnot,
  'charm-harbour-lantern': harbourLantern,
  'charm-gull-feather': gullFeather,
  'meal-sprat-toast': spratToast,
  'meal-tithe-pie': tithePie,
  'meal-eel-stew': eelStew,
  'meal-beacon-bake': beaconBake,
  'art-ashgrave': brandKingsIron,
};

export const PORT_SHOPS: ShopDef[] = [
  {
    id: 'emberport-store', name: "Fenwick's Sundries", buys: true,
    stock: [
      'charm-tide-bell', 'charm-net-weights', 'charm-sailors-knot', 'charm-harbour-lantern',
      'charm-lighthouse-lens', 'charm-gull-feather', 'mat-pitch', 'mat-sailcloth',
    ],
  },
  { id: 'emberport-tackle', name: "Gudgeon's Tackle & Bait", buys: true, stock: ['rod-driftwood', 'rod-iron', 'rod-obsidian'] },
];

export const PORT_BAKERIES: BakeryDef[] = [
  {
    id: 'emberport-bakery', name: 'The Scorched Loaf',
    recipes: [
      {
        id: 'recipe-sprat-toast', name: 'Charred Sprat Toast', coins: 12, output: 'meal-sprat-toast',
        inputs: [{ item: 'fish-cinder-sprat', count: 3 }, { item: 'fish-soot-crayfish', count: 1 }],
      },
      {
        id: 'recipe-tithe-pie', name: 'Tithe-Day Pie', coins: 20, output: 'meal-tithe-pie',
        inputs: [{ item: 'fish-ashfin-mackerel', count: 2 }, { item: 'fish-tithe-perch', count: 1 }],
      },
      {
        id: 'recipe-eel-stew', name: 'Twice-Eel Stew', coins: 24, output: 'meal-eel-stew',
        inputs: [{ item: 'fish-brand-eel', count: 1 }, { item: 'fish-pipe-eel', count: 1 }],
      },
      {
        id: 'recipe-beacon-bake', name: 'Beacon Bake', coins: 30, output: 'meal-beacon-bake',
        inputs: [{ item: 'fish-lighthouse-pike', count: 1 }, { item: 'fish-photon-tetra', count: 2 }],
      },
    ],
  },
];
