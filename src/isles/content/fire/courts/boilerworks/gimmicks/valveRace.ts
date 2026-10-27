import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit } from '../../../../../art/IsleArt';
import {
  BRASS, COPPER, COPPER_DARK, COPPER_LIT, FOE_C, IRON_DARK, MINE_C, REDLINE, STEAM,
  clamp, dial, dist, frameClock, steamPuff, valveWheel,
} from '../util';

/**
 * Valve Race — Valvejack Pinter's floor. Four steam mains cross the deck, two each way, and
 * each main has a handwheel at its end. A gauge fills on a clock; when it pins, every main
 * blasts scalding steam along its length.
 *
 * The rule that makes it a race: **a main spares whoever turned its valve last.** Walk into a
 * wheel to spin it to your colour. Your mains are safe ground for you and a scald for Pinter;
 * his are the reverse; untouched mains scald everyone. On top of that, every valve you hold
 * when it blows knocks a little back-pressure into the other side wherever they stand — so
 * holding three valves at the bell is worth the run even if you then step off the pipes.
 *
 * The squares between the mains never blast, so there is always somewhere to stand; the race
 * is about turning the mains into weapons, not about surviving them. All valves spin back to
 * neutral after each blast.
 */

type Owner = 'none' | 'player' | 'npc';

interface Main {
  /** 'h' runs left↔right at `at` (a y); 'v' runs top↔bottom at `at` (an x). */
  axis: 'h' | 'v';
  at: number;
  valve: Pt;
  owner: Owner;
  /** No re-turn before this time — stops two fighters flickering a wheel every frame. */
  lockUntil: number;
  /** Wheel rotation, eased toward `rotTo`. */
  rot: number;
  rotTo: number;
  /** Already struck each side this blast. */
  hitP: boolean;
  hitN: boolean;
}

const HALF_W = 40;
const TURN_R = 38;
const BLAST_MS = 650;

