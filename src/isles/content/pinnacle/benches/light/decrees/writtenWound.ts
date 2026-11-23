import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import type { G } from '../../../../../art/IsleArt';
import { OBS } from '../../../../../art/PinnacleArt';
import { NOON } from '../art';
import { SIDE, SIDE_CSS, WHO, type Who, alive, clamp, dist, fighterOf, onFloor, otherOf } from './util';

/**
 * DECREE OF THE WRITTEN WOUND — Councilor Ambrose Quillon, Seat of Sigils (Magic).
 *
 * He drafted the Sigil Bind, the circles that hold the Heliostat's mirrors to the sun: nothing
 * written may move. Here nothing struck lands all at once. Only part of every blow is felt;
 * the rest is WRITTEN — a sigil burns into the floor where the wounded stood, inks itself in for
 * a breath (later blows there add to it), then counts down and is SERVED:
 *   - on everyone standing in its circle when it falls due, in full;
 *   - and if nobody is standing in it, the wounded pays most of it anyway.
 * So step off your own wounds — and put the other fighter on them. A wound served on its
 * writer's enemy is MISFILED, and costs the writer nothing.
 * His wheel-spells already land two seconds late; his Gust drags whatever it catches back to
 * where he cast it. He reads sigils like print and will not stand on one. The trick: he steps
 * out of a sigil the same way every time — straight out from its centre. Be there.
 */

interface Sigil { owner: Who; x: number; y: number; debt: number; born: number; sealAt: number; dueAt: number; seed: number }

