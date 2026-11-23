import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { weight } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, CARD_RED, GOLD, GOLD_DARK, GOLD_LIT, MARBLE, MARBLE_DARK, MARBLE_LIT } from '../palette';
import { alive, clamp, dist, hurt, stepDt } from '../util';

/**
 * Scales of Tribute — Assayer Balance.
 *
 * The Treasury's great balance hangs over the floor, one brass pan either side. Step onto a pan
 * and it sinks under you; the empty pan rises, and when it has risen its stacked weights are
 * hurled down at whoever is lower. If both of you stand on the pans, the beam weighs your
 * *wounds*: the more-hurt fighter's pan sinks, and the healthier one's weights are thrown at them.
 *
 * Standing on a pan has its price, and its reward — the weight of the tribute is behind your
 * blows (they land harder). So: get ahead on health, then dare Balance onto the other pan; or
 * step off the instant yours starts sinking alone. The weights restack in an empty pan.
 */

const PAN_R = 72;
const HURL_DELAY = 950;
const LOB_MS = 720;
const WEIGHT_DMG = 9;
const SPLASH_R = 44;
const MAX_WEIGHTS = 4;
const RESTACK_MS = 1500;
const WEIGHTY = 1.3;

interface Pan { x: number; y: number; weights: number; restackAt: number; lift: number }
interface Lob { fx: number; fy: number; tx: number; ty: number; at: number; landAt: number; dealt: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const panY = (top + H) / 2 + 60;
  const pans: Pan[] = [
    { x: W * 0.24, y: panY, weights: 3, restackAt: 0, lift: 0 },
    { x: W * 0.76, y: panY, weights: 3, restackAt: 0, lift: 0 },
  ];
  const BEAM_Y = top + 34;
  const lobs: Lob[] = [];
  /** -1 left pan down, +1 right pan down, 0 level. */
  let tip = 0;
  let tipSince = 0;
  let tilt = 0;
  let hurled = false;
  let started = false;

  const on = (p: Pan, f: Fighter) => alive(f) && dist(f.x, f.y, p.x, p.y) < PAN_R;
  const onAnyPan = (f: Fighter) => pans.some((p) => on(p, f));

  function weigh(): { low: number; victim: Fighter | null } {
    const L = [player, npc].filter((f) => on(pans[0], f));
    const R = [player, npc].filter((f) => on(pans[1], f));
    if (L.length && !R.length) return { low: -1, victim: L.length === 1 ? L[0] : (hurt(L[0]) >= hurt(L[1]) ? L[0] : L[1]) };
    if (R.length && !L.length) return { low: 1, victim: R.length === 1 ? R[0] : (hurt(R[0]) >= hurt(R[1]) ? R[0] : R[1]) };
    if (L.length && R.length) {
      // Both pans loaded: the heavier-hurt sinks.
      const l = L[0], r = R[0];
      if (Math.abs(hurt(l) - hurt(r)) < 2) return { low: 0, victim: null };
      return hurt(l) > hurt(r) ? { low: -1, victim: l } : { low: 1, victim: r };
    }
    return { low: 0, victim: null };
  }

