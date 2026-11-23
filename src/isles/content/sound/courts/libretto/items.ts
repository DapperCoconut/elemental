import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { crane, quill, sheet, strikeLine } from './art';
import { GILT, GILT_LIT, INK, PAPER, PAPER_LIT, RED, RED_LIT } from './palette';
import { alive, clamp, clock, dist, lineDist, wrapAngle } from './util';

/**
 * The Libretto Court's goods: Odile Foolscap's four charms, Prince Folio's first song, and the
 * Inkwell's three fish. Every charm is a stationer's thing that plays one of the court's rules
 * in your favour — the margin the Censor rules, the cranes Crease folds, the prompter's cues,
 * the errata slip pasted into every corrected Score. Scripts are registered under their ids.
 */

const ISLE = 'sound';

export const CHARM_RULER = 'libretto-charm-margin-ruler';
export const CHARM_CRANES = 'libretto-charm-thousand-cranes';
export const CHARM_PROMPT = 'libretto-charm-prompt-book';
export const CHARM_ERRATA = 'libretto-charm-errata-slip';
export const ART_FOLIO = 'art-folio';

export const FISH_PIKE = 'fish-nib-pike';
export const FISH_MINNOW = 'fish-margin-minnow';
export const FISH_PERCH = 'fish-verse-perch';
export const FISHERY = 'libretto-inkwell';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Margin Ruler ─────────────────────────────────────────────────────
// Every 6s you rule a margin on the floor: a red line through where you stand, across the way
// you are facing. For 4s, a foe who crosses it is struck back over it — 10 damage and a shove
// back to its far side. Face them, rule, and let them come to you.

const ruler: ItemScriptFactory = (ctx) => {
  const EVERY = 6000, LIVE = 4000;
  let next = 0;
  let line: { x: number; y: number; a: number; at: number; side: number; hits: number } | null = null;
  const sideOf = (l: { x: number; y: number; a: number }, px: number, py: number) => Math.sign((px - l.x) * -Math.sin(l.a) + (py - l.y) * Math.cos(l.a)) || 1;
  return {
    update(time) {
      if (!live(ctx)) return;
      if (next === 0) next = time + 2000;
      if (time >= next) {
        next = time + EVERY;
        const a = ctx.facing(ctx.player) + Math.PI / 2;
        line = { x: ctx.player.x, y: ctx.player.y, a, at: time, side: 0, hits: 0 };
        line.side = sideOf(line, ctx.npc.x, ctx.npc.y);
        ctx.sfx('slash');
      }
      if (!line || time - line.at > LIVE || !foeLive(ctx)) return;
      const n = ctx.npc;
      const s = sideOf(line, n.x, n.y);
      if (s !== line.side && lineDist(n.x, n.y, line.x, line.y, line.a) < 60 && line.hits < 2) {
        line.hits++;
        const nx = -Math.sin(line.a) * line.side, ny = Math.cos(line.a) * line.side;
        ctx.hit(n, 10, n.x, n.y);
        ctx.nudge(n, nx * 70, ny * 70);
        ctx.float(n.x, n.y - 44, 'OUT OF THE MARGIN', '#f05a5a');
        ctx.sfx('snap-back');
      }
    },
    drawGround(g, time) {
      if (!line || time - line.at > LIVE) return;
      const k = 1 - (time - line.at) / LIVE;
      const c = Math.cos(line.a), s = Math.sin(line.a);
      const L = 340;
      strikeLine(g, line.x - c * L, line.y - s * L, line.x + c * L, line.y + s * L, 3, 0.35 + k * 0.5);
      for (let d = -L; d <= L; d += 20) {
        const tx = line.x + c * d, ty = line.y + s * d;
        g.lineStyle(1, RED, 0.3 * k); g.lineBetween(tx - s * (d % 100 === 0 ? 9 : 5), ty + c * (d % 100 === 0 ? 9 : 5), tx, ty);
      }
    },
  };
};

// ── Crane of a Thousand Folds ────────────────────────────────────────
// Every blow you land puts a crease in a sheet riding at your shoulder. Five creases make a
// crane, which flies at the foe at once: 12 damage and a 0.35s stun when it reaches them.

