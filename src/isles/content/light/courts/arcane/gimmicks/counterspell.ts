import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, lit, type G } from '../../../../../art/IsleArt';
import { rune } from '../art';
import { CHALK, GOLD, MANA_LIT, SIDE_NPC, SIDE_PLAYER, SLATE_DARK, SLATE_DEEP, VIOLET, VIOLET_LIT } from '../palette';
import { alive, asSlot, clamp, dist, keyGlyph, keyedSlots, slotOf, stepDt, type Slot } from '../util';

/**
 * Counterspell — Abjurer Null.
 *
 * A slate rune hovers over Null's head with one of YOUR keys chalked on it — E, R, F or Q. That
 * key is warded: cast it while you stand inside Null's null-circle and the spell fizzles. The
 * ward drinks it (Null barely feels it), the backlash stings, and you are silenced and left open.
 * The warded key turns every few seconds — the rune spins and the next letter ghosts in first.
 *
 * But an abjurer's ward cuts both ways. Null's own rune floats over YOU, naming one of HIS keys,
 * with a null-circle round you. Watch it: stand close when his warded key comes round and let
 * him cast into it — or step outside his circle to cast your own warded key safely.
 */

const RANGE = 340;
const SIL_MS = 2200;
const EXPOSED_MS = 2200;
const DRINK_MS = 650;
const BACKLASH = 5;

interface Ward {
  /** The key it forbids, and the next one, ghosting in. */
  key: Slot;
  next: Slot;
  turnAt: number;
  period: number;
  /** Last fizzle, for the flare. */
  flareAt: number;
  spin: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const range = ctx.hard ? 380 : RANGE;
  const pick = (from: Slot[], not: Slot): Slot => {
    const pool = from.filter((s) => s !== not);
    return pool[Math.floor(rng() * pool.length)] ?? from[0];
  };
  const pSlots = keyedSlots(player);
  const nSlots = keyedSlots(npc);
  /** Hovers over Null; names a PLAYER key. */
  const overNpc: Ward = { key: pSlots[0], next: pSlots[1] ?? pSlots[0], turnAt: 0, period: ctx.hard ? 4200 : 5200, flareAt: -9999, spin: 0 };
  /** Hovers over the player; names a FOE key. */
  const overPlayer: Ward = { key: nSlots[0], next: nSlots[1] ?? nSlots[0], turnAt: 0, period: 6400, flareAt: -9999, spin: 0 };
  const exposedUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const drinkUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let started = false;
  const fizzles = { player: 0, npc: 0 };

  const now = () => ctx.scene.time.now;

  function turn(w: Ward, slots: Slot[], time: number): void {
    w.key = w.next;
    w.next = pick(slots, w.key);
    w.turnAt = time + w.period;
    w.spin = 1;
  }

  function fizzle(caster: Fighter, w: Ward, slots: Slot[], time: number): void {
    const other = caster === player ? npc : player;
    ctx.silence(caster, SIL_MS + (ctx.hard && caster === player ? 400 : 0));
    exposedUntil.set(caster, time + EXPOSED_MS);
    drinkUntil.set(other, time + DRINK_MS);
    ctx.hit(caster, BACKLASH, caster.x, caster.y - 20);
    ctx.float(caster.x, caster.y - 52, 'FIZZLE', '#cfe8ff');
    ctx.flash(caster.x, caster.y, 0xe8fdff);
    ctx.sfx('hush');
    w.flareAt = time;
    if (caster === player) fizzles.player++; else fizzles.npc++;
    // The rune rewrites itself at once: no double jeopardy.
    turn(w, slots, time);
  }