  function hurl(from: Pan, victim: Fighter, time: number): void {
    const n = from.weights;
    from.weights = 0;
    from.restackAt = time + RESTACK_MS * 1.6;
    ctx.sfx('gravity-slam');
    ctx.banner('THE SCALES PASS JUDGEMENT', '#ffe2a8');
    for (let i = 0; i < n; i++) {
      // Spread round where the victim stands, the first right on them.
      const a = (i / Math.max(1, n)) * Math.PI * 2 + ctx.rng();
      const d = i === 0 ? 0 : 46 + ctx.rng() * 20;
      lobs.push({
        fx: from.x + (i - n / 2) * 12, fy: from.y - 40 - from.lift,
        tx: clamp(victim.x + Math.cos(a) * d, 40, W - 40), ty: clamp(victim.y + Math.sin(a) * d * 0.8, top + 30, H - 30),
        at: time + i * 110, landAt: time + i * 110 + LOB_MS, dealt: false,
      });
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        ctx.banner('THE SCALES WEIGH THE WOUNDED', '#ffe2a8');
      }
      const { low, victim } = weigh();
      if (low !== tip) { tip = low; tipSince = time; hurled = false; if (low !== 0) ctx.sfx('clang'); }
      tilt += ((tip * 0.22) - tilt) * Math.min(1, dt * 4);
      pans[0].lift += ((tip === 1 ? 34 : tip === -1 ? -8 : 0) - pans[0].lift) * Math.min(1, dt * 4);
      pans[1].lift += ((tip === -1 ? 34 : tip === 1 ? -8 : 0) - pans[1].lift) * Math.min(1, dt * 4);
      if (tip !== 0 && victim && !hurled && time - tipSince >= ctx.tk.warn(HURL_DELAY)) {
        const high = tip < 0 ? pans[1] : pans[0];
        hurled = true;
        if (high.weights > 0) hurl(high, victim, time);
      }
      // Empty pans restack.
      for (const p of pans) {
        if (p.weights < MAX_WEIGHTS && time >= p.restackAt && !on(p, player) && !on(p, npc)) {
          p.weights++;
          p.restackAt = time + RESTACK_MS;
        }
      }
      for (let i = lobs.length - 1; i >= 0; i--) {
        const l = lobs[i];
        if (!l.dealt && time >= l.landAt) {
          l.dealt = true;
          ctx.sfx('hammer-forge');
          for (const f of [player, npc]) {
            if (!alive(f) || dist(f.x, f.y, l.tx, l.ty) > SPLASH_R + 14) continue;
            ctx.hit(f, ctx.hard ? WEIGHT_DMG + 2 : WEIGHT_DMG, l.tx, l.ty);
          }
          ctx.flash(l.tx, l.ty, GOLD_LIT);
        }
        if (time > l.landAt + 500) lobs.splice(i, 1);
      }
    },

    // The weight of the tribute behind your blows.
    npcTakenMult: () => (onAnyPan(player) ? WEIGHTY : 1),
    playerTakenMult: () => (onAnyPan(npc) ? WEIGHTY : 1),

    npcSeek() {
      const pOn = pans.findIndex((p) => on(p, player));
      const nOn = pans.findIndex((p) => on(p, npc));
      const healthier = hurt(npc) + 2 < hurt(player);
      // You stand alone on a pan and he is the healthier: take the other pan and judge you.
      if (pOn >= 0 && healthier) { const p = pans[1 - pOn]; return { x: p.x, y: p.y }; }
      // He is on a pan alone, or losing the weighing: get off it.
      if (nOn >= 0 && (pOn < 0 || !healthier)) { const p = pans[nOn]; return { x: p.x + (p.x < W / 2 ? 140 : -140), y: p.y - 120 }; }
      // Dodge falling weights.
      for (const l of lobs) if (!l.dealt && dist(l.tx, l.ty, npc.x, npc.y) < SPLASH_R + 30) return { x: clamp(npc.x + (npc.x - l.tx) * 2, 60, W - 60), y: clamp(npc.y + (npc.y - l.ty) * 2, top + 50, H - 50) };
      // Otherwise keep to the middle, between the pans, off both.
      return { x: clamp(player.x + (player.x < W / 2 ? 180 : -180), W * 0.36, W * 0.64), y: clamp(player.y, top + 60, H - 60) };
    },

    drawGround(g, time) {
      // Marble floor discs under each pan, with a ring of brass weights' sockets.
      for (const p of pans) {
        g.fillStyle(MARBLE_DARK, 1); g.fillEllipse(p.x, p.y + 6, PAN_R * 2 + 18, PAN_R * 1.2 + 14);
        g.fillStyle(MARBLE, 1); g.fillEllipse(p.x, p.y + 2, PAN_R * 2 + 10, PAN_R * 1.2 + 8);
        g.lineStyle(2, GOLD_DARK, 0.6); g.strokeEllipse(p.x, p.y + 2, PAN_R * 2 - 6, PAN_R * 1.2 - 6);
        // The pan's shadow: smaller and fainter the higher it rides.
        const k = clamp((p.lift + 8) / 42, 0, 1);
        g.fillStyle(0x000000, 0.35 - k * 0.2); g.fillEllipse(p.x, p.y + 10, PAN_R * 2 * (1 - k * 0.25), PAN_R * 0.9 * (1 - k * 0.25));
      }
      // The column's foot between them.
      g.fillStyle(MARBLE_DARK, 1); g.fillRect(W / 2 - 34, top + 8, 68, 34);
      g.fillStyle(MARBLE_LIT, 1); g.fillRect(W / 2 - 36, top + 6, 72, 6);
      // Landing marks for falling weights.
      for (const l of lobs) {
        if (l.dealt || time < l.at) continue;
        const k = clamp((time - l.at) / Math.max(1, l.landAt - l.at), 0, 1);
        g.lineStyle(2, CARD_RED, 0.4 + k * 0.5); g.strokeCircle(l.tx, l.ty, SPLASH_R);
        g.fillStyle(CARD_RED, 0.1 + k * 0.25); g.fillCircle(l.tx, l.ty, SPLASH_R * k);
      }
    },

