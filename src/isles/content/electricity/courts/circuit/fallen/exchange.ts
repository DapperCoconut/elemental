import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import type { G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { segText, valve } from '../art';
import { EPOXY, EPOXY_LIT, FAULT, FILAMENT, GOLD, GOLD_DARK, GOLD_LIT, IRON, IRON_DARK, NIXIE, SILK, SOLDER, SOLDER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Exchange and Store — Register-Keeper Liesel Tamworth, who in the King's telling sat at the
 * Tabulator's console and moved households between its registers: one family's sum written over
 * another's, so the short became somebody else's short, with a key-press.
 *
 * Two exchange keys stand on the east and west walls. Strike one and the register **arms**: a ring
 * of the register's reach opens round the striker, ghosts mark where each fighter will land, and a
 * second later the two of you **swap places**. The striker lands clean. The other lands on the
 * striker's old spot and the Tabulator **stores** over it — the landing cell flashes and then
 * strikes and holds whoever is still in it. If the other is outside the ring when it fires, the
 * exchange faults and nothing moves.
 *
 * So: shoot a key while she is close, and walk out of the store cell when it is you who lands.
 * When she arms one, get out of her ring. Each key needs a few seconds to re-arm. Halfway down the
 * register widens and arms faster. The bot walks to a key when you are in reach, runs out of reach
 * of your exchange, and steps out of the store cell when it lands.
 */

const ID = fallenId('circuit', 'exchange');
const RANGE = 360;
const RANGE_LATE = 470;
const ARM_MS = 1150;
const ARM_LATE_MS = 950;
const KEY_GAP_MS = 4800;
const STORE_DELAY_MS = 480;
const STORE_R = 60;
const STORE_DMG = 18;
const STORE_HOLD_MS = 600;
const KEY_R = 26;

interface Key { x: number; y: number; readyAt: number }
interface Pending { by: Fighter; key: Key; at: number; fire: number }
interface Store { x: number; y: number; at: number; prey: Fighter; done: boolean }
interface Streak { a: Pt; b: Pt; at: number; col: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const ym = (top + H) / 2;
  const keys: Key[] = [{ x: 58, y: ym, readyAt: 0 }, { x: W - 58, y: ym, readyAt: 0 }];
  let pending: Pending | null = null;
  const stores: Store[] = [];
  const streaks: Streak[] = [];
  let faultAt = -9999;
  let faultSpot: Pt = { x: W / 2, y: ym };
  let wide = false;
  const reach = (): number => (wide ? RANGE_LATE : RANGE);
  const other = (f: Fighter): Fighter => (f === player ? npc : player);
  const tint = (f: Fighter): number => (f === player ? 0x9af6ff : 0xffb070);

  for (const k of keys) {
    ctx.target({
      x: k.x, y: k.y, r: KEY_R, passThrough: true,
      onStruck: (by) => {
        const time = ctx.scene.time.now;
        if (pending || time < k.readyAt) return;
        const f = by === 'player' ? player : npc;
        pending = { by: f, key: k, at: time, fire: time + (wide ? ARM_LATE_MS : ARM_MS) };
        k.readyAt = time + KEY_GAP_MS;
        ctx.sfx('beam-charge');
      },
    });
  }

  function execute(p: Pending, time: number): void {
    const a = p.by, b = other(a);
    if (!alive(a) || !alive(b)) return;
    if (dist(a.x, a.y, b.x, b.y) > reach()) {
      faultAt = time; faultSpot = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      ctx.sfx('glitch');
      ctx.float(faultSpot.x, faultSpot.y - 20, 'FAULT', '#ff8a6a');
      return;
    }
    const ax = a.x, ay = a.y, bx = b.x, by = b.y;
    ctx.nudge(a, bx - ax, by - ay);
    ctx.nudge(b, ax - bx, ay - by);
    streaks.push({ a: { x: ax, y: ay }, b: { x: bx, y: by }, at: time, col: tint(a) });
    streaks.push({ a: { x: bx, y: by }, b: { x: ax, y: ay }, at: time, col: tint(b) });
    stores.push({ x: ax, y: ay, at: time + STORE_DELAY_MS, prey: b, done: false });
    ctx.sfx('teleport');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!wide && npc.hp < npc.maxHp * 0.5) {
        wide = true;
        ctx.banner('The register widens, and arms faster.', '#ffd0a0');
        ctx.sfx('gear-turn');
      }
      if (pending && time >= pending.fire) { const p = pending; pending = null; execute(p, time); }
      for (const s of stores) {
        if (s.done || time < s.at) continue;
        s.done = true;
        ctx.sfx('hammer-forge');
        for (const f of [player, npc] as Fighter[]) {
          if (!alive(f) || dist(f.x, f.y, s.x, s.y) > STORE_R + 16) continue;
          // The striker's own old cell is written for the other; it stores over anyone left in it.
          ctx.hit(f, STORE_DMG, f.x, f.y);
          ctx.root(f, STORE_HOLD_MS);
          ctx.flash(f.x, f.y, NIXIE);
        }
      }
      for (let i = stores.length - 1; i >= 0; i--) if (time - stores[i].at > 500) stores.splice(i, 1);
      for (let i = streaks.length - 1; i >= 0; i--) if (time - streaks[i].at > 420) streaks.splice(i, 1);
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const time = ctx.scene.time.now;
      // Landed in a store cell: out of it.
      for (const s of stores) {
        if (s.done || dist(npc.x, npc.y, s.x, s.y) > STORE_R + 30) continue;
        const a = Math.atan2(npc.y - s.y, npc.x - s.x);
        return { x: clamp(s.x + Math.cos(a) * 130, 60, W - 60), y: clamp(s.y + Math.sin(a) * 130, top + 40, H - 40) };
      }
      if (pending) {
        if (pending.by === player) {
          const a = Math.atan2(npc.y - player.y, npc.x - player.x);
          return { x: clamp(player.x + Math.cos(a) * (reach() + 90), 60, W - 60), y: clamp(player.y + Math.sin(a) * (reach() + 90), top + 40, H - 40) };
        }
        return { x: player.x + (npc.x < player.x ? -140 : 140), y: player.y };
      }
      // A ready key, and the player in reach of where I would stand to strike it: go and strike it.
      const ready = keys.filter((k) => time >= k.readyAt).sort((a, b) => dist(a.x, a.y, npc.x, npc.y) - dist(b.x, b.y, npc.x, npc.y));
      for (const k of ready) {
        const sx = k.x + (k.x < W / 2 ? 40 : -40);
        if (dist(sx, k.y, player.x, player.y) < reach() - 80) return { x: sx, y: k.y + 18 };
      }
      return null;
    },

    drawGround(g, time) {
      // The register's reach round the striker, and the ghost landings.
      if (pending) {
        const p = pending, a = p.by, b = other(a);
        const k = clamp((time - p.at) / (p.fire - p.at), 0, 1);
        const inReach = dist(a.x, a.y, b.x, b.y) <= reach();
        const col = tint(a);
        g.fillStyle(col, 0.04 + k * 0.04); g.fillCircle(a.x, a.y, reach());
        for (let i = 0; i < 40; i++) {
          const an = (i / 40) * Math.PI * 2 + time / 1200;
          g.lineStyle(2, col, 0.45); g.beginPath(); g.arc(a.x, a.y, reach(), an, an + 0.08); g.strokePath();
        }
        // The store cell waiting at the striker's feet, printed like a register slot.
        cell(g, a.x, a.y, k, inReach);
        // The exchange line: dashed, with arrowheads both ways.
        const d = dist(a.x, a.y, b.x, b.y), n = Math.max(2, Math.floor(d / 22));
        for (let i = 0; i < n; i += 2) {
          const t0 = i / n, t1 = (i + 1) / n;
          g.lineStyle(2.5, inReach ? GOLD_LIT : FAULT, 0.6);
          g.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
        }
        ghost(g, b.x, b.y, col, k); ghost(g, a.x, a.y, tint(b), k);
      }
      for (const s of stores) {
        const k = clamp(1 - (s.at - time) / STORE_DELAY_MS, 0, 1);
        if (!s.done) cell(g, s.x, s.y, k, true);
        else {
          const f = (time - s.at) / 500;
          g.fillStyle(NIXIE, 0.5 * (1 - f)); g.fillRect(s.x - STORE_R, s.y - STORE_R * 0.7, STORE_R * 2, STORE_R * 1.4);
          g.lineStyle(3, 0xffffff, 1 - f); g.strokeRect(s.x - STORE_R - f * 10, s.y - STORE_R * 0.7 - f * 8, STORE_R * 2 + f * 20, STORE_R * 1.4 + f * 16);
        }
      }
      const fk = (time - faultAt) / 600;
      if (fk >= 0 && fk < 1) { g.lineStyle(3, FAULT, 1 - fk); g.strokeCircle(faultSpot.x, faultSpot.y, 20 + fk * 50); }
      for (const k of keys) drawKey(g, k, time, pending?.key === k ? pending : null);
    },

    drawAir(g, time) {
      for (const s of streaks) {
        const k = (time - s.at) / 420;
        const mx = (s.a.x + s.b.x) / 2, my = (s.a.y + s.b.y) / 2 - 50;
        let px = s.a.x, py = s.a.y;
        for (let i = 1; i <= 12; i++) {
          const t = i / 12, u = 1 - t;
          const x = u * u * s.a.x + 2 * u * t * mx + t * t * s.b.x, y = u * u * s.a.y + 2 * u * t * my + t * t * s.b.y;
          g.lineStyle(6 * (1 - k), s.col, (1 - k) * 0.5); g.lineBetween(px, py, x, y);
          g.lineStyle(2, 0xffffff, 1 - k); g.lineBetween(px, py, x, y);
          px = x; py = y;
        }
      }
    },

    drawHud(g, time) {
      // The console's two key lamps, and the register width in nixie digits.
      const x = W / 2 - 90, y = top + 4;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x, y, 180, 22, 6);
      keys.forEach((k, i) => {
        const ready = time >= k.readyAt;
        const kx = x + 14 + i * 26;
        g.fillStyle(ready ? GOLD_LIT : dim(GOLD, 0.6), 1); g.fillCircle(kx, y + 11, 6);
        if (!ready) {
          const f = clamp(1 - (k.readyAt - time) / KEY_GAP_MS, 0, 1);
          g.lineStyle(2, GOLD, 0.9); g.beginPath(); g.arc(kx, y + 11, 8, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); g.strokePath();
        }
      });
      segText(g, x + 70, y + 5, String(reach()), 12, NIXIE, 0.9);
      if (pending) { g.fillStyle(tint(pending.by), 1); g.fillCircle(x + 160, y + 11, 5); }
    },
  };
}

