import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, type G } from '../../../../../art/IsleArt';
import { SAND, SAND_DARK, SAND_DEEP, SAND_LIT, SAND_PALE, SAND_SHADOW, STRIPE_SAFFRON, TIMBER, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Barchan Walks — Yusra, Dune-Shepherd: in the star's telling she is the one who herds the
 * dunes for Prince Sirocco, walking ahead of a barchan with her crook and setting it down on the
 * tents of whichever household he names. The Sanded Camp is what she has shepherded.
 *
 * A barchan — a crescent dune, horns pointing downwind — walks across the yard. Its windward back
 * is a long soft slope (slow going); its crest is the one place the wind holds you up (blows land
 * softer there); and its lee is a steep slip face. Every few seconds the lip of the crest gives:
 * the slip face pours, and whoever stands on it is buried to the waist (hurt, held) as the dune
 * lurches a step forward. Stay ahead of it and it walks you into the wall; cross it between slips,
 * over the back or round a horn.
 *
 * Exploit: the cornice at the top of the crest is a thing you can strike. Strike it and the lip
 * gives at once on a short warning — bury Yusra on her own face. At half the wind turns round and
 * the dune turns inside out: back becomes face, and it walks home faster. The bot climbs to the
 * crest for its shelter, gets off the face when the lip trickles, and strikes the cornice when you
 * are below it.
 */

const ID = fallenId('dunesea', 'barchan');
const R = 190;
const FACE = 105;
const BACK = 125;
const SPAN = 1.13;
const CREST_W = 20;
const WARN_MS = 1100;
const SHORT_WARN = 520;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  let wx = 1;
  const D: Pt = { x: 330, y: (top + H) / 2 + 20 };
  let slipEvery = 4300;
  let nextSlip = 0;
  let warnAt = 0;
  let slipAt = 0;
  let lastSlip = -1e9;
  let lurch = 0;
  let turned = false;
  let graceUntil = 0;
  let started = false;
  const buried = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let cornice: StrikeTarget | null = null;

  const phi = () => (wx > 0 ? Math.PI : 0);
  const crestAt = (a: number): Pt => ({ x: D.x + Math.cos(phi() + a) * R, y: D.y + Math.sin(phi() + a) * R });
  const polar = (x: number, y: number) => ({ r: dist(D.x, D.y, x, y), a: wrapAngle(Math.atan2(y - D.y, x - D.x) - phi()) });
  const onFace = (x: number, y: number) => { const p = polar(x, y); return Math.abs(p.a) < SPAN && p.r > R - FACE && p.r < R - CREST_W * 0.5; };
  const onCrest = (x: number, y: number) => { const p = polar(x, y); return Math.abs(p.a) < SPAN && Math.abs(p.r - R) < CREST_W; };
  const onBack = (x: number, y: number) => { const p = polar(x, y); return Math.abs(p.a) < SPAN + 0.08 && p.r >= R + CREST_W && p.r < R + BACK; };

  function placeCornice(): void {
    const c = crestAt(0);
    if (!cornice) {
      cornice = ctx.target({
        x: c.x, y: c.y, r: 24, passThrough: true,
        onStruck: (by) => {
          if (warnAt || tk.now - lastSlip < 2200 || tk.now < graceUntil) return;
          warnAt = tk.now; slipAt = tk.now + tk.warn(SHORT_WARN);
          ctx.sfx('stone-slam');
          ctx.float(c.x, c.y - 34, by === 'player' ? 'THE LIP CRACKS' : 'SHE KICKS THE LIP', '#f2d496');
        },
      });
    } else cornice.moveTo(c.x, c.y);
  }

  function newDune(): void {
    D.y = top + 190 + rng() * (H - top - 360);
    D.x = wx > 0 ? R - 60 : W - R + 60;
    placeCornice();
  }

  function slip(time: number): void {
    ctx.sfx('quake');
    for (const f of [player, npc]) {
      if (!alive(f) || !onFace(f.x, f.y)) continue;
      buried.set(f, time + 1250);
      if (f === player) { tk.hitPlayer(18, f.x, f.y); ctx.root(player, 1250); }
      else { ctx.hit(npc, 30, f.x, f.y); ctx.root(npc, 1250); ctx.float(f.x, f.y - 52, 'BURIED', '#f2d496'); }
    }
    lastSlip = time; warnAt = 0; slipAt = 0; lurch = 55;
    nextSlip = time + slipEvery;
  }

  return {
    update(time, rawDt) {
      const dt = stepDt(rawDt);
      if (!started) { started = true; nextSlip = time + 3200; placeCornice(); }
      if (!turned && npc.hp < npc.maxHp * 0.5) {
        turned = true;
        const c = crestAt(0);
        wx = -wx;
        D.x = c.x + Math.cos(phi()) * -R; // the crest stays put; the horns swing round
        warnAt = 0; slipAt = 0; slipEvery = 3400;
        graceUntil = time + 1600; nextSlip = time + 2400;
        ctx.banner('THE WIND TURNS', '#f2d496'); ctx.sfx('tornado');
      }
      // The dune creeps, and lurches when its face slips.
      const step = Math.min(lurch, 260 * dt);
      lurch -= step;
      D.x += wx * (14 * dt + step);
      if ((wx > 0 && D.x - R > W + 60) || (wx < 0 && D.x + R < -60)) newDune();
      placeCornice();

      if (!warnAt && time >= nextSlip && time >= graceUntil) { warnAt = time; slipAt = time + tk.warn(WARN_MS); ctx.sfx('status-slow'); }
      if (warnAt && time >= slipAt) slip(time);
    },

    playerSpeedMult: () => (onBack(player.x, player.y) ? 0.72 : 1),
    npcSpeedMult: () => (onBack(npc.x, npc.y) ? 0.72 : 1),
    playerTakenMult: () => (onCrest(player.x, player.y) ? 0.75 : 1),
    npcTakenMult: () => (onCrest(npc.x, npc.y) ? 0.75 : 1),

    npcSeek() {
      if (!alive(npc)) return null;
      const p = polar(npc.x, npc.y);
      const at = (r: number, a: number): Pt => ({ x: tk.clampX(D.x + Math.cos(phi() + a) * r), y: tk.clampY(D.y + Math.sin(phi() + a) * r) });
      if (warnAt && onFace(npc.x, npc.y)) return p.r > R - FACE / 2 ? at(R + 45, p.a) : at(R - FACE - 45, p.a);
      if (onFace(player.x, player.y) && !warnAt && tk.now - lastSlip > 2200) { const c = crestAt(0); return { x: tk.clampX(c.x - wx * 40), y: tk.clampY(c.y) }; }
      const a = clamp(p.a, -SPAN + 0.15, SPAN - 0.15);
      const crest = at(R, a);
      return dist(crest.x, crest.y, player.x, player.y) < 320 ? crest : null;
    },

    drawGround(g, time) {
      const k = warnAt ? clamp((time - warnAt) / Math.max(1, slipAt - warnAt), 0, 1) : 0;
      drawDune(g, D, phi(), time, k, time - lastSlip);
      if (cornice) drawCornice(g, cornice.x, cornice.y, phi(), k, time - lastSlip < 2200);
    },

    drawAir(g, time) {
      // Sand smoking off the crest, downwind.
      for (let i = 0; i < 16; i++) {
        const a = -SPAN + (i / 15) * SPAN * 2;
        const c = crestAt(a);
        const ph = ((time / 900 + i * 0.37) % 1);
        g.lineStyle(1.5, SAND_PALE, 0.5 * (1 - ph));
        g.lineBetween(c.x + wx * ph * 60, c.y - 6 - ph * 8, c.x + wx * (ph * 60 + 18), c.y - 7 - ph * 9);
      }
      for (const [f, until] of buried) {
        if (time > until || !alive(f)) continue;
        const k = clamp((until - time) / 1250, 0, 1);
        g.fillStyle(SAND_DARK, 1); g.fillEllipse(f.x, f.y + 14, 58, 26);
        g.fillStyle(SAND, 1); g.fillEllipse(f.x, f.y + 8, 50 * (0.6 + k * 0.4), 22 * (0.6 + k * 0.4));
        g.fillStyle(SAND_LIT, 0.9); g.fillEllipse(f.x - 6, f.y + 3, 26, 8);
        for (let i = 0; i < 5; i++) { g.fillStyle(SAND_PALE, 0.8); g.fillCircle(f.x - 20 + i * 10, f.y + 4 + Math.sin(time / 120 + i) * 2, 2); }
      }
      if (time - lastSlip < 600) {
        const k = (time - lastSlip) / 600;
        for (let i = 0; i < 10; i++) {
          const a = -SPAN + (i / 9) * SPAN * 2;
          const r = R - k * FACE;
          const x = D.x + Math.cos(phi() + a) * r, y = D.y + Math.sin(phi() + a) * r;
          g.fillStyle(SAND_LIT, 0.5 * (1 - k)); g.fillEllipse(x, y - 10, 46, 24);
        }
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 18;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 60, y - 14, 120, 28, 6);
      // A little crescent and its wind.
      g.fillStyle(SAND, 1); g.fillCircle(x - 20, y, 10);
      g.fillStyle(0x1a1410, 1); g.fillCircle(x - 20 + wx * 6, y, 9);
      g.lineStyle(2, SAND_PALE, 1); g.lineBetween(x - 44, y, x - 34, y);
      g.fillStyle(SAND_PALE, 1);
      if (wx > 0) g.fillTriangle(x - 34, y - 4, x - 34, y + 4, x - 29, y); else g.fillTriangle(x - 44, y - 4, x - 44, y + 4, x - 49, y);
      // The lip: grains fill the glass as the next slip nears.
      const k = warnAt ? 1 : clamp(1 - (nextSlip - time) / slipEvery, 0, 1);
      g.fillStyle(0x3a2a1c, 1); g.fillRect(x, y - 6, 48, 12);
      g.fillStyle(warnAt ? STRIPE_SAFFRON : SAND_LIT, 1); g.fillRect(x + 1, y - 5, 46 * k, 10);
    },

    destroy() { cornice?.remove(); cornice = null; },
  };
}

