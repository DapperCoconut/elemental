import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { GREEN, OBS, poly } from '../art';
import { seam } from '../../../../../art/PinnacleArt';
import { WHO, type Who, alive, clamp, dist, fighterOf, other } from './util';

/**
 * Decree of Selection — Councilor Mordant Spurge, Seat of Spores (growth).
 *
 * Spurge wrote the clause that let the Spore Court breed its subjects like a crop: keep the fit,
 * compost the rest. Three glass seed-pods hang on obsidian stalks, each ripening one mutation —
 * CHITIN (take less, move slower), FLAGELLA (move faster), TEETH (your foe takes more), MITOSIS
 * (cooldowns run fast). Strike a ripe pod and it splices into you; you carry two at most, the
 * newest pushing out the oldest. Every fourteen seconds comes THE SELECTION: whoever dealt more
 * damage since the last one is the fitter, and the fitter takes the other's newest mutation.
 *
 * Growth perfected evolves all fight long — so does she, here. Beat her to the pods, or simply
 * out-hit her before the bell and take what she spliced.
 */

type Gene = 'chitin' | 'flagella' | 'teeth' | 'mitosis';
const GENES: Gene[] = ['chitin', 'flagella', 'teeth', 'mitosis'];
const GENE_NAME: Record<Gene, string> = { chitin: 'CHITIN', flagella: 'FLAGELLA', teeth: 'TEETH', mitosis: 'MITOSIS' };
const GENE_COLOR: Record<Gene, number> = { chitin: 0x9ac0a0, flagella: 0x8fe5d0, teeth: 0xf0f0d8, mitosis: 0xb8ff7a };
const POD_R = 26;
const SELECT_MS = 14000;
const SELECT_WARN = 2200;

interface Pod { at: Pt; gene: Gene; ripeAt: number; target: StrikeTarget | null; struckAt: number }
interface Strand { from: Who; to: Who; gene: Gene; at: number }