  /** Draw one warding rune: a slate plate on a thread of light, the key chalked on it. */
  function drawRune(g: G, bearer: Fighter, w: Ward, side: number, time: number): void {
    const x = bearer.x, y = bearer.y - 70 + Math.sin(time / 420) * 3;
    const warn = clamp(1 - (w.turnAt - time) / 900, 0, 1);
    const flare = clamp(1 - (time - w.flareAt) / 600, 0, 1);
    const spin = w.spin;
    const sx = Math.max(0.15, Math.abs(Math.cos(spin * Math.PI)));
    // Thread down to the bearer.
    g.lineStyle(1, VIOLET_LIT, 0.4); g.lineBetween(x, y + 16, bearer.x, bearer.y - 28);
    glow(g, x, y, 22 + flare * 14, side, 0.05 + flare * 0.1, 3);
    // The plate.
    g.fillStyle(SLATE_DEEP, 1); g.fillRoundedRect(x - 15 * sx, y - 17, 30 * sx, 34, 5);
    g.fillStyle(SLATE_DARK, 1); g.fillRoundedRect(x - 12 * sx, y - 14, 24 * sx, 28, 4);
    g.lineStyle(2, side, 0.9); g.strokeRoundedRect(x - 15 * sx, y - 17, 30 * sx, 34, 5);
    if (sx > 0.5) keyGlyph(g, w.key, x, y, 16, flare > 0 ? 0xffffff : CHALK, 1, 2.2);
    // The next key, ghosting in beside it.
    if (warn > 0) {
      const gx = x + 26, gy = y - 8;
      g.fillStyle(SLATE_DEEP, 0.4 * warn); g.fillRoundedRect(gx - 9, gy - 10, 18, 20, 4);
      keyGlyph(g, w.next, gx, gy, 10, side, 0.4 + warn * 0.5, 1.4);
      g.lineStyle(1, side, 0.5 * warn); g.beginPath(); g.arc(x, y, 22, -Math.PI / 2, -Math.PI / 2 + warn * Math.PI * 2, false); g.strokePath();
    }
    // Runes orbiting the plate.
    for (let i = 0; i < 4; i++) {
      const a = time / 700 + (i / 4) * Math.PI * 2;
      rune(g, x + Math.cos(a) * 24, y + Math.sin(a) * 9, 3, i * 2 + 1, side, 0.6, 1);
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        overNpc.turnAt = time + overNpc.period;
        overPlayer.turnAt = time + overPlayer.period * 0.6;
        ctx.banner('THE RUNES ARE WRITTEN', '#cfe8ff');
      }
      for (const [w, slots] of [[overNpc, pSlots], [overPlayer, nSlots]] as [Ward, Slot[]][]) {
        if (time >= w.turnAt) { turn(w, slots, time); ctx.sfx('crystal-chime'); }
        w.spin = Math.max(0, w.spin - dt * 2.2);
      }
    },

    onPlayerCast(abilityId, slotRaw) {
      const s = asSlot(slotRaw) ?? slotOf(player, abilityId);
      if (!s || s === 'click' || s !== overNpc.key || !alive(npc) || !alive(player)) return;
      if (dist(player.x, player.y, npc.x, npc.y) > range) return;
      fizzle(player, overNpc, pSlots, now());
    },

    onNpcCast(abilityId) {
      const s = slotOf(npc, abilityId);
      if (!s || s === 'click' || s !== overPlayer.key || !alive(npc) || !alive(player)) return;
      if (dist(player.x, player.y, npc.x, npc.y) > range) return;
      fizzle(npc, overPlayer, nSlots, now());
    },

    playerTakenMult() {
      const t = now();
      return (t < (exposedUntil.get(player) ?? 0) ? 1.3 : 1) * (t < (drinkUntil.get(player) ?? 0) ? 0.3 : 1);
    },
    npcTakenMult() {
      const t = now();
      return (t < (exposedUntil.get(npc) ?? 0) ? 1.3 : 1) * (t < (drinkUntil.get(npc) ?? 0) ? 0.3 : 1);
    },

