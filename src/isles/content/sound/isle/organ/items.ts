import type { IsleItemDef, ItemScriptCtx, ItemScriptFactory } from '../../../../IslesTypes';
import { GHOST, GILT, GILT_LIT, IVORY, LEATHER, ghostMouth, noteHead } from './art';

/**
 * The Great Organ's treasures: the Maestro's own baton (his artifact), and two charms found in
 * the instrument — a brass relief-valve off the Bellows Hall's third lung, and the ivory knob of
 * the Vox Humana stop from the Voice Loft.
 */

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

// ── art-cadenza: The Maestro's Baton ─────────────────────────────────

/**
 * His baton keeps time over your head — a beat every 0.75s, four to the bar, a ring at your feet on
 * each. A cast within 0.2s of a beat is *in time* and adds a note to the bar; a cast off the beat
 * rubs the bar out. Four in time and the bar resolves in a cadenza: 18 damage to the foe and +20%
 * damage for 3s. Play on the beat.
 */
const maestrosBaton: ItemScriptFactory = (ctx) => {
  const BEAT = 750;
  const WINDOW = 200;
  let origin = 0;
  let bar = 0;
  let resolveAt = 0;
  let lastBeat = -1;
  let flashAt = 0;
  const beatIdx = (time: number): number => Math.floor((time - origin) / BEAT);
  const offBy = (time: number): number => {
    const ph = (time - origin) % BEAT;
    return Math.min(ph, BEAT - ph);
  };
  return {
    update(time) {
      if (origin === 0) origin = time;
      const b = beatIdx(time);
      if (b !== lastBeat) { lastBeat = b; if (b % 4 === 0) ctx.sfx('clock-tick'); }
    },
    onCast() {
      const now = ctx.scene.time.now;
      if (origin === 0) return;
      const p = ctx.player;
      if (offBy(now) <= WINDOW) {
        bar += 1;
        flashAt = now;
        if (bar >= 4) {
          bar = 0;
          resolveAt = now;
          if (alive(ctx, 'npc')) {
            const n = ctx.npc;
            ctx.hit(n, 18, n.x, n.y);
            ctx.boostDamage(1.2, 3000);
            ctx.float(n.x, n.y - 56, 'CADENZA', '#ffe8a0');
            ctx.flash(n.x, n.y, 0xffe8a0);
            ctx.sfx('holy-chord');
          }
        } else {
          ctx.float(p.x, p.y - 50, 'IN TIME', '#ffe8a0');
        }
      } else if (bar > 0) {
        bar = 0;
        ctx.float(p.x, p.y - 50, 'OFF THE BEAT', '#a89a8a');
      }
    },
    drawGround(g, time) {
      if (!alive(ctx, 'player') || origin === 0) return;
      const p = ctx.player;
      const ph = ((time - origin) % BEAT) / BEAT;
      const down = beatIdx(time) % 4 === 0;
      // The beat ring at your feet, shrinking in to the beat.
      g.lineStyle(down ? 3 : 2, GILT, 0.5 * (1 - ph));
      g.strokeEllipse(p.x, p.y + 14, 30 + (1 - ph) * 30, 10 + (1 - ph) * 10);
      if (time - resolveAt < 600) {
        const k = (time - resolveAt) / 600;
        g.lineStyle(4, GILT_LIT, 1 - k); g.strokeCircle(ctx.npc.x, ctx.npc.y, 30 + k * 60);
      }
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player') || origin === 0) return;
      const p = ctx.player;
      const ph = ((time - origin) % (BEAT * 2)) / (BEAT * 2);
      const sw = Math.sin(ph * Math.PI * 2) * 0.6;
      const bx = p.x + 22, by = p.y - 50;
      // The baton beating, its tip flaring on a struck beat.
      g.lineStyle(2.5, IVORY, 0.95); g.lineBetween(bx, by, bx + Math.sin(sw) * 22, by - Math.cos(sw) * 22);
      g.fillStyle(0x8a6a3a, 1); g.fillCircle(bx, by, 3);
      if (time - flashAt < 200) { g.fillStyle(GILT_LIT, 1); g.fillCircle(bx + Math.sin(sw) * 22, by - Math.cos(sw) * 22, 4); }
      // The bar: four note slots, filled in time.
      for (let i = 0; i < 4; i++) {
        if (i < bar) noteHead(g, p.x - 24 + i * 12, p.y - 62, 0.7, GILT_LIT, 1, 1);
        else { g.fillStyle(0x000000, 0.3); g.fillCircle(p.x - 24 + i * 12, p.y - 62, 2); }
      }
    },
  };
};

// ── charm-bellows-valve ──────────────────────────────────────────────

/**
 * A brass relief-valve. Hits you take fill it with breath (half of each hit, up to 30). The next
 * ability you cast while it holds 8 or more lets it all out at once: a gust that shoves the foe
 * away from you (if within 240px) and hits it for 60% of the breath held.
 */