const cranes: ItemScriptFactory = (ctx) => {
  const step = clock();
  let creases = 0;
  let flying: { x: number; y: number; a: number; at: number } | null = null;
  let popAt = 0;
  return {
    onHitDealt(amount) {
      if (amount < 2 || !live(ctx) || flying) return;
      creases++;
      if (creases >= 5) {
        creases = 0;
        flying = { x: ctx.player.x + 20, y: ctx.player.y - 34, a: Math.atan2(ctx.npc.y - ctx.player.y, ctx.npc.x - ctx.player.x), at: ctx.scene.time.now };
        ctx.sfx('wings');
      }
    },
    update(time) {
      const dt = step(time);
      if (!flying) return;
      if (!foeLive(ctx) || time - flying.at > 4000) { flying = null; return; }
      const n = ctx.npc;
      const want = Math.atan2(n.y - flying.y, n.x - flying.x);
      flying.a += clamp(wrapAngle(want - flying.a), -4 * dt, 4 * dt);
      flying.x += Math.cos(flying.a) * 320 * dt;
      flying.y += Math.sin(flying.a) * 320 * dt;
      if (dist(flying.x, flying.y, n.x, n.y) < 26) {
        ctx.hit(n, 12, n.x, n.y);
        ctx.stun(n, 350);
        ctx.float(n.x, n.y - 46, 'PAPER CUT', '#fbf6e8');
        ctx.sfx('slash');
        popAt = time;
        flying = null;
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (flying) crane(g, flying.x, flying.y, 1.1, flying.a, Math.sin(time / 60), PAPER_LIT);
      else {
        const x = p.x + 22, y = p.y - 36 + Math.sin(time / 400) * 2;
        sheet(g, x, y, 12, 12, 0.785 + creases * 0.15, creases >= 4 ? 0xfff0d0 : PAPER);
        for (let i = 0; i < 5; i++) { g.fillStyle(i < creases ? GILT_LIT : INK, i < creases ? 1 : 0.35); g.fillCircle(x - 8 + i * 4, y + 12, 1.4); }
      }
      if (time - popAt < 400 && foeLive(ctx)) {
        const k = (time - popAt) / 400;
        for (let i = 0; i < 6; i++) { g.fillStyle(PAPER_LIT, 1 - k); g.fillTriangle(ctx.npc.x + Math.cos(i) * k * 30, ctx.npc.y + Math.sin(i) * k * 24, ctx.npc.x + Math.cos(i) * k * 30 + 5, ctx.npc.y + Math.sin(i) * k * 24, ctx.npc.x + Math.cos(i) * k * 30, ctx.npc.y + Math.sin(i) * k * 24 + 5); }
      }
    },
  };
};

// ── Prompt-Book ──────────────────────────────────────────────────────
// Every 12s the book in your pocket gives you a cue for the next 4s: land three blows, take no
// hit, or keep moving. Play it for an encore: heal 8 and 1.5s off every ability you have cast.

type PromptCue = 'blows' | 'clean' | 'moving';

const promptBook: ItemScriptFactory = (ctx) => {
  const EVERY = 12000, WINDOW = 4000;
  const TEXT: Record<PromptCue, string> = { blows: 'CUE: LAND THREE BLOWS', clean: 'CUE: TAKE NO HIT', moving: 'CUE: KEEP MOVING' };
  const cast = new Set<string>();
  let next = 0;
  let cue: { kind: PromptCue; at: number; count: number; failed: boolean; lastX: number; lastY: number; still: number } | null = null;
  let encoreAt = 0;
  const encore = () => {
    ctx.heal(ctx.player, 8);
    for (const id of cast) ctx.refund(id, 1500);
    ctx.float(ctx.player.x, ctx.player.y - 56, 'ENCORE!', '#f4d88a');
    ctx.sfx('jackpot');
    encoreAt = ctx.scene.time.now;
    cue = null;
  };
  return {
    onCast(abilityId) { cast.add(abilityId); },
    onHitDealt(amount) {
      if (!cue || cue.kind !== 'blows' || amount < 1) return;
      cue.count++;
      if (cue.count >= 3) encore();
    },
    onHitTaken(amount) { if (cue && cue.kind === 'clean' && amount > 0) cue.failed = true; },
    update(time) {
      if (!live(ctx)) return;
      if (next === 0) next = time + 4000;
      if (!cue && time >= next) {
        next = time + EVERY;
        const kinds: PromptCue[] = ['blows', 'clean', 'moving'];
        const kind = kinds[Math.floor(ctx.rng() * kinds.length)];
        cue = { kind, at: time, count: 0, failed: false, lastX: ctx.player.x, lastY: ctx.player.y, still: 0 };
        ctx.float(ctx.player.x, ctx.player.y - 60, TEXT[kind], '#fff0c0');
        ctx.sfx('crystal-chime');
      }
      if (!cue) return;
      if (cue.kind === 'moving') {
        const moved = dist(ctx.player.x, ctx.player.y, cue.lastX, cue.lastY);
        cue.still = moved < 1 ? cue.still + 1 : 0;
        if (cue.still > 20) cue.failed = true;
        cue.lastX = ctx.player.x; cue.lastY = ctx.player.y;
      }
      if (cue.failed) { ctx.float(ctx.player.x, ctx.player.y - 50, 'DRIED', '#f05a5a'); cue = null; return; }
      if (time - cue.at > WINDOW) {
        if (cue.kind === 'clean' || cue.kind === 'moving') encore();
        else { ctx.float(ctx.player.x, ctx.player.y - 50, 'DRIED', '#f05a5a'); cue = null; }
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 24, y = p.y - 40;
      g.fillStyle(0x6a2e22, 1); g.fillRect(x - 7, y - 5, 14, 10);
      g.fillStyle(PAPER_LIT, 1); g.fillRect(x - 6, y - 4, 6, 8); g.fillStyle(PAPER, 1); g.fillRect(x, y - 4, 6, 8);
      if (cue) {
        const k = clamp((time - cue.at) / WINDOW, 0, 1);
        g.lineStyle(2, GILT_LIT, 0.9); g.beginPath(); g.arc(x, y, 11, -Math.PI / 2, -Math.PI / 2 + (1 - k) * Math.PI * 2, false); g.strokePath();
        if (cue.kind === 'blows') for (let i = 0; i < 3; i++) { g.fillStyle(i < cue.count ? GILT_LIT : INK, 0.9); g.fillCircle(x - 6 + i * 6, y + 12, 2); }
      }
      if (time - encoreAt < 600) { const k = (time - encoreAt) / 600; g.lineStyle(2, GILT_LIT, 1 - k); g.strokeCircle(p.x, p.y, 26 + k * 30); }
    },
  };
};

// ── Errata Slip ──────────────────────────────────────────────────────
// The first hit of more than 6 you take in any 10s is corrected: 60% of it is healed back at
// once, and the same amount is struck from the foe as an erratum.

const errata: ItemScriptFactory = (ctx) => {
  const COOL = 10000;
  let readyAt = 0;
  let fx = 0;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount <= 6 || now < readyAt || !live(ctx)) return;
      readyAt = now + COOL;
      const back = Math.round(amount * 0.6);
      ctx.heal(ctx.player, back);
      if (foeLive(ctx)) ctx.hit(ctx.npc, back, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.player.x, ctx.player.y - 50, 'ERRATUM', '#f05a5a');
      ctx.sfx('snap-back');
      fx = now;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const ready = time >= readyAt;
      const x = p.x + 24, y = p.y - 18;
      sheet(g, x, y, 10, 6, -0.3, ready ? PAPER_LIT : PAPER);
      g.lineStyle(1.2, ready ? RED_LIT : RED, ready ? 1 : 0.4); g.lineBetween(x - 4, y + 1, x + 4, y - 2);
      if (ready) glow(g, x, y, 10, RED_LIT, 0.05, 2);
      if (time - fx < 500 && foeLive(ctx)) {
        const k = (time - fx) / 500;
        strikeLine(g, ctx.npc.x - 24, ctx.npc.y - 10 - k * 10, ctx.npc.x + 24, ctx.npc.y + 6 - k * 10, 3, 1 - k);
      }
    },
  };
};

