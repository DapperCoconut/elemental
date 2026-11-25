import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { CARD_RED, GILT, GILT_DARK, GILT_LIT, IVORY, MIND_LIT, VELVET, VELVET_DARK } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Hot and Cold — Wrist-Reader Amity Treffry, the muscle-reader of the booth road. She finds a
 * hidden thing by holding the wrist of someone who knows where it is: the pulse jumps as they
 * near it, though they swear it does not. In the King's telling she found every Lot a family
 * hid from the Draw, and walked the drum-men to it.
 *
 * A gilt pin is hidden somewhere in the yard. Nobody sees it — but each fighter's pulse shows,
 * a heartbeat ring at their feet and a trace on the HUD, quickening the nearer they stand to it.
 * Hers shows too: read her and you know when she is close. Whoever walks over the pin draws it
 * and drives it at the other: a ring at their feet, and if it lands they are pinned (held, and
 * read — they take more for a while). Then it is hidden again.
 *
 * The thing to dodge: a pulse running HOT is heard. Every few beats a reading-pin falls at the
 * hot fighter's feet, so searching costs blood — hers as much as yours. She reads *you* rather
 * than the floor: she heads for wherever your pulse ran hottest. Halfway down, two pins are hidden.
 */

const ID = fallenId('mind', 'pin');
const FIND_R = 30;
const HOT = 0.62;
const HOT_DROP_MS = 1350;
const DROP_WARN = 850;
const DROP_R = 50;
const PIN_WARN = 800;
const PIN_R = 58;
const READ_MS = 3500;

