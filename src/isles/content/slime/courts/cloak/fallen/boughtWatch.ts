import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { BRASS, BRASS_LIT, IRON, IRON_LIT, LAMP, MASK_TEAL, PAPER, TIMBER, TIMBER_DARK, WAX, WAX_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Bought and Sold — Watch-Captain Garnet Spangle, who in the King's telling ran the Cloak Court's
 * night watch and never once arrested anybody who had paid him.
 *
 * Two of his constables walk the yard with rattle, lantern and truncheon. A constable serves
 * whoever paid him last and walks down the *other* one; when he reaches them he lifts his
 * truncheon (a beat to step away), then claps the irons on: held, and cudgelled. The Captain
 * starts with both of them in his pocket.
 *
 * But a watchman's loyalty is a coin. Strike a constable and you have paid him: his armband
 * turns your colour and he turns round and walks the Captain down instead. The bot pays them
 * back the same way, so it is a running auction. Past half the price goes up — each constable
 * now wants two coins to change sides — and a third comes out of the watch-house.
 */

const ID = fallenId('cloak', 'bought-watch');
const SPEED = 118;
const REACH = 40;
const LIFT_MS = 620;
const CATCH_R = 64;
const BOOK_MS = 1600;
const SWITCH_CD = 900;

type Side = 'player' | 'npc';
interface Constable {
  x: number; y: number;
  paid: Side;
  /** Coins paid toward changing sides (past half it takes two). */
  coins: number;
  liftAt: number;
  /** Writing it up after an arrest, or knocked about by a fresh coin: stands still until then. */
  restUntil: number;
  switchedAt: number;
  walk: number;
  target: StrikeTarget;
  coinFly: { from: Side; at: number } | null;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const watch: Constable[] = [];
  let pricey = false;
  const cuffed: { f: Fighter; at: number }[] = [];

  const quarry = (c: Constable): Fighter => (c.paid === 'player' ? npc : player);

  function addConstable(x: number, y: number): void {
    const c: Constable = {
      x, y, paid: 'npc', coins: 0, liftAt: 0, restUntil: 0, switchedAt: -1e9, walk: 0, coinFly: null,
      target: ctx.target({
        x, y: y - 26, r: 24,
        onStruck: (by) => pay(c, by),
      }),
    };
    watch.push(c);
  }

  function pay(c: Constable, by: Side): void {
    const now = tk.now;
    if (c.paid === by || now - c.switchedAt < SWITCH_CD) return;
    c.coinFly = { from: by, at: now };
    c.coins++;
    ctx.sfx('money');
    const need = pricey ? 2 : 1;
    if (c.coins < need) { ctx.float(c.x, c.y - 76, `${c.coins}/${need}`, '#f4d890'); return; }
    c.coins = 0;
    c.paid = by;
    c.switchedAt = now;
    c.liftAt = 0;
    c.restUntil = now + 450;
    ctx.float(c.x, c.y - 76, by === 'player' ? 'BOUGHT' : 'BOUGHT BACK', by === 'player' ? '#9ff0e8' : '#ff9a9a');
  }

  function arrest(c: Constable, time: number): void {
    const f = quarry(c);
    c.liftAt = 0;
    c.restUntil = time + BOOK_MS;
    if (!alive(f) || dist(c.x, c.y, f.x, f.y) > CATCH_R) { ctx.sfx('whoosh'); return; }
    ctx.sfx('chain');
    cuffed.push({ f, at: time });
    if (f === player) { tk.hitPlayer(15, f.x, f.y); ctx.root(player, 1100); }
    else { ctx.hit(npc, 28, f.x, f.y); ctx.root(npc, 1100); ctx.float(f.x, f.y - 60, 'IN IRONS', '#9ff0e8'); }
  }

  addConstable(W * 0.2, top + (H - top) * 0.3);
  addConstable(W * 0.8, top + (H - top) * 0.75);

  return {
    update(time, dt) {
      const s = stepDt(dt);
      if (!pricey && npc.hp < npc.maxHp * 0.5) {
        pricey = true;
        for (const c of watch) c.coins = 0;
        addConstable(W / 2, H - 50);
        ctx.banner('THE PRICE GOES UP — TWO COINS A MAN', '#f4d890');
        ctx.sfx('boss-phase');
      }
      for (const c of watch) {
        const f = quarry(c);
        if (c.liftAt) { if (time >= c.liftAt) arrest(c, time); }
        else if (time >= c.restUntil && alive(f)) {
          const d = dist(c.x, c.y, f.x, f.y);
          if (d < REACH) { c.liftAt = time + tk.warn(LIFT_MS); ctx.sfx('status-debuff'); }
          else {
            c.x += ((f.x - c.x) / d) * SPEED * s;
            c.y += ((f.y - c.y) / d) * SPEED * s;
            c.walk += s * 9;
          }
        }
        // Keep two constables from walking through each other.
        for (const o of watch) {
          if (o === c) continue;
          const d = dist(c.x, c.y, o.x, o.y);
          if (d > 0 && d < 40) { c.x += ((c.x - o.x) / d) * (40 - d) * 0.5; c.y += ((c.y - o.y) / d) * (40 - d) * 0.5; }
        }
        c.x = tk.clampX(c.x); c.y = tk.clampY(c.y);
        c.target.moveTo(c.x, c.y - 26);
        if (c.coinFly && time - c.coinFly.at > 500) c.coinFly = null;
      }
      for (let i = cuffed.length - 1; i >= 0; i--) if (time - cuffed[i].at > 1100) cuffed.splice(i, 1);
    },

    npcSeek() {
      if (!alive(player)) return null;
      // A constable walking him down: close in on that constable to pay him back, keeping out of truncheon reach.
      let worst: Constable | null = null, wd = Infinity;
      for (const c of watch) {
        if (c.paid !== 'player') continue;
        const d = dist(c.x, c.y, npc.x, npc.y);
        if (d < wd) { wd = d; worst = c; }
      }
      if (worst && wd < 420) {
        const a = Math.atan2(npc.y - worst.y, npc.x - worst.x);
        const want = worst.liftAt ? CATCH_R + 60 : 110;
        return { x: tk.clampX(worst.x + Math.cos(a) * want), y: tk.clampY(worst.y + Math.sin(a) * want) };
      }
      // All bought: keep the player between himself and his constables, so they reach you first.
      const mine = watch.filter((c) => c.paid === 'npc');
      if (mine.length) {
        const mx = mine.reduce((a, c) => a + c.x, 0) / mine.length, my = mine.reduce((a, c) => a + c.y, 0) / mine.length;
        const d = Math.max(1, dist(mx, my, player.x, player.y));
        return { x: tk.clampX(player.x + ((player.x - mx) / d) * 200), y: tk.clampY(player.y + ((player.y - my) / d) * 200) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const c of watch) {
        const f = quarry(c);
        const col = c.paid === 'player' ? MASK_TEAL : WAX;
        // The lantern's pool, and his beat toward his quarry chalked ahead of him.
        glow(g, c.x + 14, c.y - 4, 46, LAMP, 0.05, 3);
        if (alive(f) && !c.liftAt) {
          const a = Math.atan2(f.y - c.y, f.x - c.x);
          for (let i = 1; i <= 3; i++) { g.fillStyle(col, 0.3 - i * 0.06); g.fillCircle(c.x + Math.cos(a) * i * 16, c.y + Math.sin(a) * i * 16, 3); }
        }
        if (c.liftAt) {
          const k = clamp(1 - (c.liftAt - time) / tk.warn(LIFT_MS), 0, 1);
          g.fillStyle(IRON_LIT, 0.08 + k * 0.14); g.fillCircle(c.x, c.y, CATCH_R);
          g.lineStyle(2, col, 0.5 + k * 0.5); g.strokeCircle(c.x, c.y, CATCH_R);
          g.lineStyle(3, IRON_LIT, 0.9);
          g.beginPath(); g.arc(c.x, c.y, CATCH_R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
        }
      }
    },

    drawAir(g, time) {
      for (const c of watch) drawConstable(g, c, time, pricey);
      // Irons on the cuffed: two cuffs and a bar at the wrists.
      for (const k of cuffed) {
        const a = 1 - (time - k.at) / 1100;
        const x = k.f.x, y = k.f.y - 22;
        g.lineStyle(3, IRON, a); g.strokeCircle(x - 9, y, 6); g.strokeCircle(x + 9, y, 6);
        g.lineStyle(2, IRON_LIT, a); g.lineBetween(x - 3, y, x + 3, y);
      }
    },

    drawHud(g) {
      // The watch roll: a little rosette per constable in whoever's colour he wears.
      const x0 = W / 2 - (watch.length - 1) * 18, y = top + 18;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 18, y - 14, (watch.length - 1) * 36 + 36, 28, 8);
      watch.forEach((c, i) => {
        const x = x0 + i * 36;
        const col = c.paid === 'player' ? MASK_TEAL : WAX;
        g.fillStyle(col, 1);
        for (let p = 0; p < 8; p++) { const a = p * 0.785; g.fillCircle(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 3.6); }
        g.fillStyle(BRASS, 1); g.fillCircle(x, y, 5);
        if (pricey && c.coins > 0) { g.fillStyle(BRASS_LIT, 1); g.fillCircle(x + 11, y - 9, 3); }
      });
    },

    destroy() { for (const c of watch) c.target.remove(); },
  };
}

/**
 * A constable of the night watch: caped greatcoat, a tall leather hat with a brass plate, a
 * lantern at one hand and a truncheon at the other, a rattle on his belt, his armband in his
 * paymaster's colour. The truncheon goes up before the irons come down.
 */
function drawConstable(g: G, c: Constable, time: number, pricey: boolean): void {
  const x = c.x, y = c.y;
  const col = c.paid === 'player' ? MASK_TEAL : WAX;
  const bob = Math.abs(Math.sin(c.walk)) * 2;
  shadow(g, x, y + 2, 34, 10, 0.32);
  // Legs.
  g.lineStyle(5, 0x1b1922, 1);
  g.lineBetween(x - 5, y - 16, x - 6 + Math.sin(c.walk) * 4, y); g.lineBetween(x + 5, y - 16, x + 6 - Math.sin(c.walk) * 4, y);
  // Greatcoat with its shoulder cape.
  g.fillStyle(0x24263a, 1); g.fillPoints([{ x: x - 13, y: y - 12 }, { x: x + 13, y: y - 12 }, { x: x + 10, y: y - 44 - bob }, { x: x - 10, y: y - 44 - bob }], true);
  g.fillStyle(0x31344e, 1); g.fillEllipse(x, y - 42 - bob, 30, 14);
  g.fillStyle(BRASS, 1); for (let i = 0; i < 3; i++) g.fillCircle(x, y - 36 + i * 8 - bob, 1.4);
  // Belt, rattle.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 12, y - 24 - bob, 24, 3);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 15, y - 26 - bob, 4, 9);
  // Armband in his paymaster's colour.
  g.fillStyle(col, 1); g.fillRect(x - 15, y - 38 - bob, 6, 5);
  if (time - c.switchedAt < 600) glow(g, x - 12, y - 36 - bob, 14, col, 0.2, 2);
  // Head and the tall hat.
  g.fillStyle(0xd8c4a8, 1); g.fillCircle(x, y - 52 - bob, 7);
  g.fillStyle(0x15131c, 1); g.fillRect(x - 7, y - 72 - bob, 14, 16); g.fillRect(x - 10, y - 58 - bob, 20, 3);
  g.fillStyle(BRASS_LIT, 1); g.fillRect(x - 3, y - 68 - bob, 6, 6);
  g.fillStyle(0x1b1922, 1); g.fillCircle(x - 2.5, y - 52 - bob, 1); g.fillCircle(x + 2.5, y - 52 - bob, 1);
  // Lantern hand.
  g.lineStyle(1.5, IRON, 1); g.lineBetween(x + 12, y - 34 - bob, x + 15, y - 22);
  g.fillStyle(IRON, 1); g.fillRect(x + 11, y - 22, 8, 10);
  g.fillStyle(LAMP, 0.9 + Math.sin(time / 120) * 0.1); g.fillRect(x + 12.5, y - 20.5, 5, 7);
  // Truncheon: hanging, or raised over his head while he lifts.
  const lift = c.liftAt ? clamp(1 - (c.liftAt - time) / 620, 0, 1) : 0;
  const ang = -0.3 - lift * 2.2;
  const hx = x - 12, hy = y - 34 - bob - lift * 10;
  g.lineStyle(5, TIMBER, 1); g.lineBetween(hx, hy, hx + Math.cos(ang + Math.PI) * 20, hy + Math.sin(ang + Math.PI) * 20 * (lift ? 1 : -1));
  g.fillStyle(0xd8c4a8, 1); g.fillCircle(hx, hy, 3);
  // The purse at his hip: the price, and any coin already in it.
  g.fillStyle(0x5a4030, 1); g.fillCircle(x + 8, y - 18 - bob, 4);
  if (pricey && c.coins > 0) { g.fillStyle(BRASS_LIT, 1); g.fillCircle(x + 8, y - 24 - bob, 2.4); }
  // A coin in flight to him from whoever paid.
  if (c.coinFly) {
    const k = clamp((time - c.coinFly.at) / 500, 0, 1);
    g.fillStyle(BRASS_LIT, 1 - k * 0.5); g.fillEllipse(x + 8, y - 50 - Math.sin(k * Math.PI) * 30 - bob, 7 * Math.abs(Math.cos(k * 12)) + 1, 7);
  }
  // A wax seal on his warrant while booking someone.
  if (!c.liftAt && time < c.restUntil) {
    g.fillStyle(PAPER, 1); g.fillRect(x - 6, y - 30 - bob, 12, 8);
    g.fillStyle(c.paid === 'player' ? MASK_TEAL : WAX_LIT, 1); g.fillCircle(x, y - 26 - bob, 2);
  }
}

export const FALLEN_BOUGHT_WATCH: GimmickDef = {
  id: ID,
  rules: 'Each constable walks down whoever did not pay him and claps on the irons. Strike one to pay him: he turns on the Captain. At half, two coins a man.',
  make,
};
