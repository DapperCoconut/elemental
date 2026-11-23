import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, mixC, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, CANVAS, CANVAS_SHADE, CHALK, FOE_TINT, OAK, OAK_DARK, PLAYER_TINT, QUEEN, QUEEN_DARK, RED_THREAD,
  TAN_SAIL, TAR, dist, stitches, tideMark,
} from '../art';

/**
 * Yard a Head — Tallyman Ludd's count.
 *
 * The Yardage is a yard of sailcloth a head a day, measured at the Yardstick by dusk. In the
 * star's telling Ludd is the loftsman who kept the tally for the Measurers, and the fight is his
 * day's book: bolts of canvas are pitched down from the loft doors (a shadow first, then the
 * bolt), and either fighter can shoulder one and walk it to the brass Yardstick in the middle.
 * At dusk the sun on the HUD touches the sea and the day is tallied — whoever brought in fewer
 * yards is fined, hard. A bolt slows whoever carries it; a hit knocks it off the carrier's
 * shoulder and it rolls toward the striker. Halfway down, the days shorten.
 *
 * The exploit is the shoulder: hit Ludd while he is carrying and his bolt rolls to you, and a day
 * he ends with fewer yards than you costs him far more than it would ever cost you.
 */

const ID = fallenId('sailmaker', 'yard-a-head');
const MAX_BOLTS = 3;
const DROP_WARN_MS = 1000;
const BOLT_GAP_MS = 2300;
const PICK_R = 34;
const DELIVER_R = 62;
const DAY_MS = 15000;
const SHORT_DAY_MS = 11000;
const PLAYER_FINE = 20;
const TIE_FINE = 9;
const NPC_FINE_FRAC = 0.085;
const CARRY_SLOW = 0.78;
const KNOCK_MIN = 6;