/** A register slot printed on the board: a gold-edged cell with its bit-rows, filling as it arms. */
function cell(g: G, x: number, y: number, k: number, live: boolean): void {
  const w = STORE_R * 2, h = STORE_R * 1.4;
  g.fillStyle(EPOXY, 0.35 + k * 0.25); g.fillRect(x - w / 2, y - h / 2, w, h);
  g.lineStyle(3, live ? GOLD : dim(GOLD, 0.5), 0.9); g.strokeRect(x - w / 2, y - h / 2, w, h);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
    const on = (c + r) / 11 < k;
    g.fillStyle(on ? NIXIE : dim(NIXIE, 0.75), on ? 0.9 : 0.4);
    g.fillRect(x - w / 2 + 10 + c * 13, y - h / 2 + 10 + r * 18, 8, 10);
  }
}

/** The ghost of a fighter where the exchange will put them: a dashed outline and a gold chevron. */
function ghost(g: G, x: number, y: number, col: number, k: number): void {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.lineStyle(2, col, 0.4 + k * 0.5); g.beginPath(); g.arc(x, y - 14, 22, a, a + 0.3); g.strokePath();
  }
  g.fillStyle(col, 0.5 + k * 0.4); g.fillTriangle(x - 8, y - 50, x + 8, y - 50, x, y - 40);
}

