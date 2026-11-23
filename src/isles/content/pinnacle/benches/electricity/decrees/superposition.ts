import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { OBS, seam } from '../../../../../art/PinnacleArt';
import { ARC_CORE, SIDE_NPC, SIDE_NPC_CSS, SIDE_PLAYER, SIDE_PLAYER_CSS, type SeatGlyph, VOLT, bolt, glyph } from '../art';
import { type Who, clamp, dist } from '../util';
import { DECREE_CONDUCTION } from './conduction';
import { DECREE_CONTAMINATION } from './contamination';
import { DECREE_CYCLOTRON } from './cyclotron';
import { DECREE_TABLE } from './table';
import { DECREE_VERIFICATION } from './verification';

/**
 * DECREE OF SUPERPOSED LAW — Councilor Hilbert Twice, Seat of the Superposition (quantum).
 *
 * Twice is the bench's last seat and its cleverest drafter: he never wrote a clause of his own. He
 * wrote the clause that let the other five apply *at once*. Quantum has no subject of its own — it
 * wears other elements' keys — and his law has no subject of its own either: it wears the bench's.
 * Two of the other five decrees are in force together, superposed, both real, both biting. Over
 * the middle of the floor hangs the Wavefunction, a two-lobed thing of black glass: strike a lobe
 * and the law COLLAPSES into that one decree alone (and the measurer's keys run quick for a few
 * seconds). It holds a while, decoheres, and two new laws superpose.
 *
 * A perfected Quantum bot measures for itself — it goes for the lobe of whichever law it is
 * standing better in. The turn: the measurement is a race anyone can win, and the player who
 * reads both laws first chooses which of them the councilor has to fight under.
 */

interface Law { def: GimmickDef; name: string; glyph: SeatGlyph }
const LAWS: Law[] = [
  { def: DECREE_CONDUCTION, name: 'CONDUCTION', glyph: 'electricity' },
  { def: DECREE_VERIFICATION, name: 'VERIFICATION', glyph: 'technology' },
  { def: DECREE_CYCLOTRON, name: 'THE CYCLOTRON', glyph: 'magnet' },
  { def: DECREE_CONTAMINATION, name: 'CONTAMINATION', glyph: 'radiation' },
  { def: DECREE_TABLE, name: 'THE TABLE', glyph: 'rubber' },
];