interface Bolt { x: number; y: number; landAt: number; color: number; roll: number; vx: number; vy: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng, tk } = ctx;
  const stick: Pt = { x: W / 2, y: top + (H - top) / 2 + 10 };
  let bolts: Bolt[] = [];
  let nextBoltAt = 600;
  let dayStart = 0;
  let shortDays = false;
  let announced = false;
  const carrying = new Map<Fighter, Bolt | null>();
  const yards = new Map<Fighter, number>();
  const days: { p: number; n: number }[] = [];
  let lastFineAt = -9999;
  let fineOn: Fighter | null = null;

  const isP = (f: Fighter): boolean => f === ctx.player;
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const dayLen = (): number => (shortDays ? SHORT_DAY_MS : DAY_MS);

  const spawnSpot = (): Pt => {
    for (let i = 0; i < 20; i++) {
      const x = 80 + rng() * (W - 160), y = top + 50 + rng() * (H - top - 100);
      if (dist(x, y, stick.x, stick.y) < 170) continue;
      if (bolts.some((b) => dist(b.x, b.y, x, y) < 120)) continue;
      return { x, y };
    }
    return { x: rng() < 0.5 ? 120 : W - 120, y: top + 80 + rng() * (H - top - 160) };
  };

  /** Knock the bolt off a carrier: it rolls away from them toward `toward`. */
  const knock = (f: Fighter, toward: Fighter): void => {
    const b = carrying.get(f);
    if (!b) return;
    carrying.set(f, null);
    const a = Math.atan2(toward.y - f.y, toward.x - f.x);
    b.x = f.x; b.y = f.y + 8; b.vx = Math.cos(a) * 260; b.vy = Math.sin(a) * 260; b.landAt = 0;
    bolts.push(b);
    ctx.sfx('whoosh');
  };

  const tally = (): void => {
    const p = yards.get(ctx.player) ?? 0, n = yards.get(ctx.npc) ?? 0;
    days.push({ p, n });
    ctx.sfx('judgement');
    if (p < n) {
      tk.hitPlayer(PLAYER_FINE, ctx.player.x, ctx.player.y);
      fineOn = ctx.player;
      ctx.banner('SHORT A YARD — FINED', '#ff9a7a');
    } else if (n < p) {
      ctx.hit(ctx.npc, Math.max(24, ctx.npc.maxHp * NPC_FINE_FRAC), ctx.npc.x, ctx.npc.y);
      fineOn = ctx.npc;
      ctx.sfx('money');
      ctx.banner('LUDD IS SHORT — HE PAYS', '#9df5c8');
    } else {
      tk.hitPlayer(TIE_FINE, ctx.player.x, ctx.player.y);
      ctx.hit(ctx.npc, Math.max(10, ctx.npc.maxHp * 0.03), ctx.npc.x, ctx.npc.y);
      fineOn = null;
      ctx.banner('EVEN — BOTH TITHED', '#e8c890');
    }
    lastFineAt = ctx.scene.time.now;
    yards.set(ctx.player, 0); yards.set(ctx.npc, 0);
  };

  const drawBolt = (g: G, x: number, y: number, color: number, roll: number, a = 1): void => {
    shadow(g, x, y + 7, 46, 11, 0.3 * a);
    g.fillStyle(dim(color, 0.35), a); g.fillRoundedRect(x - 22, y - 9, 44, 16, 7);
    g.fillStyle(color, a); g.fillRoundedRect(x - 21, y - 10, 42, 14, 6);
    g.fillStyle(lit(color, 0.2), a * 0.8); g.fillRect(x - 18, y - 9, 36, 3);
    // Wraps of the cloth round the roll, turning as it rolls.
    g.lineStyle(1, dim(color, 0.4), a * 0.8);
    for (let i = 0; i < 4; i++) { const k = ((i / 4 + roll) % 1) * 36 - 18; g.lineBetween(x + k, y - 10, x + k + 3, y + 4); }
    // The rolled end: a spiral of canvas round a dark core.
    g.fillStyle(dim(color, 0.2), a); g.fillEllipse(x + 21, y - 3, 9, 15);
    g.lineStyle(1, dim(color, 0.55), a); g.strokeEllipse(x + 21, y - 3, 6, 10); g.strokeEllipse(x + 21, y - 3, 3, 5);
    g.fillStyle(TAR, a); g.fillCircle(x + 21, y - 3, 1.3);
    stitches(g, x - 16, y + 2, x + 14, y + 2, RED_THREAD, 1, 3, 3, a * 0.8);
  };

  const drawTally = (g: G, x: number, y: number, n: number, color: number): void => {
    // Five-bar gate notches, chalked.
    for (let i = 0; i < n; i++) {
      const grp = Math.floor(i / 5), k = i % 5;
      const bx = x + grp * 22;
      g.lineStyle(2, color, 0.95);
      if (k < 4) g.lineBetween(bx + k * 4, y, bx + k * 4, y + 12);
      else g.lineBetween(bx - 2, y + 10, bx + 15, y + 1);
    }
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; dayStart = time; ctx.banner('A YARD A HEAD BY DUSK', '#e8c890'); }
      if (!shortDays && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        shortDays = true;
        ctx.banner('THE DAYS DRAW IN', '#ffb080');
        ctx.sfx('clock-tick');
        if (time - dayStart > SHORT_DAY_MS - 2500) dayStart = time - (SHORT_DAY_MS - 2500);
      }
      if (time - dayStart >= dayLen()) { tally(); dayStart = time; }

      const held = (carrying.get(ctx.player) ? 1 : 0) + (carrying.get(ctx.npc) ? 1 : 0);
      if (time >= nextBoltAt && bolts.length + held < MAX_BOLTS + 1 && bolts.length < MAX_BOLTS) {
        const s = spawnSpot();
        const colors = [CANVAS, CANVAS_SHADE, TAN_SAIL];
        bolts.push({ x: s.x, y: s.y, landAt: time + DROP_WARN_MS, color: colors[Math.floor(rng() * 3)], roll: 0, vx: 0, vy: 0 });
        nextBoltAt = time + BOLT_GAP_MS;
      }

      // Rolling bolts slow to a stop; landing bolts thump.
      for (const b of bolts) {
        if (b.landAt > 0 && time >= b.landAt) { b.landAt = 0; ctx.sfx('land'); }
        if (b.vx || b.vy) {
          b.x = tk.clampX(b.x + b.vx * dt); b.y = tk.clampY(b.y + b.vy * dt);
          b.roll += Math.hypot(b.vx, b.vy) * dt / 60;
          const f = Math.pow(0.08, dt);
          b.vx *= f; b.vy *= f;
          if (Math.hypot(b.vx, b.vy) < 12) { b.vx = 0; b.vy = 0; }
        }
      }

      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f)) continue;
        const c = carrying.get(f) ?? null;
        if (!c) {
          const b = bolts.find((q) => q.landAt === 0 && Math.hypot(q.vx, q.vy) < 120 && dist(q.x, q.y, f.x, f.y + 10) < PICK_R);
          if (b) { bolts = bolts.filter((q) => q !== b); carrying.set(f, b); ctx.sfx('dash'); }
        } else if (dist(f.x, f.y, stick.x, stick.y) < DELIVER_R) {
          carrying.set(f, null);
          yards.set(f, (yards.get(f) ?? 0) + 1);
          ctx.sfx('dice');
          if (isP(f)) ctx.heal(f, 5);
          ctx.flash(stick.x, stick.y - 60, isP(f) ? PLAYER_TINT : FOE_TINT);
        }
      }
    },

    playerSpeedMult() { return carrying.get(ctx.player) ? CARRY_SLOW : 1; },
    npcSpeedMult() { return carrying.get(ctx.npc) ? CARRY_SLOW + 0.06 : 1; },

    onNpcHurt(amount) { if (amount >= KNOCK_MIN) knock(ctx.npc, ctx.player); },
    onPlayerHurt(amount) { if (amount >= KNOCK_MIN * 1.5) knock(ctx.player, ctx.npc); },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      if (carrying.get(n)) return stick;
      // A bolt he can reach before the stranger does — or the one rolling loose near him.
      let best: Bolt | null = null, bestScore = Infinity;
      for (const b of bolts) {
        if (b.landAt > 0 && b.landAt - ctx.scene.time.now > 500) continue;
        const dn = dist(n.x, n.y, b.x, b.y), dp = dist(p.x, p.y, b.x, b.y);
        const score = dn - (dp < dn ? 0 : 120);
        if (score < bestScore && dn < dp + 140) { bestScore = score; best = b; }
      }
      if (best) return { x: best.x, y: best.y };
      // The stranger is carrying: cut them off between them and the Yardstick.
      if (carrying.get(p)) return { x: (p.x + stick.x) / 2, y: (p.y + stick.y) / 2 };
      return null;
    },

    drawGround(g, time) {
      // Chalked delivery ring round the Yardstick, with the Queen's mark.
      g.fillStyle(CHALK, 0.05); g.fillCircle(stick.x, stick.y, DELIVER_R);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + time / 4000;
        g.lineStyle(2, CHALK, 0.4); g.beginPath(); g.arc(stick.x, stick.y, DELIVER_R, a, a + 0.14); g.strokePath();
      }
      tideMark(g, stick.x, stick.y + 4, 22, QUEEN, 0.35);
      // Drop shadows: the bolt is coming down from a loft door.
      for (const b of bolts) {
        if (b.landAt === 0) { drawBolt(g, b.x, b.y, b.color, b.roll); continue; }
        const k = 1 - Math.max(0, (b.landAt - time) / DROP_WARN_MS);
        g.fillStyle(0x000000, 0.12 + k * 0.25); g.fillEllipse(b.x, b.y + 7, 20 + k * 30, 6 + k * 7);
        g.lineStyle(1.5, CHALK, 0.5); g.strokeEllipse(b.x, b.y + 7, 56, 18);
      }
    },

    drawAir(g, time) {
      // Falling bolts tumble down out of the sky.
      for (const b of bolts) {
        if (b.landAt === 0) continue;
        const k = 1 - Math.max(0, (b.landAt - time) / DROP_WARN_MS);
        drawBolt(g, b.x, b.y - (1 - k * k) * 320, b.color, k * 2, 0.4 + k * 0.6);
      }
      // The Yardstick: an oak post banded in brass at every ell, with Ludd's tally board.
      const x = stick.x, y = stick.y;
      shadow(g, x, y + 2, 34, 10, 0.35);
      g.fillStyle(OAK_DARK, 1); g.fillRect(x - 5, y - 118, 10, 118);
      g.fillStyle(OAK, 1); g.fillRect(x - 3, y - 118, 4, 118);
      for (let i = 0; i < 5; i++) {
        g.fillStyle(dim(BRASS, 0.3), 1); g.fillRect(x - 6, y - 22 - i * 22, 12, 4);
        g.fillStyle(BRASS, 1); g.fillRect(x - 6, y - 22 - i * 22, 12, 2);
      }
      g.fillStyle(BRASS, 1); g.fillCircle(x, y - 121, 6);
      g.fillStyle(lit(BRASS, 0.5), 1); g.fillCircle(x - 2, y - 123, 2);
      // Tally board hung off the post.
      const bx = x + 8, by = y - 96;
      g.fillStyle(QUEEN_DARK, 0.95); g.fillRect(bx, by, 62, 40);
      g.lineStyle(2, BRASS, 0.9); g.strokeRect(bx, by, 62, 40);
      g.lineStyle(1, CHALK, 0.4); g.lineBetween(bx + 4, by + 20, bx + 58, by + 20);
      drawTally(g, bx + 6, by + 4, yards.get(ctx.player) ?? 0, PLAYER_TINT);
      drawTally(g, bx + 6, by + 24, yards.get(ctx.npc) ?? 0, FOE_TINT);
      // Bolts on shoulders.
      for (const f of [ctx.player, ctx.npc]) {
        const c = carrying.get(f);
        if (c && alive(f)) drawBolt(g, f.x + 4, f.y - 30, c.color, time / 900);
      }
      // The fine: a coin purse emptying over whoever was short.
      const since = time - lastFineAt;
      if (fineOn && since < 900) {
        const k = since / 900;
        for (let i = 0; i < 6; i++) {
          const cx = fineOn.x + Math.sin(i * 2.1) * 18, cy = fineOn.y - 50 + k * 60 + i * 4;
          g.fillStyle(dim(BRASS, 0.3), 1 - k); g.fillEllipse(cx + 1, cy + 1, 9, 5);
          g.fillStyle(BRASS, 1 - k); g.fillEllipse(cx, cy, 9, 5);
        }
      }
    },

    drawHud(g, time) {
      // The day: a sun sinking along an arc toward a line of sea.
      const cx = W / 2, cy = top + 40, r = 34;
      const k = Math.min(1, (time - dayStart) / dayLen());
      g.fillStyle(0x10141c, 0.7); g.fillRoundedRect(cx - 60, top + 4, 120, 44, 8);
      g.fillStyle(mixC(0x6a9ab8, 0xc86a3a, k), 0.9); g.fillRect(cx - 54, top + 8, 108, cy - top - 8);
      g.fillStyle(0x1f5f72, 1); g.fillRect(cx - 54, cy, 108, 5);
      const a = Math.PI + k * Math.PI;
      const sx = cx + Math.cos(a) * r * 1.4, sy = cy + Math.sin(a) * r * 0.85 + 2;
      g.fillStyle(k > 0.85 ? RED_THREAD : 0xffd27a, 1); g.fillCircle(sx, Math.min(cy, sy), 6);
      g.lineStyle(1, 0xffffff, 0.2); g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.strokePath();
      // Yards so far today, as bolts in two rows.
      const pY = yards.get(ctx.player) ?? 0, nY = yards.get(ctx.npc) ?? 0;
      for (let i = 0; i < Math.min(6, pY); i++) { g.fillStyle(PLAYER_TINT, 0.95); g.fillRoundedRect(cx - 120 - i * 14, top + 14, 11, 8, 3); }
      for (let i = 0; i < Math.min(6, nY); i++) { g.fillStyle(FOE_TINT, 0.95); g.fillRoundedRect(cx + 70 + i * 14, top + 14, 11, 8, 3); }
      // Past days: a small ledger of who was short.
      days.slice(-6).forEach((d, i) => {
        const col = d.p < d.n ? PLAYER_TINT : d.n < d.p ? FOE_TINT : CHALK;
        g.fillStyle(col, 0.8); g.fillRect(cx - 18 + i * 7, top + 52, 5, 5);
      });
    },

    destroy() { bolts = []; carrying.clear(); },
  };
}

export const FALLEN_YARD_A_HEAD: GimmickDef = {
  id: ID,
  rules: 'Carry canvas bolts to the Yardstick. At dusk whoever brought fewer yards is fined. Hit a carrier to knock their bolt loose.',
  make,
};
