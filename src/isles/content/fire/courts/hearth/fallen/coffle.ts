import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, shadow, type G } from '../../../../../art/IsleArt';
import { BRAND, BRICK, BRICK_DARK, EMBER, EMBER_DARK, EMBER_LIT, GLOW, IRON, SOOT } from '../palette';
import { alive, clamp, dist, frameClock } from '../gimmicks/util';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Coffle — Kiln-Warder Haskett, in the King's telling the man who walked the cold-hearth
 * families up to the Kiln on one long chain.
 *
 * Haskett throws manacles. Each one falls on a warning ring at your feet; caught, it snaps shut
 * and you are chained to an iron stake he drives beside you — a leash you cannot walk out of
 * until you strike the stake loose (three blows, or it works free on its own after a while).
 * A manacle that lands on empty floor lies there open: the exploit. Walk Haskett over an open
 * manacle and it snaps on *him* — leashed, and taking more damage while he picks his own lock.
 *
 * Halfway down, the Kiln calls: a furnace mouth opens in the east wall and every staked chain
 * starts dragging toward it. Whoever is leashed near the mouth cooks — chained or not, keep him
 * there and it cooks him too. The bot kites just past your leash while you are chained and
 * steps round open manacles while it is free.
 */

const ID = fallenId('hearth', 'coffle');
const SHACKLE_R = 44;
const WARN_MS = 1150;
const LEASH = 170;
const STRIKES = 3;
const OPEN_MS = 7500;
const PLAYER_FREE_MS = 8500;
const NPC_FREE_MS = 6000;
const MOUTH_W = 120;
const DRAG = 26;
const SNAP_DMG = 14;

/** A manacle in the air or on the floor. */
interface Shackle { x: number; y: number; landAt: number; landed: boolean; openUntil: number }
/** One fighter's chain: the stake it runs to, and how it comes loose. */
interface Chain { f: Fighter; stake: Pt; target: StrikeTarget | null; blows: number; freeAt: number; lastBlow: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const step = frameClock();
  const shackles: Shackle[] = [];
  const chains: Chain[] = [];
  let nextThrow = 0;
  let started = false;
  let kiln = false;
  let lastCook = 0;
  const mouthY = (top + H) / 2;

  const chainOf = (f: Fighter): Chain | undefined => chains.find((c) => c.f === f);

  function free(c: Chain, by: string): void {
    c.target?.remove();
    chains.splice(chains.indexOf(c), 1);
    ctx.float(c.stake.x, c.stake.y - 40, by, '#d8ccb0');
    ctx.sfx('snap-back');
  }

  function bind(f: Fighter, time: number): void {
    if (chainOf(f)) return;
    const a = rng() * Math.PI * 2;
    const stake = { x: tk.clampX(f.x + Math.cos(a) * 70, 60), y: tk.clampY(f.y + Math.sin(a) * 50, 60) };
    const c: Chain = { f, stake, target: null, blows: 0, freeAt: time + (f === player ? PLAYER_FREE_MS : NPC_FREE_MS), lastBlow: 0 };
    c.target = ctx.target({
      x: stake.x, y: stake.y - 10, r: 20, passThrough: true,
      onStruck: () => {
        if (tk.now - c.lastBlow < 220) return;
        c.lastBlow = tk.now;
        c.blows++;
        ctx.sfx('anvil');
        if (c.blows >= STRIKES && chains.includes(c)) free(c, 'STAKE PULLED');
      },
    });
    chains.push(c);
    ctx.sfx('chain');
    if (f === player) { ctx.hit(player, SNAP_DMG, f.x, f.y); ctx.root(player, 450); }
    else { ctx.hit(npc, SNAP_DMG + 8, f.x, f.y); ctx.float(f.x, f.y - 50, 'SHACKLED', '#ffb070'); }
  }

  function throwAt(p: Pt, time: number): void {
    shackles.push({ x: tk.clampX(p.x, 50), y: tk.clampY(p.y, 50), landAt: time + tk.warn(WARN_MS), landed: false, openUntil: 0 });
    ctx.sfx('whip');
  }