// ── Folio's First Song ───────────────────────────────────────────────
// Every 4th blow you land writes a word over the foe; the third word finishes a line, and the
// line rises through them as paper blades: 18 damage and a 0.4s stun. And once a fight, when you
// drop under 30% health, you revise — the damage you took in the last 5s is healed back (40 at
// most).

const firstSong: ItemScriptFactory = (ctx) => {
  let blows = 0;
  let words = 0;
  let lineAt = 0;
  let revised = false;
  let reviseAt = 0;
  const taken: { at: number; n: number }[] = [];
  return {
    onHitDealt(amount) {
      if (amount < 2 || !foeLive(ctx) || !live(ctx)) return;
      blows++;
      if (blows % 4 !== 0) return;
      words++;
      ctx.sfx('clock-tick');
      if (words >= 3) {
        words = 0;
        lineAt = ctx.scene.time.now;
        ctx.hit(ctx.npc, 18, ctx.npc.x, ctx.npc.y);
        ctx.stun(ctx.npc, 400);
        ctx.float(ctx.npc.x, ctx.npc.y - 50, 'A LINE OF VERSE', '#fbf6e8');
        ctx.sfx('slash');
      }
    },
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      taken.push({ at: now, n: amount });
      while (taken.length && now - taken[0].at > 5000) taken.shift();
      if (revised || !live(ctx) || ctx.player.hp > ctx.player.maxHp * 0.3) return;
      revised = true;
      reviseAt = now;
      const back = Math.min(40, taken.reduce((s, t) => s + t.n, 0));
      ctx.heal(ctx.player, back);
      ctx.float(ctx.player.x, ctx.player.y - 56, 'SECOND DRAFT', '#f4d88a');
      ctx.sfx('time-warp');
    },
    drawAir(g, time) {
      if (foeLive(ctx) && words > 0) {
        const n = ctx.npc;
        for (let i = 0; i < words; i++) {
          const x = n.x - 14 + i * 14, y = n.y - 48 + Math.sin(time / 300 + i) * 1.5;
          g.lineStyle(2, INK, 0.9);
          g.beginPath(); g.arc(x - 2, y, 3, Math.PI * 0.4, Math.PI * 2.1, false); g.strokePath(); g.lineBetween(x + 1, y - 4, x + 3, y + 4);
        }
      }
      if (time - lineAt < 500 && foeLive(ctx)) {
        const k = (time - lineAt) / 500, n = ctx.npc;
        const h = Math.sin(Math.min(1, k * 2) * Math.PI * 0.5) * 30 * (1 - k * 0.5);
        for (let i = -3; i <= 3; i++) {
          const x = n.x + i * 16, y = n.y + 14;
          g.fillStyle(PAPER_LIT, 1 - k); g.fillTriangle(x - 6, y, x + 6, y, x, y - h);
          g.lineStyle(1, INK, 1 - k); g.lineBetween(x - 6, y, x, y - h);
        }
      }
      if (revised && time - reviseAt < 900 && live(ctx)) {
        const k = (time - reviseAt) / 900, p = ctx.player;
        quill(g, p.x + 20, p.y - 30 - k * 10, 30, -2.2, GILT_LIT);
        g.lineStyle(2, GILT, 1 - k); g.strokeCircle(p.x, p.y, 24 + k * 30);
      }
    },
  };
};