const WRITE_MS = 750;
const NOW_PART = 0.4;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { top } = ctx;
  const DUE = ctx.hard ? 2000 : 2400;
  const UNSTOOD = ctx.hard ? 0.75 : 0.6;
  const sigils: Sigil[] = [];
  let serving = false;
  let announced = false;
  const ledger: Record<Who, number> = { player: 0, npc: 0 };

  const radius = (s: Sigil) => 44 + Math.min(40, s.debt * 0.7);

  function wound(w: Who, amount: number): void {
    if (serving || amount <= 0) return;
    const f = fighterOf(ctx, w);
    const now = ctx.scene.time.now;
    // Only `NOW_PART` of the blow got through; the rest is owed.
    const owed = (amount / NOW_PART) * (1 - NOW_PART);
    const open = sigils.find((s) => s.owner === w && now < s.sealAt);
    if (open) { open.debt += owed; return; }
    if (sigils.length >= 10) serve(sigils.shift()!);
    sigils.push({ owner: w, x: f.x, y: f.y, debt: owed, born: now, sealAt: now + WRITE_MS, dueAt: now + WRITE_MS + ctx.tk.warn(DUE), seed: Math.floor(now) % 997 });
  }

  function serve(s: Sigil): void {
    const r = radius(s);
    const inside = WHO.filter((w) => { const f = fighterOf(ctx, w); return alive(f) && dist(f.x, f.y, s.x, s.y) < r; });
    serving = true;
    try {
      if (!inside.length) {
        const f = fighterOf(ctx, s.owner);
        ctx.hit(f, (s.debt * UNSTOOD) / NOW_PART, f.x, f.y);
        ctx.float(s.x, s.y - 20, 'SERVED IN ABSENCE', '#e8dcae');
      } else {
        for (const w of inside) {
          const f = fighterOf(ctx, w);
          ctx.hit(f, s.debt / NOW_PART, f.x, f.y);
          ctx.float(f.x, f.y - 52, w === s.owner ? 'SERVED' : 'MISFILED!', SIDE_CSS[otherOf(w)]);
        }
      }
    } finally { serving = false; }
    ctx.flash(s.x, s.y, NOON.gold);
    ctx.sfx(inside.length ? 'judgement' : 'crystal-shatter');
  }

  return {
    update(time) {
      if (!announced) { announced = true; ctx.banner('EVERY WOUND IS WRITTEN', '#fff2b0'); }
      ledger.player = 0; ledger.npc = 0;
      for (let i = sigils.length - 1; i >= 0; i--) {
        const s = sigils[i];
        if (time >= s.dueAt) { sigils.splice(i, 1); serve(s); continue; }
        ledger[s.owner] += s.debt;
      }
    },
    onPlayerHurt(amount) { wound('player', amount); },
    onNpcHurt(amount) { wound('npc', amount); },
    playerTakenMult() { return NOW_PART; },
    npcTakenMult() { return NOW_PART; },

    npcSeek() {
      const n = ctx.npc, now = ctx.scene.time.now;
      // Out of any sigil that will fall due before he could walk out of it at leisure.
      let worst: Sigil | null = null;
      for (const s of sigils) {
        if (dist(n.x, n.y, s.x, s.y) < radius(s) + 14 && (!worst || s.dueAt < worst.dueAt)) worst = s;
      }
      if (worst && worst.dueAt - now < 2600) {
        const d = dist(n.x, n.y, worst.x, worst.y) || 1;
        const r = radius(worst) + 40;
        return onFloor(ctx, worst.x + ((n.x - worst.x) / d) * r, worst.y + ((n.y - worst.y) / d) * r);
      }
      return null;
    },

    drawGround(g, time) {
      for (const s of sigils) drawSigil(g, s, time);
    },

    drawAir(g, time) {
      // Who is standing in a sigil about to be served: a ring of script round their feet.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        const s = sigils.find((q) => dist(f.x, f.y, q.x, q.y) < radius(q));
        if (!s) continue;
        const k = clamp(1 - (s.dueAt - time) / ctx.tk.warn(DUE), 0, 1);
        g.lineStyle(2, SIDE[s.owner], 0.4 + k * 0.5);
        g.beginPath(); g.arc(f.x, f.y + 4, 26, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },

    drawHud(g) {
      // The ledger: what each side still owes the floor.
      const y = top + 18;
      for (const w of WHO) {
        const x = w === 'player' ? 150 : ctx.W - 150;
        g.fillStyle(OBS.glass, 0.85); g.fillRoundedRect(x - 72, y - 11, 144, 22, 6);
        g.lineStyle(1.2, SIDE[w], 0.8); g.strokeRoundedRect(x - 72, y - 11, 144, 22, 6);
        const k = clamp(ledger[w] / 120, 0, 1);
        g.fillStyle(SIDE[w], 0.75); g.fillRect(x - 40, y - 4, 104 * k, 8);
        // A quill-and-circle icon.
        g.lineStyle(1.2, SIDE[w], 1); g.strokeCircle(x - 58, y, 7);
        g.lineBetween(x - 63, y + 6, x - 52, y - 7);
      }
    },
  };

  /**
   * A written wound: a sigil inked in rings while it is being written, then counting down — its
   * outer ring burning away round the clock — and flaring white as it falls due.
   */
  function drawSigil(g: G, s: Sigil, time: number): void {
    const r = radius(s);
    const c = SIDE[s.owner];
    const writing = time < s.sealAt;
    const k = writing ? (time - s.born) / WRITE_MS : clamp((time - s.sealAt) / (s.dueAt - s.sealAt), 0, 1);
    const spin = time / 1600 + s.seed;
    g.fillStyle(c, writing ? 0.05 : 0.06 + k * 0.14); g.fillCircle(s.x, s.y, r);
    if (!writing && k > 0.8 && Math.floor(time / 80) % 2) { g.fillStyle(0xffffff, 0.16); g.fillCircle(s.x, s.y, r); }
    // Outer ring: inked as it is written, then burned away clockwise as the due time comes.
    g.lineStyle(2.4, c, 0.9);
    g.beginPath();
    if (writing) g.arc(s.x, s.y, r, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false);
    else g.arc(s.x, s.y, r, -Math.PI / 2 + k * Math.PI * 2, Math.PI * 1.5, false);
    g.strokePath();
    g.lineStyle(1, c, 0.6); g.strokeCircle(s.x, s.y, r * 0.78);
    // Inner figure: a seven-pointed star written in one stroke (the bench's binding hand).
    const pts: { x: number; y: number }[] = [];
    const n = writing ? Math.max(2, Math.ceil(k * 8)) : 8;
    for (let i = 0; i < n; i++) {
      const a = spin + ((i * 3) % 7) * ((Math.PI * 2) / 7);
      pts.push({ x: s.x + Math.cos(a) * r * 0.72, y: s.y + Math.sin(a) * r * 0.72 });
    }
    g.lineStyle(1.4, writing ? NOON.gold : c, 0.85); g.strokePoints(pts, false);
    // Runes round the band: little marks of the debt, one per four points owed.
    const marks = Math.min(24, Math.ceil(s.debt / 4));
    for (let i = 0; i < marks; i++) {
      const a = -spin * 0.6 + (i / marks) * Math.PI * 2;
      const mx = s.x + Math.cos(a) * r * 0.89, my = s.y + Math.sin(a) * r * 0.89;
      g.fillStyle(NOON.gold, 0.9); g.fillRect(mx - 1.5, my - 1.5, 3, 3);
      g.lineStyle(1, NOON.gold, 0.7); g.lineBetween(mx, my, mx + Math.cos(a + 1.3) * 4, my + Math.sin(a + 1.3) * 4);
    }
    // The amount, quill-small, in the middle.
    g.fillStyle(OBS.glass, 0.8); g.fillCircle(s.x, s.y, 9);
    g.lineStyle(1, NOON.brass, 0.9); g.strokeCircle(s.x, s.y, 9);
    g.fillStyle(c, 1); g.fillCircle(s.x, s.y, 3 + Math.min(4, s.debt / 20));
  }
}

export const WRITTEN_WOUND: GimmickDef = {
  id: 'bench-light-written-wound',
  rules: 'Every wound is written before it is served: most of a blow becomes a sigil that strikes whoever stands in it when it falls due.',
  make,
};