    npcSeek() {
      // Null keeps you inside his circle, but at arm's length: he wants to watch your hands.
      if (!alive(player) || !alive(npc)) return null;
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + 0.25;
      const d = range * 0.7;
      return { x: clamp(player.x + Math.cos(a) * d, 60, W - 60), y: clamp(player.y + Math.sin(a) * d, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The two null-circles: chalk rings round each rune-bearer, the letter-side's colour.
      for (const [f, c] of [[npc, SIDE_PLAYER], [player, SIDE_NPC]] as [Fighter, number][]) {
        if (!alive(f)) continue;
        const other = f === npc ? player : npc;
        const inside = dist(f.x, f.y, other.x, other.y) <= range;
        g.lineStyle(inside ? 2 : 1.2, c, inside ? 0.32 : 0.14);
        g.strokeEllipse(f.x, f.y + 6, range * 2, range * 1.5);
        for (let i = 0; i < 16; i++) {
          const a = time / 4000 * (f === npc ? 1 : -1) + (i / 16) * Math.PI * 2;
          rune(g, f.x + Math.cos(a) * range, f.y + 6 + Math.sin(a) * range * 0.75, 5, i, c, inside ? 0.4 : 0.15, 1.2);
        }
      }
      // Under each fighter, a little ward-seal on the flags.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        g.lineStyle(1.2, VIOLET, 0.35); g.strokeEllipse(f.x, f.y + 8, 50, 18);
      }
    },

    drawAir(g, time) {
      if (alive(npc)) drawRune(g, npc, overNpc, SIDE_PLAYER, time);
      if (alive(player)) drawRune(g, player, overPlayer, SIDE_NPC, time);
      // Fizzle cracks: a ring of chalk shards round a fizzled caster.
      for (const [f, w] of [[player, overNpc], [npc, overPlayer]] as [Fighter, Ward][]) {
        const k = (time - w.flareAt) / 700;
        if (k < 0 || k > 1 || !alive(f)) continue;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + i;
          const r0 = 14 + k * 46;
          g.lineStyle(2 * (1 - k), lit(MANA_LIT, 0.3), 1 - k);
          g.lineBetween(f.x + Math.cos(a) * r0, f.y - 10 + Math.sin(a) * r0, f.x + Math.cos(a) * (r0 + 10), f.y - 10 + Math.sin(a) * (r0 + 10));
        }
      }
      // An exposed caster wears a broken ring.
      for (const f of [player, npc]) {
        if (!alive(f) || now() >= (exposedUntil.get(f) ?? 0)) continue;
        g.lineStyle(2, GOLD, 0.55 + Math.sin(time / 80) * 0.25);
        for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(f.x, f.y - 6, 30, i * Math.PI / 2 + 0.2, i * Math.PI / 2 + 1.2, false); g.strokePath(); }
      }
    },

    drawHud(g, time) {
      // Two plates: your warded key (left), his (right).
      for (const [w, x, c] of [[overNpc, 36, SIDE_PLAYER], [overPlayer, W - 36, SIDE_NPC]] as [Ward, number, number][]) {
        const y = top + 26;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 20, y - 20, 40, 40, 6);
        g.lineStyle(2, c, 0.9); g.strokeRoundedRect(x - 20, y - 20, 40, 40, 6);
        keyGlyph(g, w.key, x, y, 18, 0xffffff, 1, 2.4);
        // A slash: forbidden.
        g.lineStyle(2, c, 0.8); g.lineBetween(x - 15, y + 15, x + 15, y - 15);
        const k = clamp((w.turnAt - time) / w.period, 0, 1);
        g.lineStyle(3, c, 0.8); g.beginPath(); g.arc(x, y, 25, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },
  };
}

export const COUNTERSPELL: GimmickDef = {
  id: 'arcane-counterspell',
  rules: 'A rune over each fighter names one of the other\'s keys. Cast your warded key inside the foe\'s circle and it fizzles: silenced, stung and exposed.',
  make,
};
