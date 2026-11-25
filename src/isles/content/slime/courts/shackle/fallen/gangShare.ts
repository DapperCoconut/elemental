import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, shadow, type G } from '../../../../../art/IsleArt';
import { INK, IRON, IRON_DARK, IRON_LIT, MUD_DARK, RUST } from '../palette';
import { manacle, sagChain } from '../art';
import { alive, clamp, dist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Gang's Share — Ganger Mordecai Snell, in the King's telling the head of the causeway gang, who
 * kept his own debt paid off on other men's backs.
 *
 * Snell walks with three convicts chained to his belt. They are his share: every blow that lands on
 * him is spread down the chains, and each man still on one takes a part of it, so Snell takes little.
 * On his heave the gang is flung at you down chalked lines — sidestep the rush.
 *
 * The convicts are bodies: they stop your shots. Strike a convict's fetter enough and it is struck
 * off — and the freed man goes for Snell with his loose irons, hitting him and staggering him, before
 * Snell claps him back on the chain. So break the gang to break the ganger. Snell keeps clear of the
 * men he has lost. Past half he chains on a fourth and heaves faster.
 */

const ID = fallenId('shackle', 'gang-share');
const LEASH = 66;
const SHARE = 0.17;
const CUT_DMG = 22;
const HEAVE_MS = 4700;
const HEAVE_MS_LATE = 3700;
const HEAVE_WARN = 900;
const RUSH_LEN = 340;
const RUSH_SPEED = 560;
const RUSH_DMG = 11;
const FREE_SPEED = 100;
const FREE_HIT = 16;

/** One convict: chained (towed on the leash), rushing (flung down a line), or freed (after Snell). */
interface Convict { x: number; y: number; state: 'chained' | 'rush' | 'free'; worn: number; target: StrikeTarget | null; ra: number; rx: number; ry: number; hitYou: boolean; flinchAt: number; seed: number; freedAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const gang: Convict[] = [];
  let nextHeave = 0;
  let aimAt = 0;
  let late = false;
  let started = false;

  const chained = (): Convict[] => gang.filter((c) => c.state !== 'free');

  function addConvict(i: number): void {
    const a = Math.PI / 2 + (i - 1) * 0.8;
    const c: Convict = { x: npc.x + Math.cos(a) * LEASH, y: npc.y + Math.sin(a) * LEASH, state: 'chained', worn: 0, target: null, ra: 0, rx: 0, ry: 0, hitYou: false, flinchAt: -9999, seed: i * 2.3 + 1, freedAt: 0 };
    c.target = ctx.target({
      x: c.x, y: c.y - 20, r: 17,
      onStruck: (by, amount) => {
        if (by !== 'player' || c.state === 'free') return;
        c.worn += Math.max(5, amount);
        c.flinchAt = tk.now;
        if (c.worn >= CUT_DMG) {
          c.state = 'free';
          c.worn = 0;
          c.freedAt = tk.now;
          ctx.float(c.x, c.y - 50, 'STRUCK OFF', '#d8f0a0');
          ctx.sfx('chain');
        }
      },
    });
    gang.push(c);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        for (let i = 0; i < 3; i++) addConvict(i);
        nextHeave = time + 3200;
        ctx.banner('HIS GANG TAKES HIS BLOWS — STRIKE THEIR FETTERS OFF', '#f0d48a');
      }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        addConvict(3);
        ctx.banner('ANOTHER FOR THE GANG', '#ffb0a0');
        ctx.sfx('boss-phase');
      }
      // The heave: chalk lines first, then the chained men are flung down them.
      if (!aimAt && time >= nextHeave && alive(player) && alive(npc)) {
        aimAt = time + tk.warn(HEAVE_WARN);
        const base = Math.atan2(player.y - npc.y, player.x - npc.x);
        const men = chained();
        men.forEach((c, i) => {
          c.ra = base + (i - (men.length - 1) / 2) * 0.32;
          c.rx = c.x; c.ry = c.y;
        });
        ctx.sfx('whip');
      }
      if (aimAt && time >= aimAt) {
        aimAt = 0;
        nextHeave = time + (late ? HEAVE_MS_LATE : HEAVE_MS);
        for (const c of chained()) { c.state = 'rush'; c.rx = c.x; c.ry = c.y; c.hitYou = false; }
        ctx.sfx('chain');
      }
      for (const c of gang) {
        if (c.state === 'rush') {
          c.x += Math.cos(c.ra) * RUSH_SPEED * dt; c.y += Math.sin(c.ra) * RUSH_SPEED * dt;
          c.x = clamp(c.x, 40, W - 40); c.y = clamp(c.y, top + 40, H - 30);
          if (!c.hitYou && alive(player) && dist(c.x, c.y, player.x, player.y) < 20 + 16) {
            c.hitYou = true;
            tk.hitPlayer(RUSH_DMG, c.x, c.y);
            ctx.nudge(player, Math.cos(c.ra) * 40, Math.sin(c.ra) * 40);
            ctx.sfx('hit-medium');
          }
          if (dist(c.x, c.y, c.rx, c.ry) >= RUSH_LEN) c.state = 'chained';
        } else if (c.state === 'chained') {
          // Towed: the chain hauls him in to its length, and he shuffles a little.
          const d = dist(c.x, c.y, npc.x, npc.y);
          if (d > LEASH) {
            const k = Math.min(1, (d > LEASH * 2 ? 6 : 4) * dt);
            c.x += (npc.x - c.x) * k * (1 - LEASH / d); c.y += (npc.y - c.y) * k * (1 - LEASH / d);
          } else if (d < 34 && d > 0.1) {
            c.x += ((c.x - npc.x) / d) * 40 * dt; c.y += ((c.y - npc.y) / d) * 40 * dt;
          }
          for (const o of gang) {
            if (o === c) continue;
            const e = dist(c.x, c.y, o.x, o.y);
            if (e < 30 && e > 0.1) { c.x += ((c.x - o.x) / e) * 50 * dt; c.y += ((c.y - o.y) / e) * 50 * dt; }
          }
        } else {
          // Freed: after Snell with his loose irons.
          const d = dist(c.x, c.y, npc.x, npc.y);
          if (d > 0.1) { c.x += ((npc.x - c.x) / d) * FREE_SPEED * dt; c.y += ((npc.y - c.y) / d) * FREE_SPEED * dt; }
          if (alive(npc) && d < 34 && time - c.freedAt > 500) {
            ctx.hit(npc, FREE_HIT, npc.x, npc.y);
            ctx.stun(npc, 420);
            ctx.sfx('anvil');
            ctx.float(npc.x, npc.y - 56, 'BACK ON THE CHAIN', '#ffd08a');
            c.state = 'chained';
          }
        }
        c.target?.moveTo(c.x, c.y - 20);
      }
    },

    npcTakenMult() { return Math.max(0.4, 1 - SHARE * chained().length); },

    onNpcHurt() {
      for (const c of chained()) c.flinchAt = tk.now;
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Keep clear of a man he has lost.
      for (const c of gang) {
        if (c.state !== 'free' || dist(c.x, c.y, npc.x, npc.y) > 240) continue;
        const a = Math.atan2(npc.y - c.y, npc.x - c.x);
        return { x: clamp(npc.x + Math.cos(a) * 160, 70, W - 70), y: clamp(npc.y + Math.sin(a) * 160, top + 70, H - 70) };
      }
      // Hold heaving range: far enough that his gang trails between you.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 250, 70, W - 70), y: clamp(player.y + Math.sin(a) * 250, top + 70, H - 70) };
    },

    drawGround(g, time) {
      // The chalked rush lines, brightening as he sets his feet.
      if (aimAt) {
        const k = clamp(1 - (aimAt - time) / tk.warn(HEAVE_WARN), 0, 1);
        for (const c of chained()) {
          const ex = c.x + Math.cos(c.ra) * RUSH_LEN, ey = c.y + Math.sin(c.ra) * RUSH_LEN;
          g.lineStyle(34, 0xe8dcb8, 0.06 + k * 0.12); g.lineBetween(c.x, c.y, ex, ey);
          g.lineStyle(2, 0xe8dcb8, 0.3 + k * 0.5); g.lineBetween(c.x, c.y, ex, ey);
        }
      }
      // Drag-scars where the gang's irons scrape.
      for (const c of gang) { g.fillStyle(MUD_DARK, 0.3); g.fillEllipse(c.x, c.y + 4, 26, 7); }
    },

    drawAir(g, time) {
      const bx = npc.x, by = npc.y - 8;
      for (const c of gang) {
        if (c.state !== 'free' && alive(npc)) sagChain(g, bx, by, c.x + 8, c.y - 18, c.state === 'rush' ? 4 : 14, 6, IRON_LIT, 2);
        drawConvict(g, c, time);
      }
      if (alive(npc) && chained().length) { g.fillStyle(IRON_DARK, 1); g.fillCircle(bx, by, 5); g.lineStyle(2, IRON_LIT, 1); g.strokeCircle(bx, by, 5); }
    },

    drawHud(g) {
      // The gang roll, bottom centre: a figure per man, grey on the chain, gold struck off.
      const n = gang.length;
      const x0 = W / 2 - (n - 1) * 14;
      for (let i = 0; i < n; i++) {
        const c = gang[i];
        const x = x0 + i * 28, y = H - 24;
        const col = c.state === 'free' ? 0xf0d48a : 0x8a8e94;
        g.fillStyle(col, 1); g.fillCircle(x, y - 9, 4); g.fillRoundedRect(x - 5, y - 5, 10, 12, 3);
        if (c.state !== 'free') { g.fillStyle(0xd83a2a, 0.9); g.fillRect(x - 8, y + 10, 16 * clamp(c.worn / CUT_DMG, 0, 1), 2); }
      }
    },
  };

  function drawConvict(g: G, c: Convict, time: number): void {
    const flinch = time - c.flinchAt < 200 ? Math.sin(time / 20) * 2.5 : 0;
    const x = c.x + flinch, y = c.y;
    const free = c.state === 'free';
    const step = Math.sin(time / (free ? 90 : 160) + c.seed) * 2;
    shadow(g, x, y + 2, 26, 7, 0.3);
    // Legs and the ankle irons with their short hobble chain.
    g.fillStyle(0x5a5a5e, 1); g.fillRect(x - 6, y - 14, 5, 14 + step * 0.5); g.fillRect(x + 1, y - 14, 5, 14 - step * 0.5);
    g.fillStyle(IRON_DARK, 1); g.fillRect(x - 7, y - 4, 7, 3); g.fillRect(x, y - 4, 7, 3);
    g.lineStyle(1.5, RUST, 1); g.lineBetween(x - 3, y - 2, x + 3, y - 2);
    // The gang smock, stamped with the broad arrow.
    g.fillStyle(0x7a7a72, 1); g.fillRoundedRect(x - 9, y - 34, 18, 22, 4);
    g.fillStyle(dim(0x7a7a72, 0.3), 1); g.fillRect(x - 9, y - 16, 18, 3);
    g.lineStyle(1.5, INK, 0.9);
    g.lineBetween(x, y - 30, x, y - 20); g.lineBetween(x, y - 30, x - 3, y - 26); g.lineBetween(x, y - 30, x + 3, y - 26);
    // A cropped head.
    g.fillStyle(0xb89a80, 1); g.fillCircle(x, y - 40, 6.5);
    g.fillStyle(0x4a3e34, 0.6); g.fillEllipse(x, y - 45, 12, 4);
    g.fillStyle(INK, 1); g.fillCircle(x - 2, y - 40, 1); g.fillCircle(x + 2, y - 40, 1);
    if (free) {
      // Both arms up, the broken irons swung overhead.
      const sw = Math.sin(time / 120 + c.seed) * 0.6;
      g.lineStyle(3, 0x7a7a72, 1); g.lineBetween(x - 7, y - 30, x - 10, y - 50); g.lineBetween(x + 7, y - 30, x + 10, y - 50);
      manacle(g, x + Math.cos(sw) * 6, y - 54, 5, sw, 0.7, 0);
      g.lineStyle(2, IRON, 1); g.lineBetween(x + 10, y - 50, x + 10 + Math.cos(sw * 2) * 16, y - 50 + Math.sin(sw * 2) * 12);
    } else {
      g.lineStyle(3, 0x7a7a72, 1); g.lineBetween(x - 8, y - 30, x - 6, y - 18); g.lineBetween(x + 8, y - 30, x + 8, y - 18);
      manacle(g, x + 8, y - 18, 3.5, 0, 0, 0);
      if (c.worn > 0) { g.lineStyle(1.5, 0xffd08a, 0.5 + 0.5 * (c.worn / CUT_DMG)); g.strokeCircle(x + 8, y - 18, 6); }
    }
  }
}

export const FALLEN_GANG_SHARE: GimmickDef = {
  id: ID,
  rules: 'Snell\'s chained gang soaks his blows and rushes you on his heave. Strike a convict\'s fetter off and the freed man goes for Snell.',
  make,
};
