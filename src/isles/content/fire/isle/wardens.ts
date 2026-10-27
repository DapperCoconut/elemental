import type { ArenaFloor, EncounterDef, EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../IslesTypes';
import type { Fighter } from '../../../../entities/Fighter';
import { brandSigil, dim, lit } from '../../../art/IsleArt';

/**
 * The Kiln's three wardens — the King's last servants, one at the head of each furnace hall.
 *
 * Each fight is built on the hall it closes: the Tithe Furnace keeps the King's ledger, the
 * Brandline heats the irons that marked every child on the isle, the Bellows Gallery breathes
 * for the whole citadel. Every rule cuts both ways — a player who reads it turns it on the warden.
 */

const alive = (f: Fighter): boolean => f.active && f.hp > 0;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

/** Seconds since the last update, clamped so a hitch never teleports anything. */
function clock(): (time: number) => number {
  let last = -1;
  return (time) => {
    const d = last < 0 ? 0 : Math.min(0.05, Math.max(0, (time - last) / 1000));
    last = time;
    return d;
  };
}

// ── Warden 1: The Tithe Ledger ───────────────────────────────────────

/**
 * Every wound on this floor sheds a tithe-coin — an ember disk stamped with the sigil — that
 * bounces out of whoever bled it. Either fighter can pocket any coin. Every ten seconds the
 * Ledger settles: whoever paid in less is burned for the shortfall. A tie means the Crown takes
 * from both. Hit him, then steal the coins he drops.
 */
const titheLedger = (ctx: GimmickCtx): EncounterGimmick => {
  const SETTLE_MS = 10000;
  const COIN_LIFE = 7500;
  const PICK_R = 30;
  const top = ctx.top;
  interface Coin { x: number; y: number; fromX: number; fromY: number; born: number; taken: boolean }
  const coins: Coin[] = [];
  let paid = { player: 0, npc: 0 };
  let settleAt = 0;
  let lastDrop = { player: 0, npc: 0 };
  let nextFall = 0;
  let reckonFlashUntil = 0;
  let loser: 'player' | 'npc' | 'both' | null = null;

  const clampPt = (x: number, y: number): Pt => ({
    x: Math.max(60, Math.min(ctx.W - 60, x)),
    y: Math.max(top + 40, Math.min(ctx.H - 50, y)),
  });

  const drop = (who: 'player' | 'npc') => {
    const now = ctx.scene.time.now;
    if (now - lastDrop[who] < 450) return;
    lastDrop[who] = now;
    const f = who === 'player' ? ctx.player : ctx.npc;
    const a = ctx.rng() * Math.PI * 2;
    const r = 70 + ctx.rng() * 50;
    const p = clampPt(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r);
    coins.push({ x: p.x, y: p.y, fromX: f.x, fromY: f.y, born: now, taken: false });
    ctx.sfx('money');
  };

  const settle = () => {
    const d = Math.abs(paid.player - paid.npc);
    ctx.banner('THE TITHE IS DUE', '#ffb347');
    ctx.sfx('judgement');
    reckonFlashUntil = ctx.scene.time.now + 900;
    if (d === 0) {
      loser = 'both';
      if (alive(ctx.player)) ctx.hit(ctx.player, 6, ctx.player.x, ctx.player.y);
      if (alive(ctx.npc)) ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.W / 2, top + 70, 'THE CROWN TAKES FROM BOTH', '#ff9a5a');
    } else {
      const who: 'player' | 'npc' = paid.player < paid.npc ? 'player' : 'npc';
      const f = who === 'player' ? ctx.player : ctx.npc;
      loser = who;
      const dmg = Math.min(40, 8 + d * 4);
      if (alive(f)) {
        ctx.hit(f, dmg, f.x, f.y);
        ctx.flash(f.x, f.y, 0xff7a2f);
        ctx.float(f.x, f.y - 50, `SHORT BY ${d} — ${dmg}`, '#ff7a2f');
      }
    }
    paid = { player: 0, npc: 0 };
  };

  return {
    update(time) {
      if (settleAt === 0) { settleAt = time + SETTLE_MS; nextFall = time + 2000; }
      // The ceiling sheds a coin now and then, so the floor is never empty.
      if (time >= nextFall) {
        nextFall = time + 2600;
        const p = clampPt(120 + ctx.rng() * (ctx.W - 240), top + 80 + ctx.rng() * (ctx.H - top - 160));
        coins.push({ x: p.x, y: p.y, fromX: p.x, fromY: p.y - 300, born: time, taken: false });
      }
      for (const c of coins) {
        if (c.taken || time - c.born < 380) continue;
        for (const who of ['player', 'npc'] as const) {
          const f = who === 'player' ? ctx.player : ctx.npc;
          if (!alive(f) || dist(f.x, f.y, c.x, c.y) > PICK_R) continue;
          c.taken = true;
          paid[who]++;
          ctx.float(c.x, c.y - 20, who === 'player' ? '+1 tithe' : 'his tithe', who === 'player' ? '#ffe08a' : '#ff9a7a');
          ctx.sfx('jackpot');
          break;
        }
      }
      for (let i = coins.length - 1; i >= 0; i--) {
        if (coins[i].taken || time - coins[i].born > COIN_LIFE) coins.splice(i, 1);
      }
      if (time >= settleAt) { settleAt = time + SETTLE_MS; settle(); }
      if (time > reckonFlashUntil) loser = null;
    },
    onPlayerHurt(amount) { if (amount >= 4) drop('player'); },
    onNpcHurt(amount) { if (amount >= 4) drop('npc'); },
    npcSeek() {
      let best: Coin | null = null;
      let bd = 420;
      for (const c of coins) {
        const d = dist(ctx.npc.x, ctx.npc.y, c.x, c.y);
        if (!c.taken && d < bd) { bd = d; best = c; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },
    drawGround(g, time) {
      for (const c of coins) {
        const k = Math.min(1, (time - c.born) / 380);
        if (k < 1) continue;
        const fade = 1 - Math.max(0, (time - c.born - COIN_LIFE + 1500) / 1500);
        g.fillStyle(0xff7a2f, 0.12 * fade); g.fillCircle(c.x, c.y + 2, 22);
        g.fillStyle(0x000000, 0.3); g.fillEllipse(c.x + 2, c.y + 6, 22, 7);
      }
      if (loser) {
        const k = (reckonFlashUntil - time) / 900;
        const fs: Fighter[] = loser === 'both' ? [ctx.player, ctx.npc] : [loser === 'player' ? ctx.player : ctx.npc];
        for (const f of fs) {
          g.lineStyle(4, 0xff7a2f, k);
          g.strokeCircle(f.x, f.y, 30 + (1 - k) * 40);
        }
      }
    },
    drawAir(g, time) {
      for (const c of coins) {
        const k = Math.min(1, (time - c.born) / 380);
        // The bounce: an arc from where it was shed to where it lands.
        const x = c.fromX + (c.x - c.fromX) * k;
        const y = c.fromY + (c.y - c.fromY) * k - Math.sin(k * Math.PI) * 60;
        const spin = Math.abs(Math.cos(time / 140 + c.born));
        const blink = time - c.born > COIN_LIFE - 1500 && Math.floor(time / 120) % 2 === 0;
        if (blink) continue;
        g.fillStyle(0x7a2a0a, 1); g.fillEllipse(x, y, 18 * spin + 3, 18);
        g.fillStyle(0xffb347, 1); g.fillEllipse(x, y, 15 * spin + 2, 15);
        if (spin > 0.5) brandSigil(g, x, y, 4.4 * spin, 0x7a2a0a, 0.9);
      }
    },
    drawHud(g, time) {
      // The ledger: two columns of coins either side of a dial counting down to the reckoning.
      const cx = ctx.W / 2, cy = top + 30;
      const left = Math.max(0, settleAt - time) / SETTLE_MS;
      g.fillStyle(0x1a0e08, 0.85); g.fillRoundedRect(cx - 150, cy - 22, 300, 44, 10);
      g.lineStyle(2, 0x7a4a2a, 1); g.strokeRoundedRect(cx - 150, cy - 22, 300, 44, 10);
      g.fillStyle(0x2a1a10, 1); g.fillCircle(cx, cy, 19);
      g.fillStyle(left < 0.25 ? 0xff5a2a : 0xffb347, 0.9);
      g.slice(cx, cy, 17, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.fillPath();
      brandSigil(g, cx, cy, 7, 0x1a0e08, 1);
      for (let i = 0; i < Math.min(10, paid.player); i++) {
        g.fillStyle(0xffe08a, 1); g.fillCircle(cx - 34 - i * 11, cy, 4.5);
      }
      for (let i = 0; i < Math.min(10, paid.npc); i++) {
        g.fillStyle(0xff8a6a, 1); g.fillCircle(cx + 34 + i * 11, cy, 4.5);
      }
      g.fillStyle(0xffe08a, 0.6); g.fillTriangle(cx - 146, cy - 6, cx - 146, cy + 6, cx - 138, cy);
      g.fillStyle(0xff8a6a, 0.6); g.fillTriangle(cx + 146, cy - 6, cx + 146, cy + 6, cx + 138, cy);
    },
  };
};

// ── Warden 2: Hot Irons ──────────────────────────────────────────────

/**
 * Two great branding irons heat on racks at either side of the brandline. When an iron glows
 * white it can be grabbed by whoever reaches it first. Carry it into the other fighter and the
 * brand lands: a heavy burn, and for four seconds the branded one takes a quarter more damage.
 * A carried iron slows its carrier and cools in five seconds. Vell goes for the irons. So can you.
 */
const hotIrons = (ctx: GimmickCtx): EncounterGimmick => {
  const HEAT_MS = 4200;
  const CARRY_MS = 5000;
  const GRAB_R = 34;
  const BRAND_R = 48;
  const top = ctx.top;
  const midY = (top + ctx.H) / 2 + 20;
  interface Rack { x: number; y: number; heatFrom: number; held: 'player' | 'npc' | null; heldAt: number }
  const racks: Rack[] = [
    { x: 92, y: midY, heatFrom: 0, held: null, heldAt: 0 },
    { x: ctx.W - 92, y: midY, heatFrom: 0, held: null, heldAt: 0 },
  ];
  const branded = { player: 0, npc: 0 };
  const sparks: { x: number; y: number; t: number }[] = [];

  const heat = (r: Rack, time: number) => (r.heatFrom === 0 ? 0 : Math.min(1, (time - r.heatFrom) / HEAT_MS));
  const holding = (who: 'player' | 'npc') => racks.find((r) => r.held === who) ?? null;
  const fighter = (who: 'player' | 'npc') => (who === 'player' ? ctx.player : ctx.npc);
  const other = (who: 'player' | 'npc'): 'player' | 'npc' => (who === 'player' ? 'npc' : 'player');

  const returnIron = (r: Rack, time: number) => {
    r.held = null;
    r.heatFrom = time;
  };

  return {
    update(time) {
      for (const r of racks) if (r.heatFrom === 0) r.heatFrom = time - HEAT_MS * 0.4;
      for (const r of racks) {
        if (r.held) {
          const who = r.held;
          const f = fighter(who), o = fighter(other(who));
          if (!alive(f)) { returnIron(r, time); continue; }
          if (time - r.heldAt > CARRY_MS) {
            ctx.float(f.x, f.y - 44, 'the iron cools', '#a8a0a0');
            ctx.sfx('sizzle');
            returnIron(r, time);
            continue;
          }
          if (alive(o) && dist(f.x, f.y, o.x, o.y) < BRAND_R) {
            ctx.hit(o, 22, o.x, o.y);
            ctx.flash(o.x, o.y, 0xff7a2f);
            ctx.sfx('hammer-forge');
            branded[other(who)] = time + 4000;
            ctx.float(o.x, o.y - 50, 'BRANDED', '#ff7a2f');
            if (who === 'player') ctx.banner('THE BRAND IS YOURS TO GIVE', '#ffb347');
            returnIron(r, time);
            continue;
          }
          if (Math.floor(time / 60) % 2 === 0) sparks.push({ x: f.x + 20, y: f.y - 10, t: time });
          continue;
        }
        if (heat(r, time) < 1) continue;
        for (const who of ['player', 'npc'] as const) {
          const f = fighter(who);
          if (holding(who) || !alive(f) || dist(f.x, f.y, r.x, r.y) > GRAB_R) continue;
          r.held = who;
          r.heldAt = time;
          ctx.sfx('clang');
          ctx.float(f.x, f.y - 44, who === 'player' ? 'IRON IN HAND' : 'VELL TAKES THE IRON', who === 'player' ? '#ffe08a' : '#ff9a7a');
          break;
        }
      }
      while (sparks.length && time - sparks[0].t > 500) sparks.shift();
    },
    playerSpeedMult() { return holding('player') ? 0.88 : 1; },
    npcSpeedMult() { return holding('npc') ? 0.88 : 1; },
    playerTakenMult() { return ctx.scene.time.now < branded.player ? 1.25 : 1; },
    npcTakenMult() { return ctx.scene.time.now < branded.npc ? 1.25 : 1; },
    npcSeek() {
      const now = ctx.scene.time.now;
      // Carrying: run the brand home.
      if (holding('npc')) return { x: ctx.player.x, y: ctx.player.y };
      // The player is armed: keep clear, toward the rack furthest from them.
      if (holding('player')) {
        const far = racks.reduce((a, b) => (dist(a.x, a.y, ctx.player.x, ctx.player.y) > dist(b.x, b.y, ctx.player.x, ctx.player.y) ? a : b));
        return { x: (far.x + ctx.W / 2) / 2, y: far.y + (ctx.npc.y < far.y ? -110 : 110) };
      }
      // Otherwise race to whichever iron is ready (or nearly ready) and nearest.
      let best: Rack | null = null;
      let bd = Infinity;
      for (const r of racks) {
        if (r.held || heat(r, now) < 0.8) continue;
        const d = dist(ctx.npc.x, ctx.npc.y, r.x, r.y);
        if (d < bd) { bd = d; best = r; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },
    drawGround(g, time) {
      for (const r of racks) {
        const h = r.held ? 0 : heat(r, time);
        // The rack: a coal trough with an iron cradle.
        g.fillStyle(0x0e0806, 1); g.fillRoundedRect(r.x - 40, r.y - 18, 80, 36, 8);
        g.fillStyle(dim(0xff5a1a, 0.5 - h * 0.3), 1); g.fillRoundedRect(r.x - 34, r.y - 12, 68, 24, 6);
        for (let i = 0; i < 9; i++) {
          const fl = Math.sin(time / 120 + i * 1.7) * 0.5 + 0.5;
          g.fillStyle(0xffa040, 0.25 + fl * 0.4 * (0.4 + h));
          g.fillCircle(r.x - 28 + i * 7, r.y + Math.sin(i * 2.1) * 6, 2.5);
        }
        if (h >= 1) {
          g.lineStyle(3, 0xfff0c0, 0.4 + Math.sin(time / 90) * 0.3);
          g.strokeCircle(r.x, r.y, GRAB_R + 6);
        } else if (!r.held) {
          g.lineStyle(3, 0xff7a2f, 0.6);
          g.beginPath(); g.arc(r.x, r.y, GRAB_R + 6, -Math.PI / 2, -Math.PI / 2 + h * Math.PI * 2, false); g.strokePath();
        }
      }
      for (const who of ['player', 'npc'] as const) {
        if (time > branded[who]) continue;
        const f = fighter(who);
        brandSigil(g, f.x, f.y + 4, 22, 0xff5a1a, 0.35 + Math.sin(time / 80) * 0.15);
      }
    },
    drawAir(g, time) {
      const ironAt = (x: number, y: number, a: number, h: number) => {
        const ex = x + Math.cos(a) * 46, ey = y + Math.sin(a) * 46;
        g.lineStyle(5, 0x2a2420, 1); g.lineBetween(x, y, ex, ey);
        g.fillStyle(0x5a3a22, 1); g.fillCircle(x, y, 5);
        const head = h >= 1 ? 0xfff0c0 : lit(0x7a1a0a, h * 0.8);
        g.fillStyle(head, 0.2 + h * 0.2); g.fillCircle(ex, ey, 14);
        brandSigil(g, ex, ey, 8, head, 1);
      };
      for (const r of racks) {
        if (r.held) {
          const f = fighter(r.held), o = fighter(other(r.held));
          const a = Math.atan2(o.y - f.y, o.x - f.x);
          const cool = 1 - (time - r.heldAt) / CARRY_MS;
          ironAt(f.x + Math.cos(a) * 10, f.y - 6 + Math.sin(a) * 10, a, cool >= 0.5 ? 1 : cool * 2);
        } else {
          ironAt(r.x - 23, r.y - 20, 0, heat(r, time));
        }
      }
      for (const s of sparks) {
        const k = (time - s.t) / 500;
        g.fillStyle(0xffd27a, 1 - k); g.fillCircle(s.x + Math.sin(s.t) * 10 * k, s.y - k * 26, 1.8);
      }
    },
    drawHud(g, time) {
      for (const who of ['player', 'npc'] as const) {
        const r = holding(who);
        if (!r) continue;
        const f = fighter(who);
        const k = 1 - (time - r.heldAt) / CARRY_MS;
        g.fillStyle(0x1a0e08, 0.8); g.fillRect(f.x - 22, f.y + 30, 44, 6);
        g.fillStyle(0xff7a2f, 1); g.fillRect(f.x - 21, f.y + 31, 42 * Math.max(0, k), 4);
      }
    },
  };
};

// ── Warden 3: The Bellows ────────────────────────────────────────────

/**
 * The gallery's two great bellows take turns breathing for the citadel. The working one inhales —
 * a steady drag toward its mouth — then exhales a gale along its band of the room that hurls
 * anyone in it toward the far wall, where the coal beds burn. Stand at the mouth when it blows
 * and you are scorched. Get the foe into the band, stay out of it yourself.
 */
const bellowsGallery = (ctx: GimmickCtx): EncounterGimmick => {
  const INHALE_MS = 2300;
  const EXHALE_MS = 1500;
  const REST_MS = 1400;
  const BAND_HALF = 92;
  const BED_W = 74;
  const top = ctx.top;
  const dt = clock();
  let side: -1 | 1 = -1; // -1 = west bellows working, 1 = east
  let phase: 'rest' | 'inhale' | 'exhale' = 'rest';
  let phaseAt = 0;
  let bandY = (top + ctx.H) / 2;
  let lastBurn = { player: 0, npc: 0 };
  const gusts: { y: number; x: number; v: number; born: number }[] = [];

  const mouthX = () => (side < 0 ? 46 : ctx.W - 46);
  const inBand = (f: Fighter) => Math.abs(f.y - bandY) < BAND_HALF;
  const inBed = (f: Fighter, s: -1 | 1) => (s < 0 ? f.x < BED_W : f.x > ctx.W - BED_W);

  const setPhase = (p: typeof phase, time: number) => { phase = p; phaseAt = time; };

  return {
    update(time) {
      const step = dt(time);
      if (phaseAt === 0) phaseAt = time;
      const el = time - phaseAt;
      if (phase === 'rest' && el > REST_MS) {
        side = side < 0 ? 1 : -1;
        if (ctx.hard) bandY = top + 130 + ctx.rng() * (ctx.H - top - 260);
        setPhase('inhale', time);
        ctx.sfx('gust');
        ctx.float(mouthX(), bandY - 70, 'INHALE', '#d8e8ff');
      } else if (phase === 'inhale' && el > INHALE_MS) {
        setPhase('exhale', time);
        ctx.sfx('tornado');
        // Anyone standing in the mouth takes the full furnace breath.
        for (const f of [ctx.player, ctx.npc]) {
          if (alive(f) && inBand(f) && Math.abs(f.x - mouthX()) < 150) {
            ctx.hit(f, 18, f.x, f.y);
            ctx.flash(f.x, f.y, 0xffb347);
            ctx.float(f.x, f.y - 46, 'SCORCHED', '#ffb347');
          }
        }
      } else if (phase === 'exhale' && el > EXHALE_MS) {
        setPhase('rest', time);
      }

      // Drag and gale, as positional shoves (never velocity).
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f)) continue;
        if (phase === 'inhale') {
          const dx = mouthX() - f.x, dy = bandY - f.y;
          const d = Math.hypot(dx, dy) || 1;
          ctx.nudge(f, (dx / d) * 60 * step, (dy / d) * 22 * step);
        } else if (phase === 'exhale' && inBand(f)) {
          ctx.nudge(f, -side * 175 * step, 0);
        }
      }
      // Coal beds: always warm, white-hot downwind while the gale blows.
      for (const who of ['player', 'npc'] as const) {
        const f = who === 'player' ? ctx.player : ctx.npc;
        if (!alive(f)) continue;
        const downwind = (-side) as -1 | 1;
        const hot = phase === 'exhale' && inBed(f, downwind);
        const warm = inBed(f, -1) || inBed(f, 1);
        if (!warm) continue;
        const every = hot ? 300 : 600;
        if (time - lastBurn[who] < every) continue;
        lastBurn[who] = time;
        ctx.hit(f, hot ? 7 : 4, f.x, f.y);
        ctx.sfx('status-burn');
      }
      // Gust streaks for the art.
      if (phase === 'exhale' && Math.floor(time / 40) % 2 === 0) {
        gusts.push({ y: bandY + (ctx.rng() - 0.5) * BAND_HALF * 1.8, x: mouthX(), v: -side * (500 + ctx.rng() * 300), born: time });
      }
      for (let i = gusts.length - 1; i >= 0; i--) if (time - gusts[i].born > 1400) gusts.splice(i, 1);
    },
    npcSeek() {
      if (phase === 'rest') return null;
      // Step out of the band, on the upwind half of the room.
      const up = side < 0 ? ctx.W * 0.3 : ctx.W * 0.7;
      const above = bandY - BAND_HALF - 70, below = bandY + BAND_HALF + 70;
      const y = Math.abs(ctx.npc.y - above) < Math.abs(ctx.npc.y - below) && above > top + 40 ? above : below;
      return { x: up, y: Math.min(ctx.H - 50, Math.max(top + 40, y)) };
    },
    drawGround(g, time) {
      // Coal beds along both walls.
      for (const s of [-1, 1] as const) {
        const x0 = s < 0 ? 0 : ctx.W - BED_W;
        const hot = phase === 'exhale' && s === -side;
        g.fillStyle(0x1a0806, 1); g.fillRect(x0, top, BED_W, ctx.H - top);
        for (let i = 0; i < 40; i++) {
          const yy = top + 10 + ((i * 53) % (ctx.H - top - 20));
          const xx = x0 + 8 + ((i * 29) % (BED_W - 16));
          const fl = Math.sin(time / (hot ? 50 : 160) + i) * 0.5 + 0.5;
          g.fillStyle(hot ? 0xffe08a : 0xff6a1a, 0.3 + fl * (hot ? 0.6 : 0.35));
          g.fillCircle(xx, yy, hot ? 4 : 3);
        }
        g.lineStyle(2, hot ? 0xffe08a : 0x7a2a0a, 0.9);
        g.lineBetween(s < 0 ? BED_W : ctx.W - BED_W, top, s < 0 ? BED_W : ctx.W - BED_W, ctx.H);
      }
      // The band the bellows will blow along — telegraphed through the whole inhale.
      if (phase !== 'rest') {
        const k = phase === 'inhale' ? (time - phaseAt) / INHALE_MS : 1;
        g.fillStyle(phase === 'exhale' ? 0xffd8a0 : 0xd8e8ff, phase === 'exhale' ? 0.16 : 0.05 + k * 0.08);
        g.fillRect(BED_W, bandY - BAND_HALF, ctx.W - BED_W * 2, BAND_HALF * 2);
        g.lineStyle(2, 0xd8e8ff, 0.3 + k * 0.4);
        g.lineBetween(BED_W, bandY - BAND_HALF, ctx.W - BED_W, bandY - BAND_HALF);
        g.lineBetween(BED_W, bandY + BAND_HALF, ctx.W - BED_W, bandY + BAND_HALF);
        // Chevrons showing which way the gale will throw you.
        for (let i = 0; i < 7; i++) {
          const x = BED_W + 60 + i * ((ctx.W - BED_W * 2 - 120) / 6);
          const sh = ((time / 6) % 40) * -side;
          g.lineStyle(3, 0xd8e8ff, 0.2 + k * 0.3);
          g.lineBetween(x + sh, bandY - 14, x + sh - side * 14, bandY);
          g.lineBetween(x + sh - side * 14, bandY, x + sh, bandY + 14);
        }
        // The scorch zone at the mouth.
        g.lineStyle(2, 0xffb347, 0.3 + k * 0.5);
        g.strokeRect(side < 0 ? 0 : ctx.W - 150, bandY - BAND_HALF, 150, BAND_HALF * 2);
      }
    },
    drawAir(g, time) {
      // The two bellows: leather lungs on iron frames, the working one breathing.
      for (const s of [-1, 1] as const) {
        const x = s < 0 ? 26 : ctx.W - 26;
        const working = s === side && phase !== 'rest';
        const el = time - phaseAt;
        let open = 0.4;
        if (working && phase === 'inhale') open = 0.4 + 0.6 * Math.min(1, el / INHALE_MS);
        if (working && phase === 'exhale') open = 1 - Math.min(1, el / (EXHALE_MS * 0.4));
        const y = s === side ? bandY : (top + ctx.H) / 2;
        const w = 30 + open * 34;
        g.fillStyle(0x3a2216, 1);
        g.fillTriangle(x, y - 90, x, y + 90, x - s * w, y);
        g.fillStyle(0x6a4028, 1);
        g.fillTriangle(x, y - 80, x, y + 80, x - s * (w - 8), y);
        g.lineStyle(2, 0x2a160c, 1);
        for (let k = 1; k < 5; k++) g.lineBetween(x, y - 80 + k * 32, x - s * (w - 8) * (1 - Math.abs(k - 2.5) / 3), y);
        g.fillStyle(0x2a2420, 1); g.fillRect(x - 6, y - 96, 12, 192);
        g.fillStyle(0x1a1410, 1); g.fillCircle(x + s * 14, y, 10);
        if (working && phase === 'exhale') { g.fillStyle(0xffb347, 0.5); g.fillCircle(x + s * 14, y, 8); }
      }
      for (const gu of gusts) {
        const k = (time - gu.born) / 1000;
        const x = gu.x + gu.v * k;
        g.lineStyle(2, 0xfff0d8, Math.max(0, 0.6 - k * 0.4));
        g.lineBetween(x, gu.y, x - Math.sign(gu.v) * 40, gu.y);
      }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const KILN_GIMMICKS: GimmickDef[] = [
  {
    id: 'kiln-tithe-ledger',
    rules: 'Every wound sheds a tithe-coin anyone can pocket. Every 10s, whoever paid less is burned for it.',
    make: titheLedger,
  },
  {
    id: 'kiln-hot-irons',
    rules: 'Grab a white-hot iron from a rack and carry it into your foe: 22 damage and +25% taken for 4s.',
    make: hotIrons,
  },
  {
    id: 'kiln-bellows',
    rules: 'The bellows inhale, then blast their band toward the far coal bed. Stay out of the band; push him in.',
    make: bellowsGallery,
  },
];

export const KILN_WARDENS: EncounterDef[] = [
  {
    id: 'kiln-warden-1', court: 'kiln', name: 'The Tithe Ledger',
    foeName: 'Tithe-Warden Mordaunt', foeElement: 'fire', difficulty: 4, hpMult: 1.1,
    gimmick: 'kiln-tithe-ledger', at: { x: 900, y: 1868 }, coins: 80,
    look: { body: 0x8a5a44, accent: 0x5a1410, hat: 'tophat', traits: ['book', 'brand', 'glasses'], size: 1.15, eye: 0xffb347 },
    challenge: [
      'Halt. Every soul that climbs this hall pays. Every coal, every coin, every drop. I keep the book.',
      'You owe the Crown twenty years of an isle\'s worth. Let us see how much of it you can pay in blood.',
    ],
    beaten: [
      'The ledger... does not balance. It never balanced. I just never let anyone check my sums.',
    ],
  },
  {
    id: 'kiln-warden-2', court: 'kiln', name: 'Hot Irons',
    foeName: 'Brand-Master Vell', foeElement: 'metal', difficulty: 5, hpMult: 1.15,
    gimmick: 'kiln-hot-irons', at: { x: 900, y: 1052 }, coins: 80,
    look: { body: 0x6a5a52, accent: 0x2a2a2e, hat: 'goggles', traits: ['apron', 'tool', 'brand', 'beard'], size: 1.3, eye: 0xff7a2f },
    challenge: [
      'Every iron on that line has my thumbprint on the handle. Every child on this isle has its mark on the wrist.',
      'You came up here with a bare arm. I can fix that.',
    ],
    beaten: [
      'The irons are cooling. All of them. I do not think I have ever heard this hall so quiet.',
    ],
  },
  {
    id: 'kiln-warden-3', court: 'kiln', name: 'The Bellows',
    foeName: 'Bellows-Keeper Grisle', foeElement: 'air', difficulty: 5, hpMult: 1.2,
    gimmick: 'kiln-bellows', at: { x: 900, y: 384 }, coins: 80,
    look: { body: 0x9a8070, accent: 0x4a3426, hat: 'hood', traits: ['mask', 'bandage', 'brand'], size: 1.05, eye: 0xd8e8ff },
    challenge: [
      'I breathe for the Kiln. In, out, in, out, twenty years. The King does not breathe. I do it for him.',
      'Stand in front of the bellows, little spark. Let us see how far you blow.',
    ],
    beaten: [
      'Let them stop. Let them stop. My lungs are tired. ...The King is up there. He has been waiting for you.',
    ],
  },
];

// ── Floor ────────────────────────────────────────────────────────────

/**
 * The warden arena: a furnace-hall floor of riveted iron plates over a coal pit, furnace mouths
 * along the far wall, the sigil cast into a grate in the middle, and chains hanging from the dark.
 */
export const KILN_FLOOR: ArenaFloor = (g, W, H, rng) => {
  g.fillStyle(0x120a08, 1); g.fillRect(0, 0, W, H);
  // Iron plates.
  const ps = 80;
  for (let y = 96; y < H; y += ps) {
    for (let x = 0; x < W; x += ps) {
      const c = 0x2a2220 + Math.floor(rng() * 3) * 0x030202;
      g.fillStyle(0x0a0606, 1); g.fillRect(x, y, ps, ps);
      g.fillStyle(c, 1); g.fillRect(x + 2, y + 2, ps - 4, ps - 4);
      g.fillStyle(0x3a302c, 0.6); g.fillRect(x + 2, y + 2, ps - 4, 2);
      g.fillStyle(0x4a3e38, 1);
      for (const [rx, ry] of [[8, 8], [ps - 8, 8], [8, ps - 8], [ps - 8, ps - 8]]) g.fillCircle(x + rx, y + ry, 2.2);
      if (rng() < 0.25) { g.fillStyle(0x1a0e08, 0.6); g.fillEllipse(x + rng() * ps, y + rng() * ps, 30, 12); }
    }
  }
  // Glow through the plate seams from the coal pit below.
  for (let x = 0; x < W; x += ps) { g.fillStyle(0xff5a1a, 0.08); g.fillRect(x - 2, 96, 4, H - 96); }
  for (let y = 96; y < H; y += ps) { g.fillStyle(0xff5a1a, 0.08); g.fillRect(0, y - 2, W, 4); }
  // Far wall with furnace mouths.
  g.fillStyle(0x1a1010, 1); g.fillRect(0, 96, W, 46);
  for (let i = 0; i < 5; i++) {
    const x = 96 + i * 192;
    g.fillStyle(0x0a0404, 1); g.fillRoundedRect(x - 40, 100, 80, 40, { tl: 30, tr: 30, bl: 0, br: 0 });
    g.fillStyle(0xff6a1a, 0.7); g.fillRoundedRect(x - 32, 108, 64, 32, { tl: 24, tr: 24, bl: 0, br: 0 });
    g.fillStyle(0xffd27a, 0.6); g.fillRect(x - 22, 128, 44, 12);
    g.fillStyle(0xff6a1a, 0.06); g.fillCircle(x, 150, 70);
  }
  // The sigil grate in the middle of the floor.
  const cx = W / 2, cy = (96 + H) / 2 + 20;
  g.fillStyle(0x0a0606, 1); g.fillCircle(cx, cy, 92);
  g.fillStyle(0xff5a1a, 0.18); g.fillCircle(cx, cy, 86);
  g.lineStyle(4, 0x2a2220, 1);
  for (let k = -4; k <= 4; k++) g.lineBetween(cx + k * 20, cy - 84, cx + k * 20, cy + 84);
  g.lineStyle(6, 0x3a302c, 1); g.strokeCircle(cx, cy, 90);
  brandSigil(g, cx, cy, 50, 0x5a2a12, 0.85);
  // Hanging chains.
  for (let i = 0; i < 6; i++) {
    const x = 60 + rng() * (W - 120), len = 30 + rng() * 60;
    g.lineStyle(2, 0x2a2420, 1);
    for (let k = 0; k < len; k += 8) g.strokeEllipse(x, 142 + k, 5, 8);
  }
};