/** The barchan: a rippled windward back, the bright crest, a dark slip face tapering into horns. */
function drawDune(g: G, D: Pt, phi: number, time: number, warn: number, since: number): void {
  const P = (r: number, a: number): Pt => ({ x: D.x + Math.cos(phi + a) * r, y: D.y + Math.sin(phi + a) * r });
  const arc = (r: number, span: number, n = 18): Pt[] => { const o: Pt[] = []; for (let i = 0; i <= n; i++) o.push(P(r, -span + (i / n) * span * 2)); return o; };
  // Shadow off the back, then the back in three bands of light.
  g.fillStyle(SAND_SHADOW, 0.18); g.fillPoints([...arc(R + BACK + 14, SPAN + 0.1), ...arc(R, SPAN).reverse()], true);
  for (let b = 0; b < 3; b++) {
    const r0 = R + BACK - b * (BACK / 3);
    g.fillStyle(b === 0 ? SAND : b === 1 ? SAND_LIT : SAND_PALE, 1);
    g.fillPoints([...arc(r0, SPAN + 0.08 - b * 0.02), ...arc(R, SPAN).reverse()], true);
  }
  // Ripple marks across the back, parallel to the crest.
  for (let r = R + 22; r < R + BACK - 6; r += 14) {
    const pts = arc(r, SPAN - 0.05, 22);
    for (let i = 0; i < pts.length - 1; i++) {
      const w = Math.sin(i * 1.7 + r * 0.3) * 2;
      g.lineStyle(1, SAND_DARK, 0.35); g.lineBetween(pts[i].x + w, pts[i].y, pts[i + 1].x + w, pts[i + 1].y);
    }
  }
  // The slip face: steep, shadowed, its toe darkest; the horns taper.
  const inner = arc(R - FACE, SPAN * 0.78);
  g.fillStyle(SAND_DARK, 1); g.fillPoints([...arc(R, SPAN), ...inner.reverse()], true);
  g.fillStyle(SAND_DEEP, 0.7); g.fillPoints([...arc(R - FACE * 0.55, SPAN * 0.9), ...arc(R - FACE, SPAN * 0.78).reverse()], true);
  // Avalanche tongues down the face, running when the lip trickles.
  for (let i = 0; i < 14; i++) {
    const a = -SPAN * 0.85 + (i / 13) * SPAN * 1.7;
    const run = warn > 0 ? ((time / 260 + i * 0.29) % 1) : 0.15 + (i % 3) * 0.1;
    const a0 = P(R - 4, a), a1 = P(R - 4 - FACE * (0.3 + run * 0.65), a + Math.sin(i) * 0.02);
    g.lineStyle(warn > 0 ? 3 : 2, warn > 0 ? SAND_LIT : SAND, warn > 0 ? 0.4 + warn * 0.5 : 0.35);
    g.lineBetween(a0.x, a0.y, a1.x, a1.y);
  }
  if (warn > 0) { g.lineStyle(3, STRIPE_SAFFRON, 0.35 + warn * 0.5); g.strokePoints(arc(R - FACE, SPAN * 0.78), false); }
  if (since < 900) { g.fillStyle(SAND_LIT, 0.35 * (1 - since / 900)); g.fillPoints([...arc(R, SPAN), ...arc(R - FACE, SPAN * 0.78).reverse()], true); }
  // The crest: a knife-edge of sun.
  g.lineStyle(5, SAND_LIT, 1); g.strokePoints(arc(R, SPAN), false);
  g.lineStyle(2, 0xfff6e0, 1); g.strokePoints(arc(R + 2, SPAN), false);
}

