import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { OBS, seam, slab } from '../../../../../art/PinnacleArt';
import { glow } from '../../../../../art/IsleArt';
import { glyphs, pip } from '../art';
import { CSS_LOT, CSS_NPC, CSS_PLAYER, FELT_GLOW, IVORY, IVORY_DIM, LOT_LILAC, ROUGE_LIT, SIDE_NPC, SIDE_PLAYER } from '../palette';
import { type Who, WHO, alive, clamp } from '../util';

/**
 * Seat of the Pledge — Councilor Mnemosyne Pell, who wrote the clause that let the drawn pawn a
 * memory instead of paying, and then wrote the interest.
 *
 * DECREE OF THE PAWN COUNTER. The pawnbroker's bell rings over the floor on a clock, and at each
 * ring both fighters pawn the thing they have leaned on most since the last one — the ability
 * they cast the most times (never the basic attack). It is locked away and its ticket hung on the
 * rail at the head of the floor. Strike your own ticket and you pay it off, blow by blow, until it
 * is redeemed; strike your foe's ticket and you sell it on — longer in pawn, dearer to redeem.
 * The HUD shows what each of you will pawn at the next bell: vary what you cast, and you choose
 * what you lose. The councilor locks and steals abilities for a living, and knows the price of
 * everything.
 */

