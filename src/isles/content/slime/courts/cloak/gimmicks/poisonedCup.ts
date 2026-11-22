import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import { glow } from '../../../../../art/IsleArt';
import { cupTable, goblet } from '../art';
import { SUGAR, VENOM, WINE, WINE_LIT } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Poisoned Cup — Taster Goblet.
 *
 * Three tables stand about the room, each with a pair of brimming cups. In every pair one cup is
 * sweet — it heals whoever drinks it — and the other is laced with the Matriarch's venom: a sip
 * burns for seconds and drags at the legs. Walk up to a cup and you drink it. When a table's
 * pair is gone, Goblet's unseen hand refills it, and shuffles which is which.
 *
 * Goblet is the Prince's taster: she knows. There is a tell, faint, for anyone who watches the
 * wine: venom does not lie still — now and then a single bead of green rises in the poisoned
 * cup and breaks. And a cup can be struck over: spill the sweet cup she is walking to, or spill
 * the venom where she stands — a spilt dose burns the floor for a few seconds.
 */

const DRINK_R = 26;
const REFILL_MS = 4200;
const POISON_MS = 3600;
const TICK_MS = 600;

interface Cup { x: number; y: number; bad: boolean; full: boolean; bubbleSeed: number; target: StrikeTarget | null }
interface Table { x: number; y: number; cups: Cup[]; emptyAt: number }
interface Spill { x: number; y: number; at: number; bad: boolean; lastTick: Map<Fighter, number> }
interface Venom { until: number; nextTick: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const tables: Table[] = [
    { x: 230, y: top + 170, cups: [], emptyAt: -1 },
    { x: W - 230, y: top + 170, cups: [], emptyAt: -1 },
    { x: W / 2, y: H - 110, cups: [], emptyAt: -1 },
  ];
  const spills: Spill[] = [];
  const venom = new Map<Fighter, Venom>();
  const sweetUntil = new Map<Fighter, number>();
  let nextSip = 0;
  let started = false;

  function pour(t: Table): void {
    const badSide = rng() < 0.5 ? 0 : 1;
    for (const c of t.cups) c.target?.remove();
    t.cups = [0, 1].map((i) => {
      const c: Cup = { x: t.x + (i ? 15 : -15), y: t.y - 16, bad: i === badSide, full: true, bubbleSeed: rng() * 10, target: null };
      c.target = ctx.target({ x: c.x, y: c.y - 8, r: 12, passThrough: true, onStruck: () => spill(c) });
      return c;
    });
    t.emptyAt = -1;
  }

  function empty(t: Table, c: Cup): void {
    c.full = false;
    c.target?.remove();
    c.target = null;
    if (t.cups.every((o) => !o.full)) t.emptyAt = ctx.scene.time.now;
  }

  function spill(c: Cup): void {
    if (!c.full) return;
    const t = tables.find((o) => o.cups.includes(c));
    if (!t) return;
    spills.push({ x: c.x, y: c.y + 26, at: ctx.scene.time.now, bad: c.bad, lastTick: new Map() });
    ctx.float(c.x, c.y - 30, c.bad ? 'SPILT — IT HISSES' : 'SPILT', c.bad ? '#b8f070' : '#ffc0d0');
    ctx.sfx(c.bad ? 'sizzle' : 'splash');
    empty(t, c);
  }

  function poison(f: Fighter, time: number): void {
    venom.set(f, { until: time + POISON_MS, nextTick: time + TICK_MS });
    ctx.hit(f, ctx.hard ? 6 : 5, f.x, f.y);
    if (f === player) ctx.tk.slowPlayer(0.75, POISON_MS);
  }

  function drink(f: Fighter, t: Table, c: Cup, time: number): void {
    empty(t, c);
    if (c.bad) {
      poison(f, time);
      ctx.float(f.x, f.y - 56, 'VENOM', '#b8f070');
      ctx.sfx('status-poison');
    } else {
      ctx.heal(f, ctx.hard ? 12 : 14);
      sweetUntil.set(f, time + 700);
      ctx.float(f.x, f.y - 56, 'SWEET', '#ffc0d0');
      ctx.sfx('heal');
    }
  }

  const goodCups = () => tables.flatMap((t) => t.cups.filter((c) => c.full && !c.bad));

