import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, shadow, type G } from '../../../../../art/IsleArt';
import { BRASS, BRUISE, INK, IRON, IRON_DARK, IRON_LIT, PAPER, RUST, TIMBER, TIMBER_DARK } from '../palette';
import { manacle, padlock } from '../art';
import { alive, clamp, dist, segDist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Stood Surety — Bondsman Corbyn Thrupp, in the King's telling the man who stood bail for half the
 * court and called in every bond the week the Draught ran short.
 *
 * Each fighter has a surety: a debtor who signed for them, chained in a chair at their end of the
 * yard with five seals on the bond. Thrupp pitches irons at *your* surety down a chalked line; an
 * iron that reaches him breaks a seal, and when the last seal breaks the bond is called on you —
 * stunned and struck. Stand in the line and take the iron yourself, or strike it out of the air.
 *
 * His own surety sits at the far end. Strike him there and his seals break the same way; when his
 * bond is called, Thrupp is held and pays. He guards it when you go near. Past half he throws two
 * irons at once — one from where he stands, one from the bailiff on the north wall.
 */

const ID = fallenId('shackle', 'surety');
const SEALS = 5;
const SEAL_DMG = 26;
const THROW_MS = 3300;
const THROW_MS_LATE = 2700;
const AIM_MS = 800;
const IRON_SPEED = 250;
const BODY_DMG = 7;
const CALL_DMG_PLAYER = 16;
const CALL_DMG_NPC = 30;

/** A surety in his chair: whose bond he holds, how many seals are left, what strikes count. */
interface Surety { owner: Fighter; x: number; y: number; seals: number; worn: number; target: StrikeTarget | null; flinchAt: number; calledAt: number }
/** An iron: aimed (a chalk line), then flying down it. */
interface Iron { bailiff: boolean; x: number; y: number; tx: number; ty: number; fx: number; fy: number; flyAt: number; flying: boolean; target: StrikeTarget | null; spin: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const midY = (top + H) / 2 + 10;
  const sureties: Surety[] = [
    { owner: player, x: 96, y: midY, seals: SEALS, worn: 0, target: null, flinchAt: -9999, calledAt: -9999 },
    { owner: npc, x: W - 96, y: midY, seals: SEALS, worn: 0, target: null, flinchAt: -9999, calledAt: -9999 },
  ];
  const yours = sureties[0], his = sureties[1];
  const bailiff: Pt = { x: W / 2, y: top + 24 };
  const irons: Iron[] = [];
  let nextThrow = 0;
  let late = false;
  let started = false;

  function breakSeal(s: Surety): void {
    s.seals--;
    s.flinchAt = tk.now;
    ctx.sfx('crystal-shatter');
    if (s.seals > 0) return;
    // The bond is called.
    s.seals = SEALS;
    s.calledAt = tk.now;
    const f = s.owner;
    if (!alive(f)) return;
    ctx.banner(f === player ? 'YOUR BOND IS CALLED' : 'THRUPP\'S BOND IS CALLED', f === player ? '#ffb0a0' : '#d8f0a0');
    ctx.sfx('judgement');
    if (f === player) { ctx.stun(player, 1300); tk.hitPlayer(CALL_DMG_PLAYER, player.x, player.y); }
    else { ctx.stun(npc, 1900); ctx.hit(npc, CALL_DMG_NPC, npc.x, npc.y); }
  }

  for (const s of sureties) {
    s.target = ctx.target({
      x: s.x, y: s.y - 22, r: 24,
      onStruck: (by, amount) => {
        const striker = by === 'player' ? player : npc;
        if (striker === s.owner) return;
        s.worn += Math.max(4, amount);
        s.flinchAt = tk.now;
        while (s.worn >= SEAL_DMG) { s.worn -= SEAL_DMG; breakSeal(s); }
      },
    });
  }

  function pitch(from: Pt, delay: number): void {
    const t = tk.now + tk.warn(AIM_MS) + delay;
    const iron: Iron = { bailiff: from === bailiff, x: from.x, y: from.y, fx: from.x, fy: from.y, tx: yours.x + 10, ty: yours.y - 20, flyAt: t, flying: false, target: null, spin: 0 };
    irons.push(iron);
  }

  function spend(i: Iron): void {
    i.target?.remove();
    i.target = null;
    const k = irons.indexOf(i);
    if (k >= 0) irons.splice(k, 1);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextThrow = time + 2400; ctx.banner('GUARD YOUR SURETY — BREAK HIS', '#ffe2a8'); }
      if (!late && npc.hp < npc.maxHp * 0.5) { late = true; ctx.banner('THE BAILIFF THROWS TOO', '#ffb0a0'); ctx.sfx('boss-phase'); }
      if (time >= nextThrow && alive(npc) && alive(player)) {
        nextThrow = time + (late ? THROW_MS_LATE : THROW_MS);
        pitch({ x: npc.x, y: npc.y - 10 }, 0);
        if (late) pitch(bailiff, 450);
        ctx.sfx('whip');
      }
      for (const i of [...irons]) {
        if (!i.flying) {
          // While aimed, the iron rides in Thrupp's hand; the line is chalked from there.
          if (!i.bailiff) { i.fx = npc.x; i.fy = npc.y - 10; }
          if (time >= i.flyAt) {
            i.flying = true; i.x = i.fx; i.y = i.fy;
            i.target = ctx.target({
              x: i.x, y: i.y, r: 15,
              onStruck: (by) => {
                if (by !== 'player' || !irons.includes(i)) return;
                ctx.float(i.x, i.y - 16, 'KNOCKED DOWN', '#d8dce4');
                ctx.sfx('clang');
                spend(i);
              },
            });
            ctx.sfx('chain');
          }
          continue;
        }
        const a = Math.atan2(i.ty - i.fy, i.tx - i.fx);
        const ox = i.x, oy = i.y;
        i.x += Math.cos(a) * IRON_SPEED * dt; i.y += Math.sin(a) * IRON_SPEED * dt; i.spin += dt * 9;
        i.target?.moveTo(i.x, i.y);
        // Stood in its way: you take it, he keeps his seal.
        if (alive(player) && segDist(player.x, player.y, ox, oy, i.x, i.y) < 20 + 12) {
          tk.hitPlayer(BODY_DMG, i.x, i.y);
          ctx.sfx('shield-block');
          spend(i);
          continue;
        }
        if (dist(i.x, i.y, i.tx, i.ty) < 18) {
          breakSeal(yours);
          ctx.sfx('hit-heavy');
          spend(i);
        }
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // You are at his surety: stand between you and it.
      if (dist(player.x, player.y, his.x, his.y) < 300) {
        const a = Math.atan2(player.y - his.y, player.x - his.x);
        return { x: his.x + Math.cos(a) * 90, y: his.y + Math.sin(a) * 90 };
      }
      // Otherwise keep a clear throw: off your line to your surety, at a middling range.
      const off = player.y < midY ? 1 : -1;
      return { x: clamp(W * 0.55, 80, W - 80), y: clamp(midY + off * 170, top + 60, H - 60) };
    },

    drawGround(g, time) {
      for (const s of sureties) {
        // The ringbolt and the chain to the chair.
        g.fillStyle(IRON_DARK, 1); g.fillCircle(s.x, s.y + 22, 6);
        g.lineStyle(2, IRON_LIT, 0.7); g.strokeCircle(s.x, s.y + 22, 8);
        g.fillStyle(0x000000, 0.14); g.fillCircle(s.x, s.y - 6, 52);
        if (time - s.calledAt < 700) { g.lineStyle(4, 0xd83a2a, 1 - (time - s.calledAt) / 700); g.strokeCircle(s.x, s.y - 6, 52 + (time - s.calledAt) / 12); }
      }
      // Chalked lines: where each aimed iron will fly.
      for (const i of irons) {
        if (i.flying) continue;
        const k = clamp(1 - (i.flyAt - time) / tk.warn(AIM_MS), 0, 1);
        const n = 14;
        for (let j = 0; j < n; j++) {
          if (j % 2) continue;
          const a0 = j / n, a1 = (j + 1) / n;
          g.lineStyle(3, PAPER, 0.25 + k * 0.5);
          g.lineBetween(i.fx + (i.tx - i.fx) * a0, i.fy + (i.ty - i.fy) * a0, i.fx + (i.tx - i.fx) * a1, i.fy + (i.ty - i.fy) * a1);
        }
      }
    },

    drawAir(g, time) {
      for (const s of sureties) drawSurety(g, s, time);
      drawBailiff(g, time);
      for (const i of irons) {
        if (!i.flying) continue;
        shadow(g, i.x, i.y + 20, 18, 5, 0.25);
        manacle(g, i.x, i.y, 11, i.spin, 0.5, 0);
        g.lineStyle(1.5, IRON, 0.9);
        g.lineBetween(i.x, i.y, i.x - Math.cos(i.spin) * 14, i.y - Math.sin(i.spin) * 14);
      }
    },

    drawHud(g) {
      // The two bonds, side by side under the bars: five seals each.
      const hy = H - 4;
      for (const [s, x0, c] of [[yours, 24, 0x6a8ab0], [his, W - 24 - SEALS * 22, BRUISE]] as const) {
        g.fillStyle(PAPER, 0.92); g.fillRect(x0 - 6, hy - 26, SEALS * 22 + 8, 22);
        g.lineStyle(1, INK, 0.5); g.lineBetween(x0, hy - 10, x0 + SEALS * 22 - 6, hy - 10);
        for (let j = 0; j < SEALS; j++) {
          const on = j < s.seals;
          g.fillStyle(on ? c : 0x8a7a6a, on ? 1 : 0.35); g.fillCircle(x0 + 8 + j * 22, hy - 16, 7);
          if (on) { g.fillStyle(0xffffff, 0.35); g.fillCircle(x0 + 6 + j * 22, hy - 18, 2); }
          else { g.lineStyle(1.5, INK, 0.6); g.lineBetween(x0 + 3 + j * 22, hy - 20, x0 + 13 + j * 22, hy - 12); }
        }
        const k = s.worn / SEAL_DMG;
        if (k > 0) { g.fillStyle(0xd83a2a, 0.8); g.fillRect(x0, hy - 7, (SEALS * 22 - 6) * k, 2); }
      }
    },
  };

  function drawSurety(g: G, s: Surety, time: number): void {
    const flinch = time - s.flinchAt < 240 ? Math.sin(time / 25) * 3 : 0;
    const x = s.x + flinch, y = s.y;
    const coat = s.owner === player ? 0x4a5a6e : 0x4e3a52;
    shadow(g, x, y + 16, 46, 12, 0.3);
    // The chair: a high-backed gaol chair, black with tar.
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 18, y - 52, 36, 6); g.fillRect(x - 18, y - 52, 5, 66); g.fillRect(x + 13, y - 52, 5, 66);
    g.fillStyle(TIMBER, 1); g.fillRect(x - 20, y - 6, 40, 8);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 18, y + 2, 4, 14); g.fillRect(x + 14, y + 2, 4, 14);
    // The man in it, hunched, hands in irons in his lap.
    g.fillStyle(coat, 1); g.fillRoundedRect(x - 12, y - 34, 24, 30, 6);
    g.fillStyle(dim(coat, 0.3), 1); g.fillRect(x - 10, y - 6, 8, 14); g.fillRect(x + 2, y - 6, 8, 14);
    g.fillStyle(0xc8b096, 1); g.fillCircle(x, y - 42, 8);
    g.fillStyle(0x3a2e24, 1); g.fillEllipse(x, y - 49, 18, 6);
    g.fillStyle(INK, 1); g.fillCircle(x - 3, y - 42, 1.2); g.fillCircle(x + 3, y - 42, 1.2);
    manacle(g, x - 5, y - 12, 4, 0, 0, 0); manacle(g, x + 5, y - 12, 4, 0, 0, 0);
    g.lineStyle(2, RUST, 1); g.lineBetween(x, y - 10, x, y + 22);
    // The bond pinned to his chest: a paper with its wax seals.
    g.fillStyle(PAPER, 1); g.fillRect(x - 9, y - 30, 18, 14);
    for (let j = 0; j < SEALS; j++) {
      g.fillStyle(j < s.seals ? 0xa8282a : 0x6a5a4a, j < s.seals ? 1 : 0.4);
      g.fillCircle(x - 7 + j * 3.5, y - 20, 1.6);
    }
    padlock(g, x + 14, y - 2, 0.6, BRASS, true);
    if (s.owner === npc) glow(g, x, y - 26, 40, BRUISE, 0.04, 3);
  }

  function drawBailiff(g: G, time: number): void {
    // The bailiff on the north wall: only lifts his arm once Thrupp calls him in.
    const x = bailiff.x, y = bailiff.y + 10;
    g.fillStyle(0x3a3440, 1); g.fillRoundedRect(x - 9, y - 26, 18, 24, 5);
    g.fillStyle(0xc8b096, 1); g.fillCircle(x, y - 32, 6);
    g.fillStyle(0x2a2430, 1); g.fillRect(x - 9, y - 39, 18, 4); g.fillRect(x - 6, y - 45, 12, 6);
    const arm = late ? Math.sin(time / 260) * 6 : 0;
    g.lineStyle(3, 0x3a3440, 1); g.lineBetween(x + 7, y - 20, x + 16, y - 30 - arm);
    if (late) manacle(g, x + 17, y - 34 - arm, 5, time / 300, 0.5, 0);
  }
}

export const FALLEN_SURETY: GimmickDef = {
  id: ID,
  rules: 'Thrupp pitches irons at your surety: each breaks a seal, and the fifth calls your bond. Block them or strike them down. Strike his surety to call his.',
  make,
};