/**
 * An exchange key: a console pedestal with a register valve in a cage on top and the big brass
 * key-lever on its face, two crossed arrows printed under it. Lit gold when ready.
 */
function drawKey(g: G, k: Key, time: number, armed: Pending | null): void {
  const { x, y } = k;
  const ready = time >= k.readyAt;
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 22, 58, 16);
  g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x - 24, y - 18, 48, 42, 5);
  g.fillStyle(IRON, 1); g.fillRoundedRect(x - 22, y - 20, 44, 40, 5);
  g.fillStyle(EPOXY_LIT, 1); g.fillRect(x - 18, y - 6, 36, 20);
  // Crossed exchange arrows on the face.
  const c = ready ? GOLD_LIT : dim(GOLD, 0.5);
  g.lineStyle(2, c, 1);
  g.lineBetween(x - 12, y, x + 12, y); g.fillStyle(c, 1); g.fillTriangle(x + 14, y, x + 8, y - 4, x + 8, y + 4);
  g.lineBetween(x - 12, y + 8, x + 12, y + 8); g.fillTriangle(x - 14, y + 8, x - 8, y + 4, x - 8, y + 12);
  // The register valve in its cage.
  valve(g, x, y - 20, 0.6, armed ? 1 : ready ? 0.6 : 0.2, false);
  for (let i = -1; i <= 1; i++) { g.lineStyle(1, SOLDER_DARK, 1); g.lineBetween(x + i * 7, y - 44, x + i * 7, y - 20); }
  g.lineStyle(1.5, SOLDER, 1); g.strokeEllipse(x, y - 44, 20, 5);
  // The key-lever: down while it re-arms.
  const down = !ready;
  g.fillStyle(GOLD_DARK, 1); g.fillCircle(x + 20, y + 16, 4);
  g.lineStyle(4, GOLD, 1); g.lineBetween(x + 20, y + 16, x + 30, down ? y + 22 : y + 4);
  g.fillStyle(lit(GOLD, 0.2), 1); g.fillCircle(x + 30, down ? y + 22 : y + 4, 4);
  if (armed) {
    const f = clamp((time - armed.at) / (armed.fire - armed.at), 0, 1);
    glow(g, x, y - 26, 26, FILAMENT, 0.08 + f * 0.08, 3);
    g.lineStyle(3, NIXIE, 1);
    g.beginPath(); g.arc(x, y, KEY_R + 4, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); g.strokePath();
  } else if (ready) {
    g.lineStyle(1.5, GOLD_LIT, 0.35 + Math.sin(time / 240) * 0.2); g.strokeCircle(x, y, KEY_R + 4);
  }
  segText(g, x - 10, y + 28, 'AC', 8, SILK, 0.5);
}

export const FALLEN_EXCHANGE: GimmickDef = {
  id: ID,
  rules: 'Strike an exchange key: a second later you swap places if in reach, and the other lands in a store cell that strikes. Walk out. At half, reach grows.',
  make,
};