const bellowsValve: ItemScriptFactory = (ctx) => {
  const CAP = 30;
  const MIN = 8;
  const RANGE = 240;
  let breath = 0;
  let gustAt = 0;
  let gx = 0, gy = 0, ga = 0;
  return {
    onHitTaken(amount) { breath = Math.min(CAP, breath + amount * 0.5); },
    onCast() {
      if (breath < MIN || !alive(ctx, 'player')) return;
      const p = ctx.player, n = ctx.npc;
      const held = breath;
      breath = 0;
      gustAt = ctx.scene.time.now;
      gx = p.x; gy = p.y; ga = Math.atan2(n.y - p.y, n.x - p.x);
      ctx.sfx('gust');
      if (!alive(ctx, 'npc') || Math.hypot(n.x - p.x, n.y - p.y) > RANGE) { ctx.float(p.x, p.y - 50, 'WHOOSH', '#e8d8c0'); return; }
      ctx.nudge(n, Math.cos(ga) * 110, Math.sin(ga) * 110);
      ctx.hit(n, Math.round(held * 0.6), n.x, n.y);
      ctx.float(n.x, n.y - 50, 'BLOWN', '#f0d8b0');
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (breath > 0 && alive(ctx, 'player')) {
        // A little leather bladder at your shoulder, swelling with what it holds.
        const k = breath / CAP;
        const x = p.x - 26, y = p.y - 40;
        g.fillStyle(LEATHER, 0.9); g.fillEllipse(x, y, 10 + k * 10, 8 + k * 8);
        g.fillStyle(GILT, 1); g.fillRect(x - 2, y - 6 - k * 4, 4, 5);
        if (breath >= MIN) { g.lineStyle(1.5, GILT_LIT, 0.5 + Math.sin(time / 90) * 0.3); g.strokeEllipse(x, y, 14 + k * 10, 12 + k * 8); }
      }
      if (time - gustAt < 350) {
        const k = (time - gustAt) / 350;
        for (let i = -2; i <= 2; i++) {
          const a = ga + i * 0.12;
          g.lineStyle(2.5, IVORY, 0.7 * (1 - k));
          g.lineBetween(gx + Math.cos(a) * (20 + k * 80), gy + Math.sin(a) * (20 + k * 80), gx + Math.cos(a) * (60 + k * 160), gy + Math.sin(a) * (60 + k * 160));
        }
      }
    },
  };
};

// ── charm-vox-humana ─────────────────────────────────────────────────

/**
 * The ivory knob of the Vox Humana stop. Every 9s a voice from the Loft comes and sings beside
 * you for 3s. Every ability you cast while it sings comes back sooner — 0.7s off its cooldown —
 * and heals you 2.
 */
const voxHumana: ItemScriptFactory = (ctx) => {
  const EVERY = 9000;
  const SING = 3000;
  let next = 0;
  let until = 0;
  return {
    update(time) {
      if (next === 0) next = time + EVERY * 0.4;
      if (time >= next) { until = time + SING; next = time + EVERY; ctx.sfx('holy-chord'); }
    },
    onCast(abilityId) {
      if (ctx.scene.time.now >= until || !alive(ctx, 'player')) return;
      ctx.refund(abilityId, 700);
      ctx.heal(ctx.player, 2);
      ctx.float(ctx.player.x + 30, ctx.player.y - 60, 'SUNG BACK', '#d8f0ff');
    },
    drawAir(g, time) {
      if (time >= until || !alive(ctx, 'player')) return;
      const p = ctx.player;
      const k = (until - time) / SING;
      const x = p.x + 34, y = p.y - 40 + Math.sin(time / 300) * 4;
      ghostMouth(g, x, y, 0.9, 0.5 + Math.sin(time / 100) * 0.4, Math.min(1, k * 3));
      noteHead(g, x + 14, y - 26 - ((time / 15) % 20), 0.7, GHOST, k, 1, true);
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const ORGAN_ITEMS: IsleItemDef[] = [
  {
    id: 'art-cadenza', name: "The Maestro's Baton", emoji: '🎼', kind: 'artifact', isle: 'sound',
    flavor: 'Ivory, a cork grip worn to his fingers. It counted Choirholm in four for thirty years. It still wants to.',
    script: 'art-cadenza', effect: { maxHp: 20, cooldownMult: 0.95 },
    scriptText: [
      'It beats time over you: every 0.75s, four to the bar. A cast within 0.2s of a beat is in time.',
      'Four casts in time: a cadenza — 18 damage to the foe and +20% damage for 3s. Off the beat rubs out the bar.',
    ],
  },
  {
    id: 'charm-bellows-valve', name: 'Bellows Valve', emoji: '🪗', kind: 'charm', isle: 'sound', sell: 320,
    flavor: 'A brass relief-valve off the third lung. It has been sighing for a hundred years and has never once been asked why.',
    script: 'charm-bellows-valve',
    scriptText: ['Hits taken fill it (half each, max 30). Your next cast at 8+ blows the foe away and hits it for 60% of it.'],
  },
  {
    id: 'charm-vox-humana', name: 'Vox Humana Knob', emoji: '🎵', kind: 'charm', isle: 'sound', sell: 340,
    flavor: 'The ivory knob of the stop called "the human voice". Somebody pulled it out of the console and kept it.',
    script: 'charm-vox-humana', effect: { regenPerSecond: 0.2 },
    scriptText: ['Every 9s a voice sings beside you for 3s. Casts while it sings: 0.7s off that cooldown, and heal 2.'],
  },
];

export const ORGAN_SCRIPTS: Record<string, ItemScriptFactory> = {
  'art-cadenza': maestrosBaton,
  'charm-bellows-valve': bellowsValve,
  'charm-vox-humana': voxHumana,
};