/** The cornice: an overhanging lip of crusted sand over the face, a shepherd's marker stake in it. */
function drawCornice(g: G, x: number, y: number, phi: number, warn: number, spent: boolean): void {
  const ux = -Math.cos(phi), uy = -Math.sin(phi);
  if (!spent) {
    g.fillStyle(SAND_PALE, 1); g.fillEllipse(x + ux * 6, y + uy * 6, 44, 20);
    g.fillStyle(SAND_DARK, 0.8); g.fillEllipse(x + ux * 12, y + uy * 12 + 4, 40, 8);
    g.lineStyle(1.5, SAND_DEEP, 0.6 + warn * 0.4);
    g.lineBetween(x - 14, y - 2, x - 4, y + 3); g.lineBetween(x - 4, y + 3, x + 8, y - 1); g.lineBetween(x + 8, y - 1, x + 16, y + 4);
  }
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x, y + 2, x, y - 36);
  g.lineStyle(2, TIMBER, 1); g.lineBetween(x + 1, y + 2, x + 1, y - 36);
  g.fillStyle(STRIPE_SAFFRON, 1); g.fillTriangle(x + 1, y - 36, x + 1, y - 26, x + 1 + ux * 16, y - 31);
  if (warn > 0) glow(g, x, y, 34, STRIPE_SAFFRON, 0.06 * warn, 3);
}

export const FALLEN_BARCHAN: GimmickDef = {
  id: ID,
  rules: 'A dune walks downwind; when its lip slips, all on the face are buried. The crest shelters. Strike the cornice to slip it now. At half, the wind turns.',
  make,
};