function makeValveRace(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const fillS = hard ? 6.5 : 8.2;
  const dmg = hard ? 22 : 16;
  const backPressure = hard ? 6 : 5;
  const tick = frameClock();

  const midY = (top + H) / 2;
  const mains: Main[] = [
    { axis: 'h', at: midY - 120, valve: { x: 62, y: midY - 120 }, owner: 'none', lockUntil: 0, rot: 0, rotTo: 0, hitP: false, hitN: false },
    { axis: 'h', at: midY + 120, valve: { x: W - 62, y: midY + 120 }, owner: 'none', lockUntil: 0, rot: 0, rotTo: 0, hitP: false, hitN: false },
    { axis: 'v', at: W / 2 - 170, valve: { x: W / 2 - 170, y: top + 30 }, owner: 'none', lockUntil: 0, rot: 0, rotTo: 0, hitP: false, hitN: false },
    { axis: 'v', at: W / 2 + 170, valve: { x: W / 2 + 170, y: H - 34 }, owner: 'none', lockUntil: 0, rot: 0, rotTo: 0, hitP: false, hitN: false },
  ];

  let gauge = 0;
  let blastUntil = 0;
  let botTarget: Main | null = null;
  let warned = false;
  let blasting = false;

  const onMain = (m: Main, x: number, y: number): boolean =>
    m.axis === 'h' ? Math.abs(y - m.at) < HALF_W : Math.abs(x - m.at) < HALF_W;

  /** Would a blast right now spare this side at this point? */
  const safeFor = (side: Owner, x: number, y: number): boolean =>
    mains.every((m) => !onMain(m, x, y) || m.owner === side);

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;

  const turn = (m: Main, side: Owner, time: number): void => {
    if (m.owner === side || time < m.lockUntil) return;
    m.owner = side;
    m.lockUntil = time + 900;
    m.rotTo += Math.PI * 1.5;
    ctx.sfx('gear-turn');
    ctx.float(m.valve.x, m.valve.y - 30, side === 'player' ? 'YOUR VALVE' : "PINTER'S VALVE", side === 'player' ? '#8fe6ff' : '#ffb27a');
  };

  const blast = (time: number): void => {
    blastUntil = time + BLAST_MS;
    blasting = true;
    ctx.sfx('geyser');
    ctx.sfx('explosion-medium');
    ctx.banner('BLOWDOWN!', '#ffe6c8');
    for (const m of mains) { m.hitP = false; m.hitN = false; }
    // Back-pressure from every held valve.
    const pHeld = mains.filter((m) => m.owner === 'player').length;
    const nHeld = mains.filter((m) => m.owner === 'npc').length;
    if (pHeld && alive(ctx.npc)) {
      ctx.hit(ctx.npc, backPressure * pHeld, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 46, `BACK-PRESSURE ×${pHeld}`, '#8fe6ff');
    }
    if (nHeld && alive(ctx.player)) {
      ctx.hit(ctx.player, backPressure * nHeld, ctx.player.x, ctx.player.y);
      ctx.float(ctx.player.x, ctx.player.y - 46, `BACK-PRESSURE ×${nHeld}`, '#ffb27a');
    }
  };

  /** A point the given side can stand on safely when the gauge blows, nearest to `from`. */
  const nearestSafe = (side: Owner, from: Pt): Pt => {
    const xs = [W / 2 - 170, W / 2 + 170];
    const ys = [midY - 120, midY + 120];
    const cands: Pt[] = [];
    const colEdges = [70, xs[0], xs[1], W - 70];
    const rowEdges = [top + 50, ys[0], ys[1], H - 50];
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) {
      cands.push({ x: (colEdges[c] + colEdges[c + 1]) / 2, y: (rowEdges[r] + rowEdges[r + 1]) / 2 });
    }
    for (const m of mains) if (m.owner === side) cands.push(m.axis === 'h' ? { x: from.x, y: m.at } : { x: m.at, y: from.y });
    let best = cands[0];
    let bd = Infinity;
    for (const c of cands) {
      if (!safeFor(side, c.x, c.y)) continue;
      const d = dist(from.x, from.y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };

  return {
    update(time) {
      const dt = tick(time);
      for (const m of mains) m.rot += (m.rotTo - m.rot) * Math.min(1, dt * 8);

      // Turning: walking into a wheel spins it. If both arrive together, the player wins ties.
      for (const m of mains) {
        if (alive(ctx.player) && dist(ctx.player.x, ctx.player.y, m.valve.x, m.valve.y) < TURN_R) turn(m, 'player', time);
        else if (alive(ctx.npc) && dist(ctx.npc.x, ctx.npc.y, m.valve.x, m.valve.y) < TURN_R) turn(m, 'npc', time);
      }

      if (time < blastUntil) {
        // The blast is live: each main scalds everyone on it except its owner, once.
        for (const m of mains) {
          if (!m.hitP && m.owner !== 'player' && alive(ctx.player) && onMain(m, ctx.player.x, ctx.player.y)) {
            m.hitP = true;
            ctx.hit(ctx.player, dmg, ctx.player.x, ctx.player.y);
            ctx.sfx('sizzle');
          }
          if (!m.hitN && m.owner !== 'npc' && alive(ctx.npc) && onMain(m, ctx.npc.x, ctx.npc.y)) {
            m.hitN = true;
            ctx.hit(ctx.npc, dmg, ctx.npc.x, ctx.npc.y);
            ctx.float(ctx.npc.x, ctx.npc.y - 30, 'SCALDED', '#ffffff');
          }
        }
        return;
      }
      if (blasting) {
        // Valves spin back to neutral for the next race.
        blasting = false;
        for (const m of mains) { m.owner = 'none'; m.rotTo -= Math.PI; }
        gauge = 0;
        warned = false;
      }

      gauge = clamp(gauge + dt / fillS, 0, 1);
      if (!warned && gauge > 0.8) {
        warned = true;
        ctx.sfx('countdown-tick');
        ctx.float(W / 2, top + 24, 'GAUGE AT THE RED — GET CLEAR OF THEIR PIPES', '#ffd0a0');
      }
      if (gauge >= 1) blast(time);
    },

    npcSeek() {
      const n = ctx.npc;
      if (gauge > 0.76 || ctx.scene.time.now < blastUntil) return nearestSafe('npc', { x: n.x, y: n.y });
      if (botTarget && botTarget.owner === 'npc') botTarget = null;
      if (!botTarget) {
        // Contest the valve the player is *not* closest to — a race, not a collision.
        let bd = Infinity;
        for (const m of mains) {
          if (m.owner === 'npc') continue;
          const d = dist(n.x, n.y, m.valve.x, m.valve.y) - dist(ctx.player.x, ctx.player.y, m.valve.x, m.valve.y) * 0.5;
          if (d < bd) { bd = d; botTarget = m; }
        }
      }
      return botTarget ? botTarget.valve : null;
    },

    drawGround(g, time) {
      const heat = gauge;
      const live = time < blastUntil;
      for (const m of mains) {
        const own = m.owner === 'player' ? MINE_C : m.owner === 'npc' ? FOE_C : 0xb0b0b0;
        // Trench, then the half-buried main.
        const x0 = m.axis === 'h' ? 0 : m.at - HALF_W, y0 = m.axis === 'h' ? m.at - HALF_W : top;
        const w = m.axis === 'h' ? W : HALF_W * 2, h = m.axis === 'h' ? HALF_W * 2 : H - top;
        g.fillStyle(IRON_DARK, 0.55); g.fillRect(x0, y0, w, h);
        // Owner wash — which side the main spares.
        g.fillStyle(own, m.owner === 'none' ? 0.04 : 0.1 + (heat > 0.8 ? 0.06 * Math.sin(time / 70) : 0));
        g.fillRect(x0, y0, w, h);
        g.lineStyle(2, own, m.owner === 'none' ? 0.25 : 0.65);
        if (m.axis === 'h') { g.lineBetween(0, m.at - HALF_W, W, m.at - HALF_W); g.lineBetween(0, m.at + HALF_W, W, m.at + HALF_W); }
        else { g.lineBetween(m.at - HALF_W, top, m.at - HALF_W, H); g.lineBetween(m.at + HALF_W, top, m.at + HALF_W, H); }
        const glowC = heat > 0.5 ? (heat > 0.85 ? REDLINE : 0xff8a3a) : COPPER;
        const pr = 12;
        g.lineStyle(pr * 2 + 4, COPPER_DARK, 1);
        if (m.axis === 'h') g.lineBetween(0, m.at, W, m.at); else g.lineBetween(m.at, top, m.at, H);
        g.lineStyle(pr * 2, COPPER, 1);
        if (m.axis === 'h') g.lineBetween(0, m.at, W, m.at); else g.lineBetween(m.at, top, m.at, H);
        g.lineStyle(pr * 0.6, heat > 0.5 ? glowC : COPPER_LIT, 0.55 + heat * 0.4);
        if (m.axis === 'h') g.lineBetween(0, m.at - 4, W, m.at - 4); else g.lineBetween(m.at - 4, top, m.at - 4, H);
        // Slotted vents every 64px — these are where the steam comes out.
        const len = m.axis === 'h' ? W : H - top;
        for (let d = 32; d < len; d += 64) {
          const vx = m.axis === 'h' ? d : m.at, vy = m.axis === 'h' ? m.at : top + d;
          g.fillStyle(0x1a1210, 1); g.fillRect(vx - 6, vy - 3, 12, 6);
          if (heat > 0.6 || live) { g.fillStyle(live ? 0xffffff : glowC, live ? 0.9 : (heat - 0.6) * 2); g.fillRect(vx - 5, vy - 2, 10, 4); }
        }
        // Valve: a stand plate and the handwheel in the owner's colour.
        g.fillStyle(dim(own, 0.6), 0.6); g.fillCircle(m.valve.x, m.valve.y, TURN_R);
        g.lineStyle(2, own, 0.8); g.strokeCircle(m.valve.x, m.valve.y, TURN_R);
        g.fillStyle(BRASS, 1); g.fillCircle(m.valve.x, m.valve.y, 8);
        valveWheel(g, m.valve.x, m.valve.y - 4, 20, m.rot, m.owner === 'none' ? 0xa83a2a : own);
      }
    },

    drawAir(g, time) {
      const live = time < blastUntil;
      for (const m of mains) {
        const len = m.axis === 'h' ? W : H - top;
        for (let d = 32; d < len; d += 64) {
          const vx = m.axis === 'h' ? d : m.at, vy = m.axis === 'h' ? m.at : top + d;
          if (live) {
            const k = 1 - (blastUntil - time) / BLAST_MS;
            const tint = m.owner === 'player' ? lit(MINE_C, 0.6) : m.owner === 'npc' ? lit(FOE_C, 0.6) : STEAM;
            g.fillStyle(tint, 0.55 * (1 - k)); g.fillEllipse(vx, vy - 20 - k * 30, 34 + k * 30, 54 + k * 40);
            g.fillStyle(0xffffff, 0.5 * (1 - k)); g.fillEllipse(vx, vy - 12, 16, 30);
          } else if (gauge > 0.7) {
            const ph = ((time / 700) + d / 97) % 1;
            steamPuff(g, vx, vy, ph, 7 + gauge * 6, (gauge - 0.7) * 1.6);
          }
        }
      }
    },

    drawHud(g, time) {
      // The race gauge: a big dial top-centre under the HUD strip, plus valve pips either side.
      const cx = W / 2, cy = top + 26;
      const shake = gauge > 0.85 ? Math.sin(time / 30) * 1.5 : 0;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(cx - 96, cy - 22, 192, 44, 10);
      dial(g, cx + shake, cy, 18, gauge);
      const p = mains.filter((m) => m.owner === 'player').length;
      const n = mains.filter((m) => m.owner === 'npc').length;
      for (let i = 0; i < 4; i++) {
        g.fillStyle(i < p ? MINE_C : 0x333a40, 1); g.fillCircle(cx - 34 - i * 14, cy, 5);
        g.fillStyle(i < n ? FOE_C : 0x40332e, 1); g.fillCircle(cx + 34 + i * 14, cy, 5);
      }
      if (gauge > 0.85 && Math.floor(time / 120) % 2 === 0) {
        g.lineStyle(2, REDLINE, 0.9); g.strokeRoundedRect(cx - 96, cy - 22, 192, 44, 10);
      }
    },
  };
}

export const VALVE_RACE: GimmickDef = {
  id: 'boilerworks-valves',
  rules: 'Walk into a valve to claim its main. When the gauge pins, every main scalds all but its owner.',
  make: makeValveRace,
};