  return {
    update(time) {
      const dt = step(time);
      if (!started) { started = true; nextThrow = time + 2200; }
      if (!kiln && npc.hp < npc.maxHp * 0.5) {
        kiln = true;
        ctx.banner('THE KILN CALLS', '#ffb070');
        ctx.sfx('inferno');
      }
      // Throws: one at you; once the Kiln calls, a second where you are walking to.
      if (time >= nextThrow && alive(player)) {
        nextThrow = time + (kiln ? 6500 : 8500);
        if (!chainOf(player)) {
          throwAt({ x: player.x, y: player.y }, time);
          if (kiln) {
            const h = ctx.facing(player);
            throwAt({ x: player.x + Math.cos(h) * 150, y: player.y + Math.sin(h) * 150 }, time);
          }
        }
      }
      for (let i = shackles.length - 1; i >= 0; i--) {
        const s = shackles[i];
        if (!s.landed && time >= s.landAt) {
          s.landed = true;
          ctx.sfx('clang');
          if (alive(player) && dist(player.x, player.y, s.x, s.y) < SHACKLE_R) { bind(player, time); shackles.splice(i, 1); continue; }
          s.openUntil = time + OPEN_MS;
        }
        if (s.landed) {
          if (alive(npc) && !chainOf(npc) && dist(npc.x, npc.y, s.x, s.y) < SHACKLE_R * 0.7) { bind(npc, time); shackles.splice(i, 1); continue; }
          if (time >= s.openUntil) shackles.splice(i, 1);
        }
      }
      for (const c of [...chains]) {
        if (!alive(c.f)) { free(c, ''); continue; }
        if (time >= c.freeAt) { free(c, c.f === npc ? 'LOCK PICKED' : 'WORKED FREE'); continue; }
        if (kiln) {
          c.stake.x = Math.min(W - MOUTH_W * 0.6, c.stake.x + DRAG * dt);
          c.stake.y += (mouthY - c.stake.y) * Math.min(1, dt * 0.35);
          c.target?.moveTo(c.stake.x, c.stake.y - 10);
        }
        const d = dist(c.stake.x, c.stake.y, c.f.x, c.f.y);
        if (d > LEASH) {
          const k = (d - LEASH) / d;
          ctx.nudge(c.f, (c.stake.x - c.f.x) * k, (c.stake.y - c.f.y) * k);
        }
      }
      if (kiln && time - lastCook > 600) {
        lastCook = time;
        for (const f of [player, npc]) {
          if (alive(f) && f.x > W - MOUTH_W && Math.abs(f.y - mouthY) < 150) {
            if (f === player) tk.hitPlayer(9, f.x, f.y); else ctx.hit(npc, 12, f.x, f.y);
            ctx.sfx('sizzle');
          }
        }
      }
    },

    npcTakenMult: () => (chainOf(npc) ? 1.25 : 1),

    npcSeek() {
      const pc = chainOf(player);
      if (chainOf(npc) || !alive(player)) return null;
      if (pc) {
        // Stand just past the end of your leash, on the far side of you from the stake.
        const a = Math.atan2(player.y - pc.stake.y, player.x - pc.stake.x);
        return { x: tk.clampX(pc.stake.x + Math.cos(a) * (LEASH + 90)), y: tk.clampY(pc.stake.y + Math.sin(a) * (LEASH + 90)) };
      }
      for (const s of shackles) {
        if (!s.landed || dist(npc.x, npc.y, s.x, s.y) > SHACKLE_R + 50) continue;
        const a = Math.atan2(npc.y - s.y, npc.x - s.x);
        return { x: tk.clampX(s.x + Math.cos(a) * (SHACKLE_R + 70)), y: tk.clampY(s.y + Math.sin(a) * (SHACKLE_R + 70)) };
      }
      return null;
    },

    drawGround(g, time) {
      if (kiln) drawMouthHeat(g, W, mouthY, time);
      for (const s of shackles) {
        if (!s.landed) {
          const k = clamp(1 - (s.landAt - time) / tk.warn(WARN_MS), 0, 1);
          g.lineStyle(2, EMBER, 0.35 + k * 0.5); g.strokeCircle(s.x, s.y, SHACKLE_R);
          g.lineStyle(4, EMBER_LIT, 0.8);
          g.beginPath(); g.arc(s.x, s.y, SHACKLE_R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          g.fillStyle(0x000000, 0.15 + k * 0.25); g.fillEllipse(s.x, s.y, 20 + k * 30, 8 + k * 12);
        } else {
          const fade = clamp((s.openUntil - time) / 1200, 0.3, 1);
          drawManacle(g, s.x, s.y, true, fade, time);
        }
      }
      for (const c of chains) {
        drawStake(g, c.stake.x, c.stake.y, c.blows, time);
        drawChainLine(g, c.stake.x, c.stake.y - 14, c.f.x, c.f.y, time, dist(c.stake.x, c.stake.y, c.f.x, c.f.y) > LEASH - 6);
        drawManacle(g, c.f.x, c.f.y + 6, false, 1, time);
      }
    },

    drawAir(g, time) {
      for (const s of shackles) {
        if (s.landed) continue;
        // The manacle tumbling down onto its ring.
        const k = clamp(1 - (s.landAt - time) / tk.warn(WARN_MS), 0, 1);
        const h = (1 - k) * 160;
        const spin = time / 90;
        g.lineStyle(4, IRON, 1); g.strokeEllipse(s.x, s.y - h - 10, 22, 22 * Math.abs(Math.cos(spin)) + 4);
        g.lineStyle(1.5, 0x8a827a, 0.9); g.strokeEllipse(s.x, s.y - h - 10, 18, 18 * Math.abs(Math.cos(spin)) + 3);
        for (let i = 0; i < 4; i++) { g.fillStyle(IRON, 1); g.fillRect(s.x + 9 + i * 5, s.y - h - 12 + Math.sin(spin + i) * 3, 5, 3); }
      }
      if (kiln) drawMouth(g, W, mouthY, time);
    },

    drawHud(g, time) {
      const y = top + 16;
      // Throw clock: a manacle filling round.
      const k = clamp(1 - (nextThrow - time) / (kiln ? 6500 : 8500), 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillCircle(W / 2 - 70, y, 14);
      g.lineStyle(3, IRON, 1); g.strokeCircle(W / 2 - 70, y, 9);
      g.lineStyle(3, EMBER_LIT, 0.9);
      g.beginPath(); g.arc(W / 2 - 70, y, 12, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      // Stake pips for whoever is chained.
      chains.forEach((c, n) => {
        const x0 = W / 2 - 30 + n * 90;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 6, y - 12, 84, 24, 6);
        g.fillStyle(c.f === player ? 0xd8ccb0 : BRAND, 1); g.fillCircle(x0 + 6, y, 5);
        for (let i = 0; i < STRIKES; i++) {
          const px = x0 + 24 + i * 18;
          g.fillStyle(IRON, 1); g.fillRect(px - 3, y - 9, 6, 18);
          g.fillStyle(i < c.blows ? EMBER_LIT : 0x5a5550, 1); g.fillRect(px - 6, y - 10, 12, 4);
        }
      });
    },

    destroy() { for (const c of chains) c.target?.remove(); },
  };
}

/** A hinged iron manacle: open and lying on the floor, or clamped round an ankle. */
function drawManacle(g: G, x: number, y: number, open: boolean, a: number, time: number): void {
  shadow(g, x, y + 3, 40, 10, 0.3 * a);
  if (open) {
    const gape = 0.6 + Math.sin(time / 500 + x) * 0.05;
    g.lineStyle(5, IRON, a);
    g.beginPath(); g.arc(x - 6, y, 14, Math.PI * 0.5, Math.PI * 1.5, false); g.strokePath();
    g.beginPath(); g.arc(x + 6, y, 14, -Math.PI * 0.5 + gape, Math.PI * 0.5 - gape * 0.2, false); g.strokePath();
    g.lineStyle(1.5, 0x8a827a, a);
    g.beginPath(); g.arc(x - 6, y, 12, Math.PI * 0.6, Math.PI * 1.4, false); g.strokePath();
    g.fillStyle(0x4a4440, a); g.fillCircle(x - 6, y - 14, 3); g.fillCircle(x - 6, y + 14, 3);
    // The keyhole plate, glowing the way every lock in the Fall glows.
    g.fillStyle(EMBER_DARK, a); g.fillRect(x - 10, y - 4, 8, 8);
    g.fillStyle(EMBER_LIT, a * (0.6 + Math.sin(time / 200) * 0.3)); g.fillRect(x - 7, y - 2, 2, 4);
  } else {
    g.lineStyle(4, IRON, 1); g.strokeEllipse(x, y, 30, 12);
    g.lineStyle(1.5, 0x8a827a, 0.8); g.strokeEllipse(x, y - 1, 26, 9);
  }
}

/** The iron stake driven into the cobbles, its ring, and the dents each blow has left. */
function drawStake(g: G, x: number, y: number, blows: number, time: number): void {
  shadow(g, x, y + 2, 34, 10);
  g.fillStyle(SOOT, 0.6); g.fillEllipse(x, y, 30, 10);
  for (let i = 0; i < 5; i++) { g.lineStyle(1, 0x2b2725, 0.7); g.lineBetween(x, y, x + Math.cos(i * 1.3) * 16, y + Math.sin(i * 1.3) * 5); }
  const lean = blows * 0.08 * Math.sin(time / 120);
  g.fillStyle(IRON, 1); g.fillTriangle(x - 5, y - 4, x + 5, y - 4, x, y + 4);
  g.fillRect(x - 5 + lean * 10, y - 34, 10, 30);
  g.fillStyle(0x4a4440, 1); g.fillRect(x - 8 + lean * 12, y - 40, 16, 7);
  g.fillStyle(0x6a625c, 1); g.fillRect(x - 3 + lean * 10, y - 32, 2, 26);
  g.lineStyle(3, IRON, 1); g.strokeCircle(x + 9 + lean * 10, y - 22, 6);
  for (let i = 0; i < blows; i++) { g.fillStyle(EMBER_LIT, 0.8); g.fillRect(x - 6 + lean * 12 + i * 5, y - 41, 3, 2); }
}

/** The chain: alternating links, sagging when slack, drawn straight and ember-hot when taut. */
function drawChainLine(g: G, x1: number, y1: number, x2: number, y2: number, time: number, taut: boolean): void {
  const d = dist(x1, y1, x2, y2);
  const n = Math.max(2, Math.floor(d / 9));
  const sag = taut ? 0 : Math.min(26, (170 - d) * 0.2 + 6);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * sag;
    if (i % 2 === 0) { g.lineStyle(2.5, taut ? 0x6a3a28 : IRON, 1); g.strokeEllipse(x, y, 9, 5); }
    else { g.fillStyle(taut ? EMBER_DARK : 0x4a4440, 1); g.fillRect(x - 1.5, y - 3, 3, 6); }
  }
  if (taut) { g.lineStyle(1, EMBER, 0.4 + Math.sin(time / 60) * 0.2); g.lineBetween(x1, y1, x2, y2); }
}

/** Heat on the floor before the Kiln mouth — where a chain ends up if nobody pulls its stake. */
function drawMouthHeat(g: G, W: number, my: number, time: number): void {
  const pulse = 0.5 + Math.sin(time / 260) * 0.15;
  for (let i = 0; i < 5; i++) { g.fillStyle(EMBER, 0.05 * pulse * (5 - i)); g.fillEllipse(W - 20, my, (MOUTH_W + i * 20) * 2, 300 - i * 20); }
  for (let i = 0; i < 10; i++) {
    const ph = ((time / 900) + i / 10) % 1;
    g.fillStyle(EMBER_LIT, 0.5 * (1 - ph)); g.fillCircle(W - 30 - ph * MOUTH_W, my - 120 + ((i * 53) % 240), 1.5);
  }
}

/** The furnace mouth in the east wall: a brick arch, an iron door swung wide, the fire behind. */
function drawMouth(g: G, W: number, my: number, time: number): void {
  const x = W - 14;
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x - 30, my - 110, 44, 220);
  for (let r = 0; r < 14; r++) for (let c = 0; c < 2; c++) {
    g.fillStyle(r % 2 === c % 2 ? BRICK : dim(BRICK, 0.15), 1); g.fillRect(x - 28 + c * 21 + (r % 2) * 4, my - 108 + r * 15.5, 18, 13);
  }
  g.fillStyle(SOOT, 1); g.fillRoundedRect(x - 26, my - 70, 30, 140, { tl: 15, bl: 15, tr: 0, br: 0 });
  const f = 0.75 + Math.sin(time / 70) * 0.15;
  g.fillStyle(EMBER_DARK, 1); g.fillRoundedRect(x - 22, my - 64, 26, 128, { tl: 12, bl: 12, tr: 0, br: 0 });
  g.fillStyle(EMBER, f); g.fillRoundedRect(x - 18, my - 54, 22, 108, { tl: 10, bl: 10, tr: 0, br: 0 });
  g.fillStyle(GLOW, f); g.fillRoundedRect(x - 12, my - 36, 16, 72, { tl: 8, bl: 8, tr: 0, br: 0 });
  for (let i = 0; i < 5; i++) {
    const lick = 10 + Math.sin(time / 60 + i * 1.9) * 7;
    g.fillStyle(EMBER_LIT, 0.9); g.fillTriangle(x - 16, my - 40 + i * 20, x - 16, my - 30 + i * 20, x - 16 - lick, my - 35 + i * 20);
  }
  // The door, swung open against the wall.
  g.fillStyle(IRON, 1); g.fillRect(x - 44, my - 76, 8, 60);
  g.fillStyle(0x4a4440, 1); g.fillRect(x - 43, my - 70, 2, 48);
  glow(g, x - 30, my, 140, EMBER, 0.04, 4);
}

export const FALLEN_COFFLE: GimmickDef = {
  id: ID,
  rules: 'Manacles fall on rings at your feet: caught, you are staked on a leash — strike the stake 3 times. Walk him over an open one. At half, the Kiln drags.',
  make,
};