/** A gene's little emblem, drawn at x, y with radius r. */
export function geneIcon(g: Phaser.GameObjects.Graphics, gene: Gene, x: number, y: number, r: number, a = 1): void {
  const c = GENE_COLOR[gene];
  g.lineStyle(Math.max(1.2, r * 0.18), c, a);
  g.fillStyle(c, a);
  switch (gene) {
    case 'chitin': {
      const pts: number[] = [];
      for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2 + Math.PI / 6; pts.push(x + Math.cos(t) * r, y + Math.sin(t) * r); }
      poly(g, pts, c, 0.35 * a);
      g.strokeCircle(x, y, r * 0.45);
      g.lineBetween(x - r * 0.8, y, x + r * 0.8, y);
      break;
    }
    case 'flagella':
      g.fillCircle(x - r * 0.5, y, r * 0.38);
      g.beginPath(); g.moveTo(x - r * 0.15, y);
      for (let k = 1; k <= 8; k++) g.lineTo(x - r * 0.15 + k * r * 0.17, y + Math.sin(k * 1.4) * r * 0.4);
      g.strokePath();
      break;
    case 'teeth':
      for (let k = 0; k < 3; k++) {
        g.fillTriangle(x - r + k * r * 0.66, y - r * 0.5, x - r * 0.34 + k * r * 0.66, y - r * 0.5, x - r * 0.67 + k * r * 0.66, y + r * 0.2);
        g.fillTriangle(x - r * 0.67 + k * r * 0.66, y + r * 0.55, x + k * r * 0.66 - r * 0.01, y + r * 0.55, x - r * 0.34 + k * r * 0.66, y - r * 0.1);
      }
      break;
    case 'mitosis':
      g.strokeCircle(x - r * 0.42, y, r * 0.5); g.strokeCircle(x + r * 0.42, y, r * 0.5);
      g.fillCircle(x - r * 0.42, y, r * 0.16); g.fillCircle(x + r * 0.42, y, r * 0.16);
      break;
  }
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const regrow = ctx.hard ? 6000 : 7500;
  const genome: Record<Who, Gene[]> = { player: [], npc: [] };
  const dealt: Record<Who, number> = { player: 0, npc: 0 };
  let nextSelect = 0;
  let warned = false;
  const strands: Strand[] = [];
  const midY = (top + H) / 2;
  const pods: Pod[] = [
    { at: { x: 170, y: midY + 40 }, gene: 'chitin', ripeAt: 0, target: null, struckAt: -9999 },
    { at: { x: W - 170, y: midY + 40 }, gene: 'teeth', ripeAt: 0, target: null, struckAt: -9999 },
    { at: { x: W / 2, y: top + 96 }, gene: 'flagella', ripeAt: 0, target: null, struckAt: -9999 },
  ];
  const has = (w: Who, gene: Gene) => genome[w].includes(gene);
  const now = () => ctx.scene.time.now;

  const reseed = (p: Pod, time: number, delay: number) => {
    const choices = GENES.filter((x) => x !== p.gene && !pods.some((q) => q !== p && q.gene === x));
    p.gene = choices[Math.floor(ctx.rng() * choices.length)] ?? GENES[Math.floor(ctx.rng() * GENES.length)];
    p.ripeAt = time + delay;
  };

  const splice = (w: Who, gene: Gene) => {
    const gs = genome[w].filter((x) => x !== gene);
    gs.push(gene);
    while (gs.length > 2) gs.shift();
    genome[w] = gs;
  };

  const struck = (p: Pod, by: Who) => {
    const time = now();
    if (time < p.ripeAt) return;
    splice(by, p.gene);
    ctx.float(p.at.x, p.at.y - 46, `${by === 'player' ? 'YOU' : 'SHE'} SPLICE ${GENE_NAME[p.gene]}`, '#b8ff9a');
    ctx.flash(p.at.x, p.at.y, GENE_COLOR[p.gene]);
    ctx.sfx('spore');
    p.struckAt = time;
    strands.push({ from: by, to: by, gene: p.gene, at: time });
    reseed(p, time, regrow);
  };

  const select = (time: number) => {
    const a = dealt.player, b = dealt.npc;
    dealt.player = 0; dealt.npc = 0;
    if (Math.abs(a - b) < 1) { ctx.banner('THE SELECTION: EVENLY MATCHED', '#d8ffd0'); return; }
    const fit: Who = a > b ? 'player' : 'npc';
    const unfit = other(fit);
    const gene = genome[unfit][genome[unfit].length - 1];
    if (!gene) {
      ctx.banner(fit === 'player' ? 'THE SELECTION: YOU ARE FITTER — SHE HAS NOTHING TO TAKE' : 'THE SELECTION: SHE IS FITTER — YOU HAVE NOTHING TO TAKE', '#d8ffd0');
      return;
    }
    genome[unfit] = genome[unfit].slice(0, -1);
    splice(fit, gene);
    strands.push({ from: unfit, to: fit, gene, at: time });
    ctx.banner(fit === 'player' ? `SELECTED: YOU TAKE HER ${GENE_NAME[gene]}` : `SELECTED: SHE TAKES YOUR ${GENE_NAME[gene]}`, fit === 'player' ? '#b8ff9a' : '#e0b8ff');
    ctx.sfx('curse-cast');
  };

  return {
    update(time) {
      if (nextSelect === 0) {
        nextSelect = time + SELECT_MS;
        for (const p of pods) {
          p.ripeAt = time + 1500;
          p.target = ctx.target({ x: p.at.x, y: p.at.y, r: POD_R, onStruck: (by) => struck(p, by) });
        }
      }
      if (!warned && time >= nextSelect - SELECT_WARN) { warned = true; ctx.banner('THE SELECTION APPROACHES', '#d8ffd0'); ctx.sfx('countdown-tick'); }
      if (time >= nextSelect) { warned = false; nextSelect = time + SELECT_MS; select(time); }
      for (let i = strands.length - 1; i >= 0; i--) if (time - strands[i].at > 900) strands.splice(i, 1);
    },

    onPlayerHurt(a) { if (a > 0) dealt.npc += a; },
    onNpcHurt(a) { if (a > 0) dealt.player += a; },

    playerTakenMult() { return (has('player', 'chitin') ? 0.75 : 1) * (has('npc', 'teeth') ? 1.2 : 1); },
    npcTakenMult() { return (has('npc', 'chitin') ? 0.75 : 1) * (has('player', 'teeth') ? 1.2 : 1); },
    playerSpeedMult() { return (has('player', 'flagella') ? 1.3 : 1) * (has('player', 'chitin') ? 0.9 : 1); },
    npcSpeedMult() { return (has('npc', 'flagella') ? 1.3 : 1) * (has('npc', 'chitin') ? 0.9 : 1); },
    playerCooldownRate() { return has('player', 'mitosis') ? 1.4 : 1; },
    npcCooldownRate() { return has('npc', 'mitosis') ? 1.4 : 1; },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const t = now();
      // Behind on the tally with the bell close and something to take: go and earn it.
      if (nextSelect - t < 4000 && dealt.npc <= dealt.player && genome.player.length) return { x: p.x, y: p.y };
      let best: Pod | null = null, bd = 460;
      for (const pod of pods) {
        if (t < pod.ripeAt - 600 || genome.npc.includes(pod.gene)) continue;
        const d = dist(n.x, n.y, pod.at.x, pod.at.y);
        if (d < bd) { bd = d; best = pod; }
      }
      // Stand just off the pod on the side away from the player so the strike lands.
      if (best) {
        const a = Math.atan2(best.at.y - p.y, best.at.x - p.x);
        return { x: best.at.x + Math.cos(a) * 40, y: clamp(best.at.y + Math.sin(a) * 40, top + 40, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const pod of pods) {
        // The stalk's root: a split in the floor with green welling up it.
        seam(g, [{ x: pod.at.x - 30, y: pod.at.y + 30 }, { x: pod.at.x - 6, y: pod.at.y + 22 }, { x: pod.at.x + 10, y: pod.at.y + 34 }, { x: pod.at.x + 34, y: pod.at.y + 28 }], 1.3, 0.8, 0.3 + 0.2 * Math.sin(time / 400), GREEN.glow);
        g.fillStyle(0x000000, 0.35); g.fillEllipse(pod.at.x, pod.at.y + 28, 56, 14);
      }
    },

    drawAir(g, time) {
      for (const pod of pods) {
        const { x, y } = pod.at;
        const ripe = time >= pod.ripeAt;
        const grow = ripe ? 1 : clamp(1 - (pod.ripeAt - time) / regrow, 0.15, 1);
        // The stalk: a curl of obsidian from the floor to the pod's cap.
        g.lineStyle(6, OBS.glass, 1); g.beginPath(); g.moveTo(x - 4, y + 28); g.lineTo(x + 10, y + 6); g.lineTo(x + 2, y - 30 * grow); g.strokePath();
        g.lineStyle(1.2, OBS.edge, 0.6); g.lineBetween(x + 12, y + 6, x + 4, y - 30 * grow);
        // The pod: a teardrop of green glass with the helix turning inside it.
        const r = POD_R * grow;
        const sway = Math.sin(time / 700 + x) * 3;
        const cx = x + sway, cy = y - 6;
        g.fillStyle(GREEN.glow, ripe ? 0.12 + 0.06 * Math.sin(time / 160) : 0.04); g.fillCircle(cx, cy, r * 1.8);
        g.fillStyle(0x0f2a14, 0.85); g.fillEllipse(cx, cy, r * 1.5, r * 2.1);
        g.fillStyle(GREEN.leafDark, 0.5); g.fillEllipse(cx - r * 0.2, cy - r * 0.15, r * 0.9, r * 1.5);
        for (let k = 0; k < 9; k++) {
          const f = k / 8;
          const yy = cy - r * 0.8 + f * r * 1.6;
          const ox = Math.sin(f * Math.PI * 2 + time / 300) * r * 0.42;
          g.fillStyle(GREEN.vineLit, 0.9); g.fillCircle(cx + ox, yy, 1.8); g.fillCircle(cx - ox, yy, 1.8);
          if (k % 2 === 0) { g.lineStyle(1, GREEN.vineLit, 0.5); g.lineBetween(cx + ox, yy, cx - ox, yy); }
        }
        g.lineStyle(1.6, GREEN.vineLit, 0.8); g.strokeEllipse(cx, cy, r * 1.5, r * 2.1);
        g.fillStyle(0xffffff, 0.35); g.fillEllipse(cx - r * 0.35, cy - r * 0.5, r * 0.25, r * 0.6);
        // The cap where the stalk takes it.
        poly(g, [cx - r * 0.5, cy - r * 0.9, cx + r * 0.5, cy - r * 0.9, cx, cy - r * 1.3], OBS.facet);
        if (ripe) geneIcon(g, pod.gene, cx, cy, 10, 1);
        if (time - pod.struckAt < 500) {
          const k = (time - pod.struckAt) / 500;
          for (let i = 0; i < 10; i++) { const a = i * 0.63; g.fillStyle(GREEN.glow, 1 - k); g.fillCircle(cx + Math.cos(a) * k * 50, cy + Math.sin(a) * k * 50, 2.5); }
        }
      }
      // Each fighter wears its genes as emblems turning round it.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        genome[w].forEach((gene, i) => {
          const a = time / 700 + i * Math.PI;
          const ex = f.x + Math.cos(a) * 34, ey = f.y - 8 + Math.sin(a) * 12;
          g.fillStyle(0x000000, 0.45); g.fillCircle(ex, ey, 9);
          geneIcon(g, gene, ex, ey, 7, 1);
        });
      }
      // Strands of DNA flying from the pod or the loser to the fitter.
      for (const s of strands) {
        const k = clamp((time - s.at) / 900, 0, 1);
        const a = fighterOf(ctx, s.from), b = fighterOf(ctx, s.to);
        const sx = s.from === s.to ? b.x : a.x, sy = s.from === s.to ? b.y - 60 : a.y;
        const x = sx + (b.x - sx) * k, y = sy + (b.y - sy) * k - Math.sin(k * Math.PI) * 60;
        for (let i = 0; i < 6; i++) {
          const o = Math.sin(time / 60 + i) * 6;
          g.fillStyle(GENE_COLOR[s.gene], 1 - k * 0.5); g.fillCircle(x - i * 5, y + o, 2.4); g.fillCircle(x - i * 5, y - o, 2.4);
        }
        if (s.from !== s.to) geneIcon(g, s.gene, x, y, 9, 1);
      }
    },

    drawHud(g, time) {
      // The tally since the last Selection, as two vines racing to the middle, and the clock.
      const cx = W / 2, y = top + 18;
      const total = Math.max(40, dealt.player + dealt.npc);
      const lp = (dealt.player / total) * 150, ln = (dealt.npc / total) * 150;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(cx - 168, y - 10, 336, 34, 8);
      g.fillStyle(GREEN.leaf, 0.95); g.fillRect(cx - 8 - lp, y - 4, lp, 8);
      g.fillStyle(OBS.seam, 0.95); g.fillRect(cx + 8, y - 4, ln, 8);
      const k = clamp((nextSelect - time) / SELECT_MS, 0, 1);
      g.fillStyle(k < SELECT_WARN / SELECT_MS ? 0xffffff : GREEN.vineLit, 0.9); g.fillRect(cx - 150, y + 12, 300 * k, 3);
      g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(cx, y - 8, cx, y + 8);
      // Genome slots under each side.
      for (const w of WHO) {
        for (let i = 0; i < 2; i++) {
          const sx = w === 'player' ? cx - 150 + i * 22 : cx + 128 + i * 22, sy = y + 34;
          g.fillStyle(0x000000, 0.55); g.fillCircle(sx, sy, 9);
          g.lineStyle(1, w === 'player' ? GREEN.vineLit : OBS.seamLit, 0.6); g.strokeCircle(sx, sy, 9);
          const gene = genome[w][i];
          if (gene) geneIcon(g, gene, sx, sy, 6.5, 1);
        }
      }
    },

    destroy() { for (const p of pods) p.target?.remove(); },
  };
}

export const DECREE_SELECTION: GimmickDef = {
  id: 'bench-life-selection',
  rules: 'Strike a ripe pod to splice its mutation in (two at most). Every 14s THE SELECTION: whoever dealt more since the last takes the other\'s newest.',
  make,
};