interface Live { law: Law; g: EncounterGimmick }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, top, rng } = ctx;
  const SUPER_MS = ctx.hard ? 10000 : 9000;
  const COLLAPSE_MS = 12000;
  const OX = W / 2, OY = top + 72;
  const LOBE = 44;

  /** The ctx each superposed law is built with: their opening banners are swallowed — Twice announces. */
  const sub = Object.create(ctx) as GimmickCtx;
  sub.banner = (text: string, color?: string) => { if (!text.startsWith('DECREE OF')) ctx.banner(text, color); };

  let live: Live[] = [];
  let state: 'super' | 'collapsed' | 'none' = 'none';
  let until = -1;
  let last: Law[] = [];
  let measured: { by: Who; at: number } | null = null;
  const quick: Record<Who, number> = { player: 0, npc: 0 };
  let lobes: StrikeTarget[] = [];

  const drop = (l: Live) => { try { l.g.destroy?.(); } catch (e) { console.error('[isles] superposition', e); } };
  const build = (law: Law): Live => ({ law, g: law.def.make(sub) });

  const removeLobes = () => { for (const t of lobes) t.remove(); lobes = []; };

  const collapse = (keep: number, by: Who | null, time: number) => {
    if (state !== 'super') return;
    live.forEach((l, i) => { if (i !== keep) drop(l); });
    live = [live[keep]];
    removeLobes();
    state = 'collapsed';
    until = time + COLLAPSE_MS;
    if (by) {
      measured = { by, at: time };
      quick[by] = time + 4000;
    }
    ctx.banner(`${by === 'player' ? 'YOU MEASURED' : by === 'npc' ? 'HE MEASURED' : 'IT COLLAPSED'} — ${live[0].law.name}`, by === 'player' ? SIDE_PLAYER_CSS : by === 'npc' ? SIDE_NPC_CSS : '#ffe14a');
    ctx.sfx('teleport');
    ctx.flash(OX, OY, VOLT);
  };

  const superpose = (time: number) => {
    for (const l of live) drop(l);
    const pool = LAWS.filter((l) => !last.includes(l));
    const a = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const b = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    last = [a, b];
    live = [build(a), build(b)];
    state = 'super';
    until = time + SUPER_MS;
    measured = null;
    removeLobes();
    lobes = [-1, 1].map((side, i) => ctx.target({
      x: OX + side * LOBE, y: OY, r: 26,
      onStruck: (by) => collapse(i, by, ctx.scene.time.now),
    }));
    ctx.banner(`SUPERPOSED — ${a.name} AND ${b.name}`, '#ffe14a');
    ctx.sfx('glitch');
  };

  const each = <T>(fn: (g: EncounterGimmick) => T | undefined): T[] => {
    const out: T[] = [];
    for (const l of live) { const v = fn(l.g); if (v !== undefined) out.push(v); }
    return out;
  };
  const prod = (xs: number[]): number => xs.reduce((a, b) => a * b, 1);

  /** The Wavefunction: two lobes of black glass on a violet-gold seam, each showing its law's glyph. */
  const wave = (g: Phaser.GameObjects.Graphics, time: number) => {
    const t = time / 1000;
    if (state === 'super') {
      const k = clamp((until - time) / SUPER_MS, 0, 1);
      g.fillStyle(VOLT, 0.05); g.fillCircle(OX, OY, 110);
      live.forEach((l, i) => {
        const side = i === 0 ? -1 : 1;
        const wob = Math.sin(t * 5 + i * 2) * 4;
        const x = OX + side * LOBE + wob, y = OY + Math.cos(t * 4 + i) * 3;
        // The probability halo, flickering between the two states.
        const on = Math.sin(t * 9 + i * Math.PI) > 0;
        g.fillStyle(i === 0 ? SIDE_PLAYER : SIDE_NPC, 0.06 + (on ? 0.08 : 0)); g.fillCircle(x, y, 40);
        g.fillStyle(OBS.glass, 0.95); g.fillEllipse(x, y, 54, 64);
        g.fillStyle(OBS.facet, 0.9); g.fillEllipse(x + side * 6, y - 6, 26, 40);
        g.lineStyle(1.5, OBS.edge, 0.8); g.strokeEllipse(x, y, 54, 64);
        glyph(g, l.law.glyph, x, y, 12, VOLT, 0.6 + (on ? 0.4 : 0.1));
      });
      seam(g, [{ x: OX - 18, y: OY - 4 }, { x: OX, y: OY + 4 }, { x: OX + 18, y: OY - 4 }], 2, 1, 0.5 + 0.5 * Math.sin(t * 6), OBS.seam);
      bolt(g, OX - LOBE, OY, OX + LOBE, OY, Math.floor(time / 50), 1.2, VOLT, 0.5, 0);
      // The time before it collapses on its own, as a closing ring.
      g.lineStyle(3, VOLT, 0.7); g.beginPath(); g.arc(OX, OY, 92, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      return;
    }
    if (state === 'collapsed' && live[0]) {
      // Collapsed: one lobe, small and still, with its law's glyph; the measurer's colour round it.
      const since = measured ? time - measured.at : 9999;
      const c = measured ? (measured.by === 'player' ? SIDE_PLAYER : SIDE_NPC) : VOLT;
      if (since < 600) {
        const k = since / 600;
        g.lineStyle(6, ARC_CORE, 1 - k); g.strokeCircle(OX, OY, 30 + k * 140);
      }
      const k = clamp((until - time) / COLLAPSE_MS, 0, 1);
      g.fillStyle(OBS.glass, 0.9); g.fillEllipse(OX, OY, 40, 48);
      g.lineStyle(2, c, 0.8); g.strokeEllipse(OX, OY, 40, 48);
      glyph(g, live[0].law.glyph, OX, OY, 10, VOLT, 0.9);
      g.lineStyle(2, VOLT, 0.5); g.beginPath(); g.arc(OX, OY, 34, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
    }
  };

  return {
    update(time, dt) {
      if (state === 'none') {
        ctx.banner('DECREE OF SUPERPOSED LAW — TWO LAWS AT ONCE, UNTIL SOMEONE LOOKS', '#ffe14a');
        superpose(time);
        return;
      }
      if (state === 'super' && time >= until) collapse(Math.floor(rng() * live.length), null, time);
      else if (state === 'collapsed' && time >= until) superpose(time);
      for (const l of live) l.g.update(time, dt);
    },
    drawGround(g, time) { for (const l of live) l.g.drawGround?.(g, time); wave(g, time); },
    drawAir(g, time) { for (const l of live) l.g.drawAir?.(g, time); },
    drawHud(g, time) {
      if (live.length === 1) { live[0].g.drawHud?.(g, time); return; }
      // Superposed: each law's readout, pushed to its own side of the strip.
      live.forEach((l, i) => {
        g.save();
        g.translateCanvas(i === 0 ? -W * 0.22 : W * 0.22, 0);
        l.g.drawHud?.(g, time);
        g.restore();
      });
    },
    playerSpeedMult() { return prod(each((g) => g.playerSpeedMult?.())); },
    npcSpeedMult() { return prod(each((g) => g.npcSpeedMult?.())); },
    playerTakenMult() { return prod(each((g) => g.playerTakenMult?.())); },
    npcTakenMult() { return prod(each((g) => g.npcTakenMult?.())); },
    playerCooldownRate() { return prod(each((g) => g.playerCooldownRate?.())) * (ctx.scene.time.now < quick.player ? 1.5 : 1); },
    npcCooldownRate() { return prod(each((g) => g.npcCooldownRate?.())) * (ctx.scene.time.now < quick.npc ? 1.5 : 1); },
    npcSeek(): Pt | null {
      const n = ctx.npc;
      if (state === 'super' && lobes.length === 2) {
        // Measure: the lobe of the law whose own rule is asking it to go somewhere nearer.
        const wants = live.map((l) => l.g.npcSeek?.() ?? null);
        let pick = 0;
        if (wants[0] && wants[1]) pick = dist(n.x, n.y, wants[0].x, wants[0].y) <= dist(n.x, n.y, wants[1].x, wants[1].y) ? 0 : 1;
        else pick = wants[0] ? 0 : wants[1] ? 1 : (dist(n.x, n.y, lobes[0].x, lobes[0].y) <= dist(n.x, n.y, lobes[1].x, lobes[1].y) ? 0 : 1);
        const lobe = lobes[pick];
        if (dist(n.x, n.y, lobe.x, lobe.y) < 420) return { x: lobe.x, y: lobe.y + 40 };
        return wants[pick] ?? wants[1 - pick] ?? null;
      }
      for (const l of live) { const p = l.g.npcSeek?.(); if (p) return p; }
      return null;
    },
    onPlayerHurt(a) { for (const l of live) l.g.onPlayerHurt?.(a); },
    onNpcHurt(a) { for (const l of live) l.g.onNpcHurt?.(a); },
    onPlayerCast(id, slot) { for (const l of live) l.g.onPlayerCast?.(id, slot); },
    onNpcCast(id) { for (const l of live) l.g.onNpcCast?.(id); },
    destroy() { for (const l of live) drop(l); live = []; removeLobes(); },
  };
}

export const DECREE_SUPERPOSITION: GimmickDef = {
  id: 'bench-electricity-superposition',
  rules: 'Two of this bench\'s other decrees are in force at once. Strike a lobe of the Wavefunction and the law collapses to that one alone.',
  make,
};