interface Hidden { x: number; y: number; foundAt: number }
interface Drop { x: number; y: number; at: number; hitAt: number; victim: Fighter; big: boolean; done: boolean }
interface Pulse { phase: number; beats: number[]; lastDrop: number; trace: number[] }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const pins: Hidden[] = [];
  const drops: Drop[] = [];
  const pulses = new Map<Fighter, Pulse>([
    [player, { phase: 0, beats: [], lastDrop: 0, trace: [] }],
    [npc, { phase: 0, beats: [], lastDrop: 0, trace: [] }],
  ]);
  const readUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let hottest: { x: number; y: number; h: number; at: number } = { x: W / 2, y: (top + H) / 2, h: 0, at: 0 };
  let started = false;
  let two = false;

  const heat = (f: Fighter) => {
    let best = 0;
    for (const p of pins) if (p.foundAt < 0) best = Math.max(best, clamp(1 - dist(f.x, f.y, p.x, p.y) / 520, 0, 1));
    return best;
  };
  const other = (f: Fighter) => (f === player ? npc : player);

  function hide(): Hidden {
    let x = W / 2, y = (top + H) / 2;
    for (let i = 0; i < 40; i++) {
      x = 90 + rng() * (W - 180); y = top + 70 + rng() * (H - top - 130);
      if (dist(x, y, player.x, player.y) > 240 && dist(x, y, npc.x, npc.y) > 240 && pins.every((p) => dist(x, y, p.x, p.y) > 200)) break;
    }
    return { x, y, foundAt: -1 };
  }

  function strike(d: Drop): void {
    d.done = true;
    const f = d.victim;
    if (!alive(f) || dist(f.x, f.y, d.x, d.y) > (d.big ? PIN_R : DROP_R)) return;
    if (d.big) {
      if (f === player) { tk.hitPlayer(24, f.x, f.y); tk.root(1300); }
      else { ctx.hit(npc, 34, f.x, f.y); ctx.root(npc, 1300); }
      readUntil.set(f, ctx.scene.time.now + READ_MS);
      ctx.sfx('stab');
      ctx.flash(f.x, f.y, GILT_LIT);
    } else {
      if (f === player) tk.hitPlayer(13, f.x, f.y); else ctx.hit(npc, 20, f.x, f.y);
      ctx.sfx('thorn');
    }
  }

  return {
    update(time, dt) {
      if (!started) { started = true; pins.push(hide()); }
      if (!two && npc.hp < npc.maxHp * 0.5) { two = true; pins.push(hide()); ctx.banner('TWO PINS HIDDEN', '#f4dc8a'); ctx.sfx('dice'); }
      for (const f of [player, npc]) {
        const p = pulses.get(f) as Pulse;
        if (!alive(f)) continue;
        const h = heat(f);
        const bps = 0.9 + h * 3.2;
        p.phase += dt * bps;
        let spike = 0;
        if (p.phase >= 1) {
          p.phase -= 1;
          p.beats.push(time);
          if (p.beats.length > 6) p.beats.shift();
          spike = 6 + h * 9;
          if (f === player && h > HOT) ctx.sfx('heartbeat');
        }
        // The trace: a QRS kick on each beat, a flat line between.
        p.trace.push(spike);
        if (p.trace.length > 116) p.trace.shift();
        if (h > HOT && time - p.lastDrop > HOT_DROP_MS) {
          p.lastDrop = time;
          drops.push({ x: f.x, y: f.y, at: time, hitAt: time + tk.warn(DROP_WARN), victim: f, big: false, done: false });
        }
        if (f === player && (h > hottest.h || time - hottest.at > 5000)) hottest = { x: f.x, y: f.y, h, at: time };
        // Found: the pin comes up in their hand and goes at the other.
        for (const pin of pins) {
          if (pin.foundAt >= 0 || dist(f.x, f.y, pin.x, pin.y) > FIND_R) continue;
          pin.foundAt = time;
          const o = other(f);
          ctx.sfx('crystal-chime');
          if (alive(o)) drops.push({ x: o.x, y: o.y, at: time, hitAt: time + tk.warn(PIN_WARN), victim: o, big: true, done: false });
          tk.schedule(1600, () => { const i = pins.indexOf(pin); if (i >= 0) pins[i] = hide(); hottest.h = 0; });
        }
      }
      for (const d of drops) if (!d.done && time >= d.hitAt) strike(d);
      for (let i = drops.length - 1; i >= 0; i--) if (drops[i].done && time > drops[i].hitAt + 400) drops.splice(i, 1);
    },

    playerTakenMult() { return ctx.scene.time.now < (readUntil.get(player) ?? 0) ? 1.35 : 1; },
    npcTakenMult() { return ctx.scene.time.now < (readUntil.get(npc) ?? 0) ? 1.35 : 1; },

    npcSeek() {
      if (!alive(npc)) return null;
      // Step out of a pin about to fall on her.
      for (const d of drops) {
        if (d.done || d.victim !== npc) continue;
        const r = d.big ? PIN_R : DROP_R;
        if (dist(npc.x, npc.y, d.x, d.y) < r + 26) {
          const a = Math.atan2(npc.y - d.y, npc.x - d.x) || 0.5;
          return { x: clamp(d.x + Math.cos(a) * (r + 70), 50, W - 50), y: clamp(d.y + Math.sin(a) * (r + 70), top + 40, H - 40) };
        }
      }
      // Muscle-reading: where your pulse ran hottest, if it ran hotter than hers.
      const mine = heat(npc);
      if (hottest.h > mine + 0.08) return { x: hottest.x, y: hottest.y };
      // Otherwise follow her own pulse uphill.
      let best: Pt | null = null, bh = mine;
      for (let a = 0; a < 8; a++) {
        const x = clamp(npc.x + Math.cos((a / 8) * Math.PI * 2) * 90, 60, W - 60);
        const y = clamp(npc.y + Math.sin((a / 8) * Math.PI * 2) * 90, top + 50, H - 50);
        let h = 0;
        for (const p of pins) if (p.foundAt < 0) h = Math.max(h, clamp(1 - dist(x, y, p.x, p.y) / 520, 0, 1));
        if (h > bh) { bh = h; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // Heartbeat rings at each fighter's feet: one ring per beat, rose when hot.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const p = pulses.get(f) as Pulse;
        const hot = heat(f) > HOT;
        for (const b of p.beats) {
          const k = (time - b) / 700;
          if (k < 0 || k > 1) continue;
          g.lineStyle(2, hot ? CARD_RED : GILT, 0.6 * (1 - k)); g.strokeEllipse(f.x, f.y + 6, 40 + k * 60, 14 + k * 20);
        }
        if (time < (readUntil.get(f) ?? 0)) { g.lineStyle(2, GILT_LIT, 0.7); g.strokeEllipse(f.x, f.y + 6, 50, 18); }
      }
      // A found pin's hole, glinting, while the pin is up.
      for (const pin of pins) {
        if (pin.foundAt < 0) continue;
        g.fillStyle(VELVET_DARK, 0.7); g.fillEllipse(pin.x, pin.y, 16, 6);
        glow(g, pin.x, pin.y, 24, GILT_LIT, 0.08, 2);
      }
      // Where pins will fall: a pin-cushion's tufted ring, closing.
      for (const d of drops) {
        if (d.done) continue;
        const k = clamp((time - d.at) / Math.max(1, d.hitAt - d.at), 0, 1);
        const r = d.big ? PIN_R : DROP_R;
        const col = d.big ? GILT_LIT : VELVET;
        g.fillStyle(col, 0.08 + 0.16 * k); g.fillCircle(d.x, d.y, r);
        g.lineStyle(2, col, 0.6 + 0.3 * k); g.strokeCircle(d.x, d.y, r);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.fillStyle(col, 0.7); g.fillCircle(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r, 2.5);
        }
        g.lineStyle(2, col, 0.9); g.strokeCircle(d.x, d.y, r * (1 - k) + 4);
      }
    },

    drawAir(g, time) {
      // Hatpins dropping from above on their marks; the great gilt pin for a find.
      for (const d of drops) {
        if (d.done) continue;
        const k = clamp((time - d.at) / Math.max(1, d.hitAt - d.at), 0, 1);
        const fall = (1 - k * k) * 260;
        drawHatpin(g, d.x, d.y - fall, d.big ? 1.6 : 1, d.big);
      }
      // A found pin rising from its hole, turning in the light.
      for (const pin of pins) {
        if (pin.foundAt < 0) continue;
        const k = clamp((time - pin.foundAt) / 500, 0, 1);
        if (k >= 1) continue;
        drawHatpin(g, pin.x, pin.y - k * 70, 1.6, true);
        glow(g, pin.x, pin.y - k * 70 - 30, 30, GILT_LIT, 0.12 * (1 - k), 3);
      }
    },

    drawHud(g) {
      // Two pulse traces like a reader's smoked drum: yours above, hers below.
      const x0 = W / 2 - 90, y0 = top + 12;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 26, y0 - 8, 206, 56, 8);
      [player, npc].forEach((f, row) => {
        const p = pulses.get(f) as Pulse;
        const base = y0 + 14 + row * 24;
        const hot = heat(f) > HOT;
        g.fillStyle(row === 0 ? 0x8af0a0 : 0xff8a6a, 1); g.fillCircle(x0 - 14, base - 2, 4);
        g.lineStyle(1, IVORY, 0.15); g.lineBetween(x0, base, x0 + 176, base);
        g.lineStyle(1.5, hot ? CARD_RED : MIND_LIT, 0.95);
        g.beginPath();
        for (let i = 0; i < p.trace.length; i++) {
          const x = x0 + i * 1.5;
          if (i === 0) g.moveTo(x, base);
          if (p.trace[i] > 0) { g.lineTo(x, base + 3); g.lineTo(x + 0.75, base - p.trace[i]); g.lineTo(x + 1.5, base + 2); }
          g.lineTo(x + 1.5, base);
        }
        g.strokePath();
      });
    },
  };
}

/** A long gilt hatpin with a jet bead, point down; the big one (a find) has a pearl. */
function drawHatpin(g: G, x: number, y: number, s: number, big: boolean): void {
  shadow(g, x, y + 2, 8 * s, 3 * s, 0.25);
  g.lineStyle(2 * s, GILT_DARK, 1); g.lineBetween(x, y, x, y - 44 * s);
  g.lineStyle(1, GILT_LIT, 1); g.lineBetween(x - 0.6, y - 4, x - 0.6, y - 42 * s);
  g.fillStyle(big ? IVORY : 0x1a1620, 1); g.fillCircle(x, y - 46 * s, 5 * s);
  g.fillStyle(0xffffff, 0.7); g.fillCircle(x - 1.5 * s, y - 47.5 * s, 1.4 * s);
  if (big) { g.lineStyle(1, GILT, 1); g.strokeCircle(x, y - 46 * s, 5 * s); }
}

export const FALLEN_PIN: GimmickDef = {
  id: ID,
  rules: 'A gilt pin is hidden: your pulse quickens near it, and hers. A hot pulse draws falling pins. Find it first and drive it at your foe.',
  make,
};