    drawAir(g, time) {
      // The beam, high over the floor; chains down to each pan.
      const cx = W / 2, L = pans[1].x - cx;
      const ca = Math.cos(tilt), sa = Math.sin(tilt);
      const lx = cx - ca * L, ly = BEAM_Y - sa * L * 0.18, rx = cx + ca * L, ry = BEAM_Y + sa * L * 0.18;
      g.lineStyle(10, BRASS_DARK, 1); g.lineBetween(lx, ly, rx, ry);
      g.lineStyle(5, BRASS, 1); g.lineBetween(lx, ly - 1, rx, ry - 1);
      g.fillStyle(GOLD, 1); g.fillCircle(cx, BEAM_Y, 14);
      g.lineStyle(2, GOLD_DARK, 1); g.strokeCircle(cx, BEAM_Y, 9);
      g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(cx, BEAM_Y, cx - sa * 46, BEAM_Y + ca * 46);
      const ends = [{ x: lx, y: ly }, { x: rx, y: ry }];
      pans.forEach((p, i) => {
        const e = ends[i];
        const py = p.y - 26 - p.lift;
        for (const k of [-1, 0, 1]) { g.lineStyle(1.5, BRASS_DARK, 0.55); g.lineBetween(e.x, e.y, p.x + k * PAN_R * 0.7, py); }
        // The pan itself: a broad brass dish.
        g.fillStyle(BRASS_DARK, 1); g.fillEllipse(p.x, py + 6, PAN_R * 2, PAN_R * 0.7);
        g.fillStyle(BRASS, 0.9); g.fillEllipse(p.x, py, PAN_R * 2 - 6, PAN_R * 0.6);
        g.fillStyle(BRASS_LIT, 0.4); g.fillEllipse(p.x - 20, py - 6, PAN_R * 0.8, PAN_R * 0.14);
        // Weights stacked in it, glowing when about to be thrown.
        const high = (tip < 0 && i === 1) || (tip > 0 && i === 0);
        const arming = high && !hurled ? clamp((time - tipSince) / HURL_DELAY, 0, 1) : 0;
        for (let k = 0; k < p.weights; k++) {
          const wx = p.x - 30 + (k % 4) * 20, wy = py + 4 - Math.floor(k / 4) * 12;
          if (arming > 0) glow(g, wx, wy - 8, 16, GOLD_LIT, 0.05 + arming * 0.08, 2);
          weight(g, wx, wy + (arming > 0 ? -Math.sin(time / 50 + k) * 2 * arming : 0), 0.9);
        }
      });
      // Weights in flight: an arc from the pan to the mark.
      for (const l of lobs) {
        if (l.dealt || time < l.at) continue;
        const k = clamp((time - l.at) / Math.max(1, l.landAt - l.at), 0, 1);
        const x = l.fx + (l.tx - l.fx) * k, y = l.fy + (l.ty - l.fy) * k - Math.sin(k * Math.PI) * 140;
        weight(g, x, y, 1.1);
      }
      // Who stands weighty: a gold chevron under the feet of anyone on a pan.
      for (const f of [player, npc]) {
        if (!onAnyPan(f)) continue;
        g.fillStyle(GOLD_LIT, 0.7); g.fillTriangle(f.x - 10, f.y - 58, f.x + 10, f.y - 58, f.x, f.y - 48);
      }
    },
  };
}

export const SCALES: GimmickDef = {
  id: 'treasury-scales',
  rules: 'Stand on a pan and it sinks — the empty pan\'s weights are hurled at you. Both on, the more-hurt sinks. Blows struck from a pan land harder.',
  make,
};