interface Pawn { id: string; key: string; until: number; price: number; paid: number; target: StrikeTarget; since: number }
const KEYS = ['C', 'E', 'R', 'F', 'Q'];

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const RAIL_Y = ctx.top + 46;
  const HOOK_X: Record<Who, number> = { player: ctx.W * 0.3, npc: ctx.W * 0.7 };
  const BELL_MS = ctx.hard ? 10000 : 11000;
  const WARN_MS = 2200;
  const PAWN_MS = 14000;
  const PRICE = ctx.hard ? 36 : 30;
  const SELL_MS = 2500;
  const LOCK_TICK = 450;

  const counts: Record<Who, Map<string, number>> = { player: new Map(), npc: new Map() };
  const lastCast: Record<Who, string | null> = { player: null, npc: null };
  const keyOf: Record<Who, Map<string, string>> = { player: new Map(), npc: new Map() };
  const pawn: Record<Who, Pawn | null> = { player: null, npc: null };
  const sellCd: Record<Who, number> = { player: 0, npc: 0 };
  let bellAt = 0;
  let rangAt = -9999;
  const now = () => ctx.scene.time.now;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const basicId = (f: Fighter): string | undefined => f.element?.abilities?.[0]?.id;

  const note = (w: Who, id: string, key: string | null): void => {
    const f = fighter(w);
    if (id === basicId(f)) return;
    counts[w].set(id, (counts[w].get(id) ?? 0) + 1);
    lastCast[w] = id;
    if (!keyOf[w].has(id)) {
      const idx = (f.element?.abilities ?? []).findIndex((a) => a.id === id);
      keyOf[w].set(id, key ?? KEYS[idx] ?? '?');
    }
  };

  /** What a fighter would pawn if the bell rang now. */
  const pick = (w: Who): string | null => {
    let best: string | null = null, bn = 0;
    for (const [id, n] of counts[w]) {
      if (n > bn || (n === bn && id === lastCast[w])) { best = id; bn = n; }
    }
    return best;
  };

  const redeem = (w: Who, how: 'REDEEMED' | 'RETURNED'): void => {
    const p = pawn[w];
    if (!p) return;
    p.target.remove();
    pawn[w] = null;
    const f = fighter(w);
    if (alive(f)) ctx.float(f.x, f.y - 56, `${p.key} ${how}`, w === 'player' ? CSS_PLAYER : CSS_NPC);
    ctx.sfx('snap-back');
  };

  const ring = (time: number): void => {
    rangAt = time;
    ctx.sfx('holy-chord');
    const said: string[] = [];
    for (const w of WHO) {
      const id = pick(w);
      counts[w].clear();
      if (!id || pawn[w]) continue;
      const key = keyOf[w].get(id) ?? '?';
      const owner = w;
      const target = ctx.target({
        x: HOOK_X[w], y: RAIL_Y + 34, r: 22,
        onStruck: (by, amount) => {
          const p = pawn[owner];
          if (!p) return;
          if (by === owner) {
            p.paid += Math.max(1, amount);
            ctx.sfx('money');
            if (p.paid >= p.price) redeem(owner, 'REDEEMED');
          } else {
            const t = now();
            if (t < sellCd[by]) return;
            sellCd[by] = t + 700;
            p.until = Math.min(t + PAWN_MS + 6000, p.until + SELL_MS);
            p.price += 8;
            ctx.float(HOOK_X[owner], RAIL_Y + 70, 'SOLD ON', by === 'player' ? CSS_PLAYER : CSS_NPC);
            ctx.sfx('chain');
          }
        },
      });
      pawn[w] = { id, key, until: time + PAWN_MS, price: PRICE, paid: 0, target, since: time };
      said.push(w === 'player' ? `YOU PAWN YOUR ${key}` : `THE COUNCILOR PAWNS ITS ${key}`);
    }
    ctx.banner(said.length ? `THE PAWNBROKER'S BELL — ${said.join('; ')}` : 'THE PAWNBROKER\'S BELL — NOTHING LEANED ON, NOTHING TAKEN', CSS_LOT);
  };

  /** A pawn ticket on its string: ivory card, punched hole, the key, a chain across, the debt bar. */
  const ticket = (g: Phaser.GameObjects.Graphics, w: Who, p: Pawn, time: number): void => {
    const x = HOOK_X[w], y = RAIL_Y + 34;
    const sway = Math.sin(time / 500 + (w === 'npc' ? 1.3 : 0)) * 0.08;
    const bx = x + Math.sin(sway) * 30, by = y;
    const side = w === 'player' ? SIDE_PLAYER : SIDE_NPC;
    g.lineStyle(1, IVORY_DIM, 0.9); g.lineBetween(x, RAIL_Y + 4, bx, by - 24);
    glow(g, bx, by, 34, side, 0.03, 3);
    g.fillStyle(IVORY_DIM, 1); g.fillRect(bx - 20, by - 24, 40, 50);
    g.fillStyle(IVORY, 1); g.fillRect(bx - 19, by - 23, 38, 48);
    // A sepia memory in the card: the owner, small, casting.
    g.fillStyle(0xa08a68, 0.35); g.fillCircle(bx, by + 2, 11);
    g.fillStyle(side, 0.4); g.fillCircle(bx, by + 2, 7);
    g.fillStyle(OBS.glass, 1); g.fillCircle(bx, by - 17, 3);
    glyphs(g, p.key, bx, by + 2, 18, OBS.glass, 1, 2.6);
    // The chain across it, while it is locked away.
    g.lineStyle(2.4, OBS.facet, 1); g.lineBetween(bx - 22, by - 6, bx + 22, by + 12);
    for (let i = 0; i < 5; i++) { g.lineStyle(1.2, OBS.edge, 0.8); g.strokeEllipse(bx - 18 + i * 9, by - 4 + i * 3.6, 7, 4); }
    // The debt: paid off along its foot.
    const k = clamp(p.paid / p.price, 0, 1);
    g.fillStyle(OBS.glass, 1); g.fillRect(bx - 18, by + 20, 36, 4);
    g.fillStyle(side, 1); g.fillRect(bx - 18, by + 20, 36 * k, 4);
    // Time left in pawn, as the card yellowing from the top down.
    const left = clamp((p.until - time) / PAWN_MS, 0, 1);
    g.fillStyle(0x8a7450, 0.25); g.fillRect(bx - 19, by - 23, 38, 48 * (1 - left));
  };

  return {
    update(time) {
      if (!alive(ctx.player) || !alive(ctx.npc)) return;
      if (bellAt === 0) bellAt = time + BELL_MS;
      if (time >= bellAt) { ring(time); bellAt = time + BELL_MS; }
      for (const w of WHO) {
        const p = pawn[w];
        if (!p) continue;
        if (time >= p.until) { redeem(w, 'RETURNED'); continue; }
        fighter(w).lockAbility?.(p.id, LOCK_TICK);
      }
    },
    onPlayerCast(id, slot) { if (slot !== 'click') note('player', id, slot ? slot.toUpperCase().slice(0, 1) : null); },
    onNpcCast(id) { note('npc', id, null); },
    npcSeek() {
      const p = pawn.npc;
      if (p) return { x: HOOK_X.npc + (ctx.npc.x < HOOK_X.npc ? -40 : 40), y: RAIL_Y + 120 };
      // Free of debt: a pass under your ticket on the way, to sell it on.
      if (pawn.player && Math.abs(ctx.npc.x - HOOK_X.player) < 220) return { x: HOOK_X.player, y: RAIL_Y + 130 };
      return null;
    },
    drawGround(g, time) {
      // The pawn counter: a long obsidian rail at the head of the floor with its hooks.
      const t = time / 1000;
      slab(g, ctx.W / 2, RAIL_Y + 8, ctx.W * 0.7, 14);
      for (const w of WHO) {
        const x = HOOK_X[w];
        g.lineStyle(3, OBS.facet, 1); g.lineBetween(x, RAIL_Y - 4, x, RAIL_Y + 8);
        g.lineStyle(1.4, OBS.edge, 0.7); g.beginPath(); g.arc(x + 3, RAIL_Y + 8, 4, Math.PI, Math.PI * 2.3, false); g.strokePath();
        // An empty hook glows faintly in its owner's colour.
        if (!pawn[w]) { g.fillStyle(w === 'player' ? SIDE_PLAYER : SIDE_NPC, 0.3 + 0.1 * Math.sin(t * 2)); g.fillCircle(x, RAIL_Y + 14, 3); }
      }
      // The pawnbroker's sign over the middle: three glass globes on a bracket, felt light inside.
      const sx = ctx.W / 2, sy = RAIL_Y - 2;
      g.lineStyle(3, OBS.facet, 1); g.lineBetween(sx - 26, sy, sx + 26, sy);
      const globes: [number, number][] = [[sx - 18, sy + 18], [sx + 18, sy + 18], [sx, sy + 40]];
      for (const [gx, gy] of globes) {
        g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(gx, sy, gx, gy - 10);
        g.fillStyle(OBS.glass, 1); g.fillCircle(gx, gy, 11);
        pip(g, gx, gy, 4, FELT_GLOW, 0.8);
        g.lineStyle(1, OBS.edge, 0.6); g.strokeCircle(gx, gy, 11);
        g.fillStyle(0xffffff, 0.4); g.fillCircle(gx - 4, gy - 4, 2.5);
      }
      // The bell beside it: swings when it rings.
      const bxp = sx + 70, swing = Math.sin(clamp((time - rangAt) / 1400, 0, 1) * Math.PI * 6) * (1 - clamp((time - rangAt) / 1400, 0, 1)) * 0.5;
      const warnK = clamp(1 - (bellAt - time) / WARN_MS, 0, 1);
      const shiver = warnK > 0 && bellAt > time ? Math.sin(time / 40) * 0.06 * warnK : 0;
      const a = swing + shiver;
      const bx = bxp + Math.sin(a) * 24, by = sy + Math.cos(a) * 24;
      g.lineStyle(1.4, OBS.edge, 0.7); g.lineBetween(bxp, sy - 4, bx, by - 8);
      g.fillStyle(OBS.facet, 1); g.fillTriangle(bx - 13, by + 10, bx + 13, by + 10, bx, by - 12);
      g.fillStyle(OBS.sheen, 1); g.fillEllipse(bx, by + 10, 28, 7);
      g.fillStyle(LOT_LILAC, 0.6 + warnK * 0.4); g.fillCircle(bx + Math.sin(a * 3) * 5, by + 13, 3);
      seam(g, [{ x: ctx.W * 0.18, y: RAIL_Y + 14 }, { x: ctx.W * 0.24, y: RAIL_Y + 18 }], 0.8, 0.5);
    },
    drawAir(g, time) {
      for (const w of WHO) { const p = pawn[w]; if (p) ticket(g, w, p, time); }
      // A pawned fighter wears the chain across their chest until it is redeemed.
      for (const w of WHO) {
        const p = pawn[w];
        const f = fighter(w);
        if (!p || !alive(f)) continue;
        g.lineStyle(2, OBS.facet, 0.9); g.lineBetween(f.x - 18, f.y - 14, f.x + 18, f.y + 6);
        g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(f.x - 18, f.y - 15, f.x + 18, f.y + 5);
        glyphs(g, p.key, f.x + 24, f.y - 30, 10, w === 'player' ? SIDE_PLAYER : SIDE_NPC, 0.9, 1.6);
        // A thread from the fighter to their ticket, so you can see what is owed where.
        g.lineStyle(1, IVORY_DIM, 0.18); g.lineBetween(f.x, f.y - 20, HOOK_X[w], RAIL_Y + 60);
      }
    },
    drawHud(g, time) {
      // The next bell: a bar, and what each of you will pawn when it rings.
      const cx = ctx.W / 2, y = ctx.H - 34;
      const k = clamp(1 - (bellAt - time) / BELL_MS, 0, 1);
      const warn = bellAt - time < WARN_MS;
      g.fillStyle(0x07060d, 0.82); g.fillRoundedRect(cx - 150, y, 300, 24, 8);
      g.lineStyle(1.2, warn ? LOT_LILAC : OBS.edge, warn ? 0.95 : 0.5); g.strokeRoundedRect(cx - 150, y, 300, 24, 8);
      g.fillStyle(warn ? LOT_LILAC : IVORY_DIM, 0.85); g.fillRect(cx - 80, y + 9, 160 * k, 6);
      for (const w of WHO) {
        const id = pick(w);
        const x = w === 'player' ? cx - 118 : cx + 118;
        const key = id ? keyOf[w].get(id) ?? '?' : '';
        g.fillStyle(w === 'player' ? SIDE_PLAYER : SIDE_NPC, 0.25); g.fillRoundedRect(x - 26, y + 3, 52, 18, 5);
        if (key) glyphs(g, key, x, y + 12, 11, w === 'player' ? SIDE_PLAYER : ROUGE_LIT, 1, 1.8);
      }
    },
    destroy() { for (const w of WHO) pawn[w]?.target.remove(); },
  };
};

export const DECREE_PAWN_COUNTER: GimmickDef = {
  id: 'bench-fate-pawn-counter',
  rules: 'At each bell, both pawn the ability they cast most. Strike your own ticket to redeem it; strike theirs to sell it on.',
  make,
};