export const LIBRETTO_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_RULER, name: 'Margin Ruler', emoji: '📏', kind: 'charm', price: 420, isle: ISLE,
    flavor: 'A copyist\'s brass-edged rule, red ink dried in its groove. Every page in Libretto has a margin. So do people.',
    script: CHARM_RULER,
    scriptText: [
      'Every 6s you rule a red margin through where you stand, across the way you face.',
      'For 4s, a foe who crosses it takes 10 and is shoved back over it (twice at most).',
    ],
  },
  {
    id: CHARM_CRANES, name: 'Crane of a Thousand Folds', emoji: '🕊️', kind: 'charm', price: 640, isle: ISLE,
    flavor: 'A square of Crease\'s own stock, creased and uncreased so often it has gone soft as cloth. It remembers the folds.',
    script: CHARM_CRANES,
    scriptText: [
      'Each blow you land puts a crease in a sheet at your shoulder.',
      'Five creases fold a crane that flies at your foe: 12 damage and a 0.35s stun.',
    ],
  },
  {
    id: CHARM_PROMPT, name: 'Prompter\'s Prompt-Book', emoji: '📖', kind: 'charm', price: 860, isle: ISLE,
    flavor: 'Thirty years of cues in a hand nobody else can read. The margins say "LOUDER" in eleven places.',
    effect: { maxHp: 6 },
    script: CHARM_PROMPT,
    scriptText: [
      'Every 12s you get a 4s cue: land three blows, take no hit, or keep moving.',
      'Play it for an encore: heal 8 and take 1.5s off every ability you have cast.',
    ],
  },
  {
    id: CHARM_ERRATA, name: 'Errata Slip', emoji: '🧾', kind: 'charm', price: 1120, isle: ISLE,
    flavor: 'A printed slip pasted into a Score to correct it. This one corrects the Score. It was never pasted in.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_ERRATA,
    scriptText: [
      'The first hit over 6 you take in any 10s is corrected: 60% of it healed back at once.',
      'The foe is struck for the same amount — the erratum.',
    ],
  },
  {
    id: ART_FOLIO, name: 'Folio\'s First Song', emoji: '📜', kind: 'artifact', isle: ISLE,
    flavor: 'A grey scrap of rag-paper from the mill vat, a boy\'s song on it in pencil, folded small. He never struck it out.',
    effect: { maxHp: 14 },
    script: ART_FOLIO,
    scriptText: [
      'Every 4th blow writes a word over your foe; the third word finishes a line that rises',
      'through them as blades: 18 damage and a 0.4s stun.',
      'Once a fight, dropping under 30% health, you revise: heal back what you took in the last 5s (40 max).',
    ],
  },
  {
    id: FISH_PIKE, name: 'Nib Pike', emoji: '🐟', kind: 'fish', sell: 36, isle: ISLE,
    flavor: 'A long black pike with a split snout like a pen-nib. Its ink-sac makes the only ink the Rationer does not ration.',
    effect: { critChance: 0.04 },
  },
  {
    id: FISH_MINNOW, name: 'Margin Minnow', emoji: '🐠', kind: 'fish', sell: 9, isle: ISLE,
    flavor: 'Tiny and grey, and it swims only round the edges of the Inkwell, never across. Copyists keep one in a jar for luck.',
    effect: { speedMult: 1.03 },
  },
  {
    id: FISH_PERCH, name: 'Verse Perch', emoji: '🐡', kind: 'fish', sell: 17, isle: ISLE,
    flavor: 'Its stripes run in neat lines down its sides like ruled paper. Fishermen swear you can read them, if you are sad enough.',
    effect: { regenPerSecond: 0.5 },
  },
];

export const LIBRETTO_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_RULER]: ruler,
  [CHARM_CRANES]: cranes,
  [CHARM_PROMPT]: promptBook,
  [CHARM_ERRATA]: errata,
  [ART_FOLIO]: firstSong,
};

export const LIBRETTO_SHOPS: ShopDef[] = [
  { id: 'libretto-shop', name: 'Foolscap\'s Quires & Quills', stock: [CHARM_RULER, CHARM_CRANES, CHARM_PROMPT, CHARM_ERRATA], buys: true },
];

export const LIBRETTO_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Inkwell', kind: 'ink' }];

export const LIBRETTO_FISH: FishDef[] = [
  { id: FISH_MINNOW, fisheries: [FISHERY], weight: 7, fight: 1, size: [4, 11] },
  { id: FISH_PERCH, fisheries: [FISHERY], weight: 5, fight: 2, size: [14, 32] },
  { id: FISH_PIKE, fisheries: [FISHERY], weight: 2, fight: 4, size: [42, 96] },
];