  return {
    update(time) {
      if (!started) { started = true; for (const t of tables) pour(t); nextSip = time + 7000; }
      for (const t of tables) {
        if (t.emptyAt >= 0 && time - t.emptyAt > REFILL_MS) { pour(t); ctx.sfx('bubble'); }
        for (const c of t.cups) {
          if (!c.full) continue;
          for (const f of [player, npc]) {
            if (alive(f) && c.full && dist(f.x, f.y, c.x, c.y + 16) < DRINK_R) drink(f, t, c, time);
          }
        }
      }
      // Venom burns in ticks.
      for (const [f, v] of venom) {
        if (time >= v.until || !alive(f)) { venom.delete(f); continue; }
        if (time >= v.nextTick) { v.nextTick += TICK_MS; ctx.hit(f, ctx.hard ? 4 : 3, f.x, f.y); }
      }
      // Spilt venom burns whoever stands in it.
      for (let i = spills.length - 1; i >= 0; i--) {
        const s = spills[i];
        if (time - s.at > 3200) { spills.splice(i, 1); continue; }
        if (!s.bad) continue;
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, s.x, s.y) > 40) continue;
          if (time - (s.lastTick.get(f) ?? -9999) < 500) continue;
          s.lastTick.set(f, time);
          ctx.hit(f, 3, f.x, f.y);
        }
      }
      if (time > nextSip) nextSip = time + 9000;
    },

    npcSpeedMult() { return venom.has(npc) ? 0.75 : 1; },

    npcSeek() {
      if (!alive(npc)) return null;
      const now = ctx.scene.time.now;
      // The taster knows: thirsty (hurt, or her sip is due) — the nearest sweet cup.
      const thirsty = npc.hp < npc.maxHp * 0.9 || now > nextSip - 2500;
      const sweet = goodCups();
      if (thirsty && sweet.length) {
        let best = sweet[0], bd = Infinity;
        for (const c of sweet) { const d = dist(c.x, c.y, npc.x, npc.y) - dist(c.x, c.y, player.x, player.y) * 0.3; if (d < bd) { bd = d; best = c; } }
        return { x: best.x, y: best.y + 16 };
      }
      // Otherwise she lingers by a poisoned cup, hoping you'll reach for it.
      const bad = tables.flatMap((t) => t.cups.filter((c) => c.full && c.bad));
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      if (bad.length && dist(npc.x, npc.y, player.x, player.y) > 140) {
        const c = bad[0];
        return { x: clamp(c.x + 50, 60, W - 60), y: clamp(c.y + 40, top + 50, H - 40) };
      }
      return { x: clamp(player.x + Math.cos(a) * 180, 60, W - 60), y: clamp(player.y + Math.sin(a) * 150, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const s of spills) {
        const k = clamp((time - s.at) / 3200, 0, 1);
        g.fillStyle(s.bad ? 0x3a5a1a : WINE, 0.55 * (1 - k)); g.fillEllipse(s.x, s.y, 74, 26);
        g.fillStyle(s.bad ? VENOM : WINE_LIT, 0.35 * (1 - k)); g.fillEllipse(s.x - 6, s.y - 2, 40, 10);
        if (s.bad) for (let i = 0; i < 4; i++) {
          const ph = (time / 500 + i / 4) % 1;
          g.fillStyle(VENOM, 0.6 * (1 - ph) * (1 - k)); g.fillCircle(s.x - 24 + i * 16, s.y - ph * 18, 2);
        }
      }
      for (const t of tables) cupTable(g, t.x, t.y, 1);
    },

    drawAir(g, time) {
      for (const t of tables) {
        for (const c of t.cups) {
          if (!c.full) { goblet(g, c.x, c.y + 2, 1, WINE, 0, 0.7); continue; }
          // The bad cup's wine is a breath darker, and a bead of venom rises in it now and then.
          goblet(g, c.x, c.y, 1, c.bad ? 0x5e1430 : WINE);
          if (c.bad) {
            const ph = ((time / 1700) + c.bubbleSeed) % 1;
            if (ph < 0.25) {
              const k = ph / 0.25;
              g.fillStyle(VENOM, 0.8 * (1 - k)); g.fillCircle(c.x + Math.sin(c.bubbleSeed) * 2, c.y - 15 - k * 3, 1.3 + k * 0.6);
            }
          }
        }
        // The refill: a hand-less pour from above, a ribbon of wine.
        if (t.emptyAt >= 0 && time - t.emptyAt > REFILL_MS - 600) {
          const k = (time - t.emptyAt - (REFILL_MS - 600)) / 600;
          g.lineStyle(3, WINE_LIT, 0.7); g.lineBetween(t.x, t.y - 90, t.x, t.y - 90 + k * 70);
        }
      }
      // The venom on whoever drank it: green bubbles rising off them.
      for (const [f, v] of venom) {
        if (!alive(f)) continue;
        const left = clamp((v.until - time) / POISON_MS, 0, 1);
        for (let i = 0; i < 5; i++) {
          const ph = (time / 700 + i / 5) % 1;
          g.fillStyle(VENOM, 0.75 * (1 - ph) * left); g.fillCircle(f.x - 12 + i * 6, f.y - 30 - ph * 30, 2.2);
        }
        g.lineStyle(2, VENOM, 0.4 * left); g.strokeEllipse(f.x, f.y + 2, 40, 13);
      }
      for (const [f, until] of sweetUntil) {
        if (time > until || !alive(f)) continue;
        const k = 1 - (until - time) / 700;
        glow(g, f.x, f.y - 30, 26, 0xffc0d0, 0.06 * (1 - k), 3);
        for (let i = 0; i < 6; i++) { g.fillStyle(SUGAR, 1 - k); g.fillCircle(f.x + Math.cos(i) * (14 + k * 20), f.y - 30 + Math.sin(i) * 10 - k * 14, 1.6); }
      }
    },

    destroy() { for (const t of tables) for (const c of t.cups) c.target?.remove(); },
  };
}

export const POISONED_CUP: GimmickDef = {
  id: 'cloak-poisoned-cup',
  rules: 'Cups stand in pairs: one heals, one is venom. Goblet knows which — watch the wine for a rising bead. Strike a cup to spill it; spilt venom burns the floor.',
  make,
};
